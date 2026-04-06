require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const { Server } = require("socket.io");
const SurveillanceLog = require("./models/SurveillanceLog");

const app = express();
const server = http.createServer(app);

// --------------- Configuration ---------------
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sage";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// --------------- Middleware ---------------
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, "uploads")),
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

// --------------- Detection Counts ---------------
// If the edge device sends counts in the POST body, use those.
// Otherwise fall back to a placeholder (random) for dev/testing.
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

  // Fallback: random placeholder for development without an edge device
  return {
    person: Math.floor(Math.random() * 10),
    car: Math.floor(Math.random() * 6),
    bicycle: Math.floor(Math.random() * 4),
    other: Math.floor(Math.random() * 3),
  };
}

// --------------- Routes ---------------

// POST /api/upload — Receive an image (+ optional counts) from the edge device
app.post("/api/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No valid image file provided." });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    // Use edge-provided counts or fall back to placeholder
    const counts = parseCounts(req.body);

    // Persist to MongoDB
    const log = await SurveillanceLog.create({
      imageUrl,
      timestamp: new Date(),
      ...counts,
    });

    // Broadcast to all connected dashboards
    io.emit("new-detection", log);

    return res.status(201).json(log);
  } catch (err) {
    console.error("[SAGE] Upload error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/logs — Fetch detection history
app.get("/api/logs", async (_req, res) => {
  try {
    const logs = await SurveillanceLog.find().sort({ timestamp: -1 }).limit(50);
    return res.json(logs);
  } catch (err) {
    console.error("[SAGE] Fetch logs error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// DELETE /api/logs/:id — Delete a detection log and its image
app.delete("/api/logs/:id", async (req, res) => {
  try {
    const log = await SurveillanceLog.findByIdAndDelete(req.params.id);
    if (!log) {
      return res.status(404).json({ error: "Log not found." });
    }

    // Delete the image file from disk
    if (log.imageUrl) {
      const filePath = path.join(__dirname, log.imageUrl);
      const fs = require("fs");
      fs.unlink(filePath, (err) => {
        if (err) console.warn("[SAGE] Could not delete file:", filePath);
      });
    }

    // Notify all dashboards
    io.emit("delete-detection", log._id);

    return res.json({ success: true, id: log._id });
  } catch (err) {
    console.error("[SAGE] Delete error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// --------------- Start ---------------
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[SAGE] Connected to MongoDB");
    server.listen(PORT, () => {
      console.log(`[SAGE] Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[SAGE] MongoDB connection error:", err);
    process.exit(1);
  });
