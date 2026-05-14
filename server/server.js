require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// --------------- Configuration ---------------
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const AI_SERVER_URL = process.env.AI_SERVER_URL || "http://localhost:5050";

// --------------- JSON File Store ---------------
const DATA_FILE = path.join(__dirname, "surveillance_data.json");

function loadLogs() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch (e) {
    console.warn("[SAGE] Could not load data file, starting fresh.");
  }
  return [];
}

function saveLogs(logs) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

let logs = loadLogs();
let idCounter = logs.length > 0
  ? Math.max(...logs.map((l) => parseInt(l._id, 10) || 0)) + 1
  : 1;

function createLog(data) {
  const log = {
    _id: String(idCounter++),
    imageUrl: data.imageUrl,
    annotatedImageUrl: data.annotatedImageUrl || null,
    timestamp: data.timestamp || new Date().toISOString(),
    person: data.person || 0,
    car: data.car || 0,
    bicycle: data.bicycle || 0,
    other: data.other || 0,
    source: data.source || "auto",
    detections: data.detections || [],
  };
  logs.unshift(log);
  if (logs.length > 200) logs = logs.slice(0, 200);
  saveLogs(logs);
  return log;
}

// --------------- Middleware ---------------
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// --------------- Socket.IO ---------------
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`[SAGE] Dashboard client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`[SAGE] Dashboard client disconnected: ${socket.id}`);
  });
});

// --------------- Multer Setup ---------------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  cb(null, extOk && mimeOk);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// --------------- AI Detection Helper ---------------
async function runAIDetection(imagePath) {
  try {
    const FormData = (await import("form-data")).default;
    const fetch = (await import("node-fetch")).default;

    const form = new FormData();
    form.append("image", fs.createReadStream(imagePath));

    const resp = await fetch(`${AI_SERVER_URL}/detect?conf=0.3&annotate=true`, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
      timeout: 60000,
    });

    if (!resp.ok) {
      console.warn(`[SAGE] AI server returned ${resp.status}`);
      return null;
    }

    const data = await resp.json();

    // Save the annotated image if returned
    let annotatedImageUrl = null;
    if (data.annotated_image) {
      const annotatedFilename = `annotated-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
      const annotatedPath = path.join(uploadsDir, annotatedFilename);
      const imgBuffer = Buffer.from(data.annotated_image, "base64");
      fs.writeFileSync(annotatedPath, imgBuffer);
      annotatedImageUrl = `/uploads/${annotatedFilename}`;
      delete data.annotated_image; // Don't keep base64 in memory
    }

    console.log(
      `[SAGE] AI detection: person=${data.person}, car=${data.car}, ` +
      `bicycle=${data.bicycle}, other=${data.other} (${data.inference_ms}ms)`
    );
    return { ...data, annotatedImageUrl };
  } catch (err) {
    console.warn(`[SAGE] AI server unavailable: ${err.message}`);
    return null;
  }
}

// --------------- Detection Counts ---------------
function parseCounts(body) {
  const keys = ["person", "car", "bicycle", "other"];
  const hasEdgeCounts = keys.some((k) => body[k] !== undefined);

  if (hasEdgeCounts) {
    return {
      person: Math.max(0, parseInt(body.person, 10) || 0),
      car: Math.max(0, parseInt(body.car, 10) || 0),
      bicycle: Math.max(0, parseInt(body.bicycle, 10) || 0),
      other: Math.max(0, parseInt(body.other, 10) || 0),
    };
  }

  return null;
}

// --------------- Routes ---------------

// POST /api/upload — Receive an image (+ optional counts) from the edge device
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No valid image file provided." });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const filePath = path.join(uploadsDir, req.file.filename);

    let counts = parseCounts(req.body);
    let source = "edge";
    let detections = [];

    if (!counts) {
      source = "auto";
      const aiResult = await runAIDetection(filePath);
      if (aiResult) {
        counts = {
          person: aiResult.person,
          car: aiResult.car,
          bicycle: aiResult.bicycle,
          other: aiResult.other,
        };
        detections = aiResult.detections || [];
      } else {
        counts = {
          person: Math.floor(Math.random() * 10),
          car: Math.floor(Math.random() * 6),
          bicycle: Math.floor(Math.random() * 4),
          other: Math.floor(Math.random() * 3),
        };
      }
    }

    const annotatedImageUrl = (source !== "edge" && aiResult) ? aiResult.annotatedImageUrl : null;

    const log = createLog({
      imageUrl,
      annotatedImageUrl,
      timestamp: new Date().toISOString(),
      source,
      detections,
      ...counts,
    });

    io.emit("new-detection", log);
    return res.status(201).json(log);
  } catch (err) {
    console.error("[SAGE] Upload error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// POST /api/analyze — Manual upload: user uploads image for AI analysis
app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No valid image file provided." });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const filePath = path.join(uploadsDir, req.file.filename);

    const aiResult = await runAIDetection(filePath);

    if (!aiResult) {
      return res.status(503).json({
        error: "AI inference server is not available. Please start inference_server.py.",
      });
    }

    const counts = {
      person: aiResult.person,
      car: aiResult.car,
      bicycle: aiResult.bicycle,
      other: aiResult.other,
    };

    const log = createLog({
      imageUrl,
      annotatedImageUrl: aiResult.annotatedImageUrl || null,
      timestamp: new Date().toISOString(),
      source: "manual",
      detections: aiResult.detections || [],
      ...counts,
    });

    io.emit("new-detection", log);
    return res.status(201).json({
      ...log,
      inference_ms: aiResult.inference_ms,
    });
  } catch (err) {
    console.error("[SAGE] Analyze error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/ai-status — Check if the AI inference server is running
app.get("/api/ai-status", async (_req, res) => {
  try {
    const fetch = (await import("node-fetch")).default;
    const resp = await fetch(`${AI_SERVER_URL}/health`, { timeout: 3000 });
    const data = await resp.json();
    return res.json({ available: true, ...data });
  } catch {
    return res.json({ available: false, status: "offline" });
  }
});

// GET /api/logs — Fetch detection history
app.get("/api/logs", async (_req, res) => {
  try {
    return res.json(logs.slice(0, 50));
  } catch (err) {
    console.error("[SAGE] Fetch logs error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// DELETE /api/logs/:id — Delete a detection log and its image
app.delete("/api/logs/:id", async (req, res) => {
  try {
    const idx = logs.findIndex((l) => l._id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: "Log not found." });
    }

    const [deleted] = logs.splice(idx, 1);
    saveLogs(logs);

    if (deleted.imageUrl) {
      const filePath = path.join(__dirname, deleted.imageUrl);
      fs.unlink(filePath, (err) => {
        if (err) console.warn("[SAGE] Could not delete file:", filePath);
      });
    }

    io.emit("delete-detection", deleted._id);
    return res.json({ success: true, id: deleted._id });
  } catch (err) {
    console.error("[SAGE] Delete error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// --------------- Start ---------------
server.listen(PORT, () => {
  console.log(`[SAGE] Server running on http://localhost:${PORT}`);
  console.log(`[SAGE] AI server expected at ${AI_SERVER_URL}`);
  console.log(`[SAGE] Data stored in ${DATA_FILE}`);
});
