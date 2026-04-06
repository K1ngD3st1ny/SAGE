import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";

/* global JSMpeg */

const SOCKET_URL = "http://localhost:5000";

/* ────────────── MOCK DATA ────────────── */
const MOCK_LOGS = [
  {
    _id: "m1",
    imageUrl: null,
    timestamp: new Date(Date.now() - 45000).toISOString(),
    person: 3,
    car: 1,
    bicycle: 0,
    other: 2,
  },
  {
    _id: "m2",
    imageUrl: null,
    timestamp: new Date(Date.now() - 98000).toISOString(),
    person: 1,
    car: 4,
    bicycle: 1,
    other: 0,
  },
  {
    _id: "m3",
    imageUrl: null,
    timestamp: new Date(Date.now() - 175000).toISOString(),
    person: 0,
    car: 2,
    bicycle: 3,
    other: 1,
  },
  {
    _id: "m4",
    imageUrl: null,
    timestamp: new Date(Date.now() - 260000).toISOString(),
    person: 5,
    car: 0,
    bicycle: 0,
    other: 3,
  },
  {
    _id: "m5",
    imageUrl: null,
    timestamp: new Date(Date.now() - 340000).toISOString(),
    person: 2,
    car: 3,
    bicycle: 2,
    other: 0,
  },
  {
    _id: "m6",
    imageUrl: null,
    timestamp: new Date(Date.now() - 420000).toISOString(),
    person: 1,
    car: 1,
    bicycle: 0,
    other: 4,
  },
  {
    _id: "m7",
    imageUrl: null,
    timestamp: new Date(Date.now() - 510000).toISOString(),
    person: 4,
    car: 2,
    bicycle: 1,
    other: 1,
  },
  {
    _id: "m8",
    imageUrl: null,
    timestamp: new Date(Date.now() - 600000).toISOString(),
    person: 0,
    car: 5,
    bicycle: 0,
    other: 2,
  },
];

/* ────────────── ICONS ────────────── */
const Icon = {
  person: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  ),
  car: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25m-2.25 0v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0A1.106 1.106 0 0 0 0 7.615v7.635m12-6.677v6.677m0 4.5v-4.5m0 0H0" />
    </svg>
  ),
  bicycle: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6.5" cy="17.5" r="3.5" />
      <circle cx="17.5" cy="17.5" r="3.5" />
      <path d="M6.5 17.5 9 9h3l3 8.5M15 9l2.5 8.5M9 9l1.5-3h3" />
    </svg>
  ),
  other: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  ),
  live: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  ),
  chart: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  ),
  clock: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  log: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  shield: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  ),
  search: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  ),
  arrow: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 12h15m0 0-6.75-6.75M19.5 12l-6.75 6.75" />
    </svg>
  ),
  trash: (p) => (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  ),
};

/* ────────────── CONSTANTS ────────────── */
const ASSETS = [
  { key: "person", label: "Persons", icon: Icon.person, color: "#007aff" },
  { key: "car", label: "Cars", icon: Icon.car, color: "#ff9500" },
  { key: "bicycle", label: "Bicycles", icon: Icon.bicycle, color: "#34c759" },
  { key: "other", label: "Other", icon: Icon.other, color: "#af52de" },
];

const NAV_ITEMS = [
  { id: "live", label: "Live Feed", icon: Icon.live },
  { id: "metrics", label: "Metrics", icon: Icon.chart },
  { id: "logs", label: "Detection Log", icon: Icon.log },
];

/* ────────────── HELPERS ────────────── */
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ────────────── HOOKS ────────────── */
function useUptime() {
  const start = useRef(Date.now());
  const [display, setDisplay] = useState("00:00:00");
  useEffect(() => {
    const tick = () => {
      const s = Math.floor((Date.now() - start.current) / 1000);
      const h = String(Math.floor(s / 3600)).padStart(2, "0");
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
      const sec = String(s % 60).padStart(2, "0");
      setDisplay(`${h}:${m}:${sec}`);
    };
    const id = setInterval(tick, 1000);
    tick();
    return () => clearInterval(id);
  }, []);
  return display;
}

/* ────────────── SMALL COMPONENTS ────────────── */

function TrafficLights() {
  return (
    <div className="flex items-center gap-[7px] group">
      {[
        ["bg-tl-red", "×"],
        ["bg-tl-yellow", "−"],
        ["bg-tl-green", "+"],
      ].map(([bg, sym], i) => (
        <span
          key={i}
          className={`w-3 h-3 rounded-full ${bg} relative flex items-center justify-center shadow-sm ring-1 ring-black/[0.08]`}
        >
          <span className="text-[9px] font-bold text-black/0 group-hover:text-black/50 transition-colors leading-none">
            {sym}
          </span>
        </span>
      ))}
    </div>
  );
}

/* SVG donut ring */
function DonutRing({ value, max, size = 44, stroke = 3.5, color = "#007aff" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e5e5ea"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

/* Mini bar sparkline */
function MiniSparkline({ data, color = "#007aff", height = 28 }) {
  const max = Math.max(...data, 1);
  const w = 4;
  const gap = 2;
  const totalW = data.length * (w + gap) - gap;
  return (
    <svg width={totalW} height={height} className="opacity-60">
      {data.map((v, i) => {
        const h = Math.max((v / max) * height, 1.5);
        return (
          <rect
            key={i}
            x={i * (w + gap)}
            y={height - h}
            width={w}
            height={h}
            rx={1.5}
            fill={color}
            opacity={0.4 + (i / data.length) * 0.6}
          />
        );
      })}
    </svg>
  );
}

function StatCard({ asset, value, sparkData }) {
  const IconComp = asset.icon;
  return (
    <div className="bg-white rounded-xl border border-mac-border/50 shadow-card hover:shadow-card-hover transition-all duration-200 p-4 flex flex-col gap-2 group relative overflow-hidden">
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: `linear-gradient(90deg, transparent, ${asset.color}, transparent)`,
        }}
      />
      <div className="flex items-center justify-between">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: asset.color + "12" }}
        >
          <IconComp
            className="w-[18px] h-[18px]"
            style={{ color: asset.color }}
          />
        </div>
        <MiniSparkline data={sparkData} color={asset.color} />
      </div>
      <div className="mt-1">
        <p className="text-[26px] font-semibold text-mac-text tabular-nums font-mono leading-none">
          {value}
        </p>
        <p className="text-[11px] font-medium text-mac-tertiary mt-1 tracking-wide">
          {asset.label}
        </p>
      </div>
    </div>
  );
}

function DetectionBar({ asset, count, maxCount }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const IconComp = asset.icon;
  return (
    <div className="flex items-center gap-3 group">
      <div
        className="w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: asset.color + "12" }}
      >
        <IconComp className="w-3.5 h-3.5" style={{ color: asset.color }} />
      </div>
      <span className="text-[12px] font-medium text-mac-secondary w-16 truncate">
        {asset.label}
      </span>
      <div className="flex-1 h-[7px] bg-mac-divider/70 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${asset.color}cc, ${asset.color})`,
          }}
        />
      </div>
      <span className="text-[13px] font-semibold text-mac-text tabular-nums w-6 text-right font-mono">
        {count}
      </span>
    </div>
  );
}

/* ────────────── MAIN DASHBOARD ────────────── */
export default function Dashboard() {
  const [logs, setLogs] = useState(MOCK_LOGS);
  const [connected, setConnected] = useState(false);
  const [activeNav, setActiveNav] = useState("live");
  const [newIds, setNewIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const socketRef = useRef(null);
  const videoCanvasRef = useRef(null);
  const playerRef = useRef(null);
  const uptime = useUptime();
  const serverBase = SOCKET_URL;

  const sessionTotals = logs.reduce(
    (acc, l) => {
      acc.person += l.person || 0;
      acc.car += l.car || 0;
      acc.bicycle += l.bicycle || 0;
      acc.other += l.other || 0;
      return acc;
    },
    { person: 0, car: 0, bicycle: 0, other: 0 },
  );
  const totalDetections =
    sessionTotals.person +
    sessionTotals.car +
    sessionTotals.bicycle +
    sessionTotals.other;

  const latest = logs[0] || null;
  const maxCount = latest
    ? Math.max(latest.person, latest.car, latest.bicycle, latest.other, 1)
    : 1;

  /* Sparkline data per asset (last N logs reversed) */
  const sparkData = useMemo(() => {
    const reversed = [...logs].reverse().slice(-8);
    return Object.fromEntries(
      ASSETS.map((a) => [a.key, reversed.map((l) => l[a.key] || 0)]),
    );
  }, [logs]);

  /* Filtered logs for search */
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      (l) =>
        new Date(l.timestamp).toLocaleString().toLowerCase().includes(q) ||
        ASSETS.some(
          (a) => a.label.toLowerCase().includes(q) && (l[a.key] || 0) > 0,
        ),
    );
  }, [logs, searchQuery]);

  /* Socket + initial fetch */
  useEffect(() => {
    fetch(`${SOCKET_URL}/api/logs`)
      .then((r) => r.json())
      .then((data) => {
        if (data.length) setLogs(data);
      })
      .catch(() => {});

    const s = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = s;
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    s.on("new-detection", (log) => {
      setLogs((prev) => [log, ...prev].slice(0, 50));
      setNewIds((prev) => new Set(prev).add(log._id));
      setTimeout(
        () =>
          setNewIds((prev) => {
            const n = new Set(prev);
            n.delete(log._id);
            return n;
          }),
        2500,
      );
    });
    s.on("delete-detection", (deletedId) => {
      setLogs((prev) => prev.filter((l) => l._id !== deletedId));
    });
    return () => s.disconnect();
  }, []);

  /* Close lightbox on Escape */
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") setLightboxImage(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  /* JSMpeg video player */
  useEffect(() => {
    if (!videoCanvasRef.current) return;
    // Defer to let React finish rendering first
    const timer = setTimeout(() => {
      if (typeof window.JSMpeg === "undefined") {
        console.warn("[SAGE] JSMpeg not loaded");
        return;
      }
      try {
        const wsHost = window.location.hostname || "localhost";
        const wsUrl = `ws://${wsHost}:8082/`;
        const player = new window.JSMpeg.Player(wsUrl, {
          canvas: videoCanvasRef.current,
          autoplay: true,
          audio: false,
          loop: true,
          disableWebAssembly: false,
          disableGl: true, // Use Canvas2D instead of WebGL to avoid error spam
          onSourceEstablished: () => setStreamConnected(true),
          onSourceCompleted: () => setStreamConnected(false),
        });
        playerRef.current = player;
      } catch (err) {
        console.error("[SAGE] JSMpeg init error:", err);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) { /* ignore */ }
        playerRef.current = null;
      }
    };
  }, []);

  /* Capture current frame from video canvas */
  const captureFrame = useCallback(async () => {
    const canvas = videoCanvasRef.current;
    if (!canvas || isCapturing) return;
    setIsCapturing(true);
    try {
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("Canvas capture failed");
      const formData = new FormData();
      formData.append("image", blob, `capture-${Date.now()}.jpg`);
      const resp = await fetch(`${SOCKET_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
      console.log("[SAGE] Frame captured and uploaded");
    } catch (err) {
      console.error("[SAGE] Capture error:", err);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing]);

  /* Delete a log entry */
  const deleteLog = useCallback(async (logId) => {
    try {
      const resp = await fetch(`${SOCKET_URL}/api/logs/${logId}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error(`Delete failed: ${resp.status}`);
      // Remove from local state immediately
      setLogs((prev) => prev.filter((l) => l._id !== logId));
      // Clear selected image if it belongs to the deleted log
      setSelectedImage((prev) => {
        const deleted = logs.find((l) => l._id === logId);
        return deleted && prev === deleted.imageUrl ? null : prev;
      });
    } catch (err) {
      console.error("[SAGE] Delete error:", err);
    }
  }, [logs]);

  const scrollTo = useCallback((id) => {
    setActiveNav(id);
    document
      .getElementById(`section-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="min-h-screen bg-mac-bg p-3 md:p-6 lg:p-8 flex items-start justify-center">
      {/* ━━━ WINDOW CONTAINER ━━━ */}
      <div className="w-full max-w-[1440px] bg-mac-wall rounded-2xl shadow-window overflow-hidden border border-black/[0.06] animate-fade-in">
        {/* ━━━ TITLE BAR ━━━ */}
        <div className="h-[52px] bg-gradient-to-b from-white/80 to-[#e8e8e8]/90 border-b border-mac-border/80 flex items-center px-4 gap-4 select-none backdrop-blur-sm">
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2.5 px-4 py-1 rounded-md">
              <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Icon.shield className="w-3 h-3 text-white" />
              </div>
              <span className="text-[13px] font-semibold text-mac-text/80 tracking-[-0.01em]">
                SAGE
              </span>
              <span className="text-[13px] text-mac-tertiary hidden sm:inline">
                Surveillance &amp; Alert for Geospatial Emergencies
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-mac-tertiary">
              <Icon.clock className="w-3 h-3" />
              <span>{uptime}</span>
            </div>
            <div className="w-px h-3.5 bg-mac-border" />
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              <span
                className={`w-[6px] h-[6px] rounded-full ${connected ? "bg-green-500 animate-pulse-dot" : "bg-red-400"}`}
              />
              <span className={connected ? "text-green-600" : "text-red-500"}>
                {connected ? "Live" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* ━━━ BODY ━━━ */}
        <div className="flex" style={{ minHeight: "calc(100vh - 130px)" }}>
          {/* ━━ SIDEBAR ━━ */}
          <aside className="w-56 glass-subtle border-r border-mac-border/60 flex flex-col py-2 shrink-0 animate-slide-in-left">
            {/* Navigation */}
            <div className="px-2.5 mb-1">
              <p className="text-[10px] font-bold text-mac-tertiary/80 uppercase tracking-[0.08em] px-2.5 py-2">
                Favorites
              </p>
              {NAV_ITEMS.map((item) => {
                const isActive = activeNav === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-medium transition-all duration-150 mb-0.5 ${
                      isActive
                        ? "bg-blue-500 text-white shadow-sm"
                        : "text-mac-text/80 hover:bg-black/[0.04] active:bg-black/[0.06]"
                    }`}
                  >
                    <item.icon
                      className={`w-[16px] h-[16px] ${isActive ? "text-white/90" : "text-mac-secondary"}`}
                    />
                    {item.label}
                    {item.id === "logs" && logs.length > 0 && (
                      <span
                        className={`ml-auto text-[10px] font-semibold tabular-nums rounded-full px-1.5 py-px ${isActive ? "bg-white/20 text-white" : "bg-mac-divider text-mac-secondary"}`}
                      >
                        {logs.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-mac-border/40 mx-4 my-1.5" />

            {/* Asset summary with donut */}
            <div className="px-2.5">
              <p className="text-[10px] font-bold text-mac-tertiary/80 uppercase tracking-[0.08em] px-2.5 py-2">
                Assets Detected
              </p>
              <div className="flex flex-col gap-0.5">
                {ASSETS.map((a) => (
                  <div
                    key={a.key}
                    className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-lg text-[13px] text-mac-text/80 hover:bg-black/[0.03] transition-colors"
                  >
                    <a.icon
                      className="w-[15px] h-[15px]"
                      style={{ color: a.color }}
                    />
                    <span className="flex-1 text-[12px]">{a.label}</span>
                    <span className="text-[12px] font-mono font-bold text-mac-text tabular-nums bg-mac-divider/60 px-1.5 py-px rounded-md">
                      {sessionTotals[a.key]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-mac-border/40 mx-4 my-1.5" />

            {/* Donut chart for total */}
            <div className="px-5 py-3 flex flex-col items-center gap-2">
              <div className="relative">
                <DonutRing
                  value={totalDetections}
                  max={Math.max(totalDetections, 20)}
                  size={64}
                  stroke={5}
                  color="#007aff"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[14px] font-bold text-mac-text font-mono">
                    {totalDetections}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-medium text-mac-tertiary">
                Total Detections
              </span>
            </div>

            <div className="border-t border-mac-border/40 mx-4 my-1.5" />

            {/* Session info */}
            <div className="px-2.5">
              <p className="text-[10px] font-bold text-mac-tertiary/80 uppercase tracking-[0.08em] px-2.5 py-2">
                Session
              </p>
              <div className="px-2.5 flex flex-col gap-2 text-[12px] text-mac-text/70">
                <div className="flex items-center gap-2.5">
                  <Icon.clock className="w-3.5 h-3.5 text-mac-tertiary" />
                  <span className="font-mono text-[11px]">{uptime}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Icon.log className="w-3.5 h-3.5 text-mac-tertiary" />
                  <span>{logs.length} records</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-[6px] h-[6px] rounded-full ${connected ? "bg-green-500 animate-pulse-dot" : "bg-red-400"}`}
                  />
                  <span
                    className={connected ? "text-green-600" : "text-red-400"}
                  >
                    {connected ? "Connected" : "Disconnected"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1" />
            <div className="px-5 py-3 border-t border-mac-border/40">
              <p className="text-[10px] text-mac-tertiary font-medium">
                SAGE v1.0
              </p>
              <p className="text-[9px] text-mac-tertiary/60 mt-0.5">
                Geospatial Emergency System
              </p>
            </div>
          </aside>

          {/* ━━ MAIN CONTENT ━━ */}
          <main className="flex-1 overflow-y-auto p-5 lg:p-6 flex flex-col gap-5">
            {/* ── LIVE FEED ── */}
            <section id="section-live" className="animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[12px] font-bold text-mac-text/60 uppercase tracking-[0.06em]">
                  Live Feed
                </h2>
                <div className="flex items-center gap-3">
                  {/* Capture Button */}
                  <button
                    onClick={captureFrame}
                    disabled={isCapturing || !streamConnected}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 shadow-sm ${
                      isCapturing
                        ? "bg-gray-200 text-gray-400 cursor-wait"
                        : streamConnected
                          ? "bg-blue-500 text-white hover:bg-blue-600 active:scale-95 hover:shadow-md"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    {isCapturing ? "Capturing…" : "Capture"}
                  </button>
                  <div className="flex items-center gap-1.5 text-[11px] text-mac-tertiary">
                    <span className={`w-[5px] h-[5px] rounded-full ${streamConnected ? 'bg-red-500 animate-pulse-dot' : 'bg-gray-400'}`} />
                    <span className="font-medium">{streamConnected ? 'Streaming' : 'No Stream'}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* Video / Selected Image */}
                <div className="xl:col-span-8 bg-gray-900 rounded-xl overflow-hidden border border-black/10 shadow-card-active relative aspect-video group">
                  {/* JSMpeg live video canvas (always mounted, hidden when viewing selected image) */}
                  <canvas
                    ref={videoCanvasRef}
                    className={`absolute inset-0 w-full h-full object-contain ${
                      selectedImage ? 'hidden' : ''
                    }`}
                    style={{ filter: 'contrast(1.05) brightness(1.05)' }}
                  />
                  {/* Fallback when no stream and no selected image */}
                  {!streamConnected && !selectedImage && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-850 to-gray-800">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10">
                        <Icon.live className="w-8 h-8 text-gray-500" />
                      </div>
                      <p className="text-[14px] text-gray-400 font-medium">
                        No video feed available
                      </p>
                      <p className="text-[12px] text-gray-500 mt-1">
                        Waiting for Raspberry Pi camera stream…
                      </p>
                      <div className="flex items-center gap-2 mt-4 text-[11px] text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/60 animate-pulse" />
                        <span>Connect via relay.js on port 8082</span>
                      </div>
                    </div>
                  )}
                  {/* Selected image overlay (from log click) */}
                  {selectedImage && (
                    <>
                      <img
                        src={`${serverBase}${selectedImage}`}
                        alt="Selected capture"
                        className="absolute inset-0 w-full h-full object-cover cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
                        onClick={() => setLightboxImage(selectedImage)}
                      />
                      <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-3 left-3 z-20 bg-black/60 backdrop-blur-sm text-white/90 rounded-lg px-2.5 py-1 text-[10px] font-medium hover:bg-black/80 transition-colors flex items-center gap-1.5"
                      >
                        ← Back to live
                      </button>
                    </>
                  )}
                  {/* Overlay HUD */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Top */}
                    <div className="absolute top-0 inset-x-0 h-12 bg-gradient-to-b from-black/50 to-transparent flex items-start pt-3 px-3.5 justify-between">
                      <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-md px-2 py-1">
                        <span className={`w-[6px] h-[6px] rounded-full ${selectedImage ? 'bg-blue-400' : 'bg-red-500 animate-pulse-dot'}`} />
                        <span className="text-[10px] font-bold text-white/90 uppercase tracking-wider">
                          {selectedImage ? 'Snapshot' : 'Live'}
                        </span>
                      </div>
                      <div className="bg-black/40 backdrop-blur-sm rounded-md px-2 py-1">
                        <span className="text-[10px] font-mono text-white/70">
                          {new Date().toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    {/* Bottom */}
                    <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-black/50 to-transparent flex items-end pb-2.5 px-3.5 justify-between">
                      <span className="text-[10px] text-white/40 font-medium">
                        RPi Camera Module v2
                      </span>
                      <span className="text-[10px] text-white/40 font-medium">
                        {logs.length} captures
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detection breakdown panel */}
                <div className="xl:col-span-4 bg-white rounded-xl border border-mac-border/50 shadow-card flex flex-col overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-mac-divider/80 bg-mac-sidebar/30">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-bold text-mac-text/80 uppercase tracking-[0.04em]">
                        Detection Breakdown
                      </p>
                      {latest && (
                        <span className="text-[10px] font-mono text-mac-tertiary bg-mac-divider/80 px-1.5 py-0.5 rounded-md">
                          {timeAgo(latest.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 p-4 flex flex-col gap-3.5 justify-center">
                    {latest ? (
                      ASSETS.map((a) => (
                        <DetectionBar
                          key={a.key}
                          asset={a}
                          count={latest[a.key] || 0}
                          maxCount={maxCount}
                        />
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <div className="w-10 h-10 rounded-xl bg-mac-divider/50 flex items-center justify-center mx-auto mb-2">
                          <Icon.chart className="w-5 h-5 text-mac-tertiary" />
                        </div>
                        <p className="text-[13px] text-mac-tertiary">
                          Waiting for data…
                        </p>
                      </div>
                    )}
                  </div>
                  {latest && (
                    <div className="px-4 py-3 border-t border-mac-divider/80 bg-mac-sidebar/30 flex justify-between items-center">
                      <span className="text-[12px] text-mac-secondary font-medium">
                        Total Objects
                      </span>
                      <div className="flex items-center gap-2">
                        <DonutRing
                          value={
                            latest.person +
                            latest.car +
                            latest.bicycle +
                            latest.other
                          }
                          max={Math.max((totalDetections / logs.length) * 2, 1)}
                          size={24}
                          stroke={2.5}
                          color="#007aff"
                        />
                        <span className="text-[18px] font-bold text-mac-text tabular-nums font-mono">
                          {latest.person +
                            latest.car +
                            latest.bicycle +
                            latest.other}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── METRICS ── */}
            <section
              id="section-metrics"
              className="animate-slide-up"
              style={{ animationDelay: "0.05s" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[12px] font-bold text-mac-text/60 uppercase tracking-[0.06em]">
                  Session Metrics
                </h2>
                <span className="text-[11px] font-mono text-mac-tertiary">
                  {uptime} elapsed
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                {ASSETS.map((a) => (
                  <StatCard
                    key={a.key}
                    asset={a}
                    value={sessionTotals[a.key]}
                    sparkData={sparkData[a.key] || []}
                  />
                ))}
                {/* Total card */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 p-4 flex flex-col gap-2 group relative overflow-hidden text-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
                  <div className="flex items-center justify-between relative">
                    <div className="w-9 h-9 rounded-[10px] bg-white/15 flex items-center justify-center">
                      <Icon.chart className="w-[18px] h-[18px] text-white/90" />
                    </div>
                    <MiniSparkline
                      data={Object.values(sparkData).reduce(
                        (acc, arr) => arr.map((v, i) => (acc[i] || 0) + v),
                        [],
                      )}
                      color="#ffffff"
                      height={28}
                    />
                  </div>
                  <div className="mt-1 relative">
                    <p className="text-[26px] font-semibold tabular-nums font-mono leading-none">
                      {totalDetections}
                    </p>
                    <p className="text-[11px] font-medium text-white/70 mt-1 tracking-wide">
                      Total Scans
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── DETECTION LOG ── */}
            <section
              id="section-logs"
              className="flex-1 flex flex-col animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="flex items-center justify-between mb-3 gap-4">
                <h2 className="text-[12px] font-bold text-mac-text/60 uppercase tracking-[0.06em] shrink-0">
                  Detection Log
                </h2>
                {/* Search */}
                <div className="relative max-w-[260px] w-full">
                  <Icon.search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mac-tertiary pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter records…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-[5px] rounded-lg bg-mac-divider/50 border border-mac-border/40 text-[12px] text-mac-text placeholder-mac-tertiary outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="bg-white rounded-xl border border-mac-border/50 shadow-card flex-1 overflow-hidden">
                <div className="overflow-auto max-h-[480px]">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 z-10 bg-mac-sidebar/95 backdrop-blur-sm border-b border-mac-divider">
                      <tr>
                        {[
                          "#",
                          "Image",
                          "Time",
                          "Person",
                          "Car",
                          "Bicycle",
                          "Other",
                          "Total",
                          "",
                        ].map((h, i) => (
                          <th
                            key={h || 'actions'}
                            className={`py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-mac-tertiary ${i < 3 ? "text-left" : "text-center"} ${i === 0 ? "w-10" : ""}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-mac-divider/60">
                      {filteredLogs.length > 0 ? (
                        filteredLogs.map((log, idx) => {
                          const total =
                            (log.person || 0) +
                            (log.car || 0) +
                            (log.bicycle || 0) +
                            (log.other || 0);
                          const isNew = newIds.has(log._id);
                          return (
                            <tr
                              key={log._id}
                              className={`transition-all duration-300 ${isNew ? "bg-blue-50/80" : "hover:bg-mac-hover/50"}`}
                            >
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-mono text-mac-tertiary">
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                {log.imageUrl ? (
                                  <button
                                    onClick={() => {
                                      setSelectedImage(log.imageUrl);
                                      document.getElementById('section-live')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    className="group/img relative cursor-pointer"
                                    title="Click to view in live feed"
                                  >
                                    <img
                                      src={`${serverBase}${log.imageUrl}`}
                                      alt=""
                                      className={`w-9 h-9 rounded-lg object-cover border transition-all duration-200 group-hover/img:scale-110 group-hover/img:shadow-lg group-hover/img:ring-2 group-hover/img:ring-blue-500/50 ${
                                        selectedImage === log.imageUrl ? 'border-blue-500 ring-2 ring-blue-500/40' : 'border-mac-divider'
                                      }`}
                                    />
                                    <div className="absolute inset-0 rounded-lg bg-blue-500/0 group-hover/img:bg-blue-500/10 transition-colors flex items-center justify-center">
                                      <Icon.search className="w-3 h-3 text-white opacity-0 group-hover/img:opacity-80 transition-opacity drop-shadow-md" />
                                    </div>
                                  </button>
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-mac-divider/40 flex items-center justify-center">
                                    <Icon.live className="w-3.5 h-3.5 text-mac-tertiary" />
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex flex-col">
                                  <span className="text-[11px] font-mono text-mac-text/80">
                                    {new Date(
                                      log.timestamp,
                                    ).toLocaleTimeString()}
                                  </span>
                                  <span className="text-[10px] text-mac-tertiary">
                                    {timeAgo(log.timestamp)}
                                  </span>
                                </div>
                              </td>
                              {ASSETS.map((a) => (
                                <td
                                  key={a.key}
                                  className="py-2.5 px-3 text-center"
                                >
                                  <span
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] text-[12px] font-bold transition-transform duration-150 hover:scale-110"
                                    style={{
                                      backgroundColor:
                                        (log[a.key] || 0) > 0
                                          ? a.color + "14"
                                          : "transparent",
                                      color:
                                        (log[a.key] || 0) > 0
                                          ? a.color
                                          : "#d1d1d6",
                                    }}
                                  >
                                    {log[a.key] || 0}
                                  </span>
                                </td>
                              ))}
                              <td className="py-2.5 px-3 text-center">
                                <span className="text-[13px] font-bold text-mac-text font-mono tabular-nums">
                                  {total}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  onClick={() => deleteLog(log._id)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-mac-tertiary hover:text-red-500 hover:bg-red-50 transition-all duration-150 active:scale-90"
                                  title="Delete this record"
                                >
                                  <Icon.trash className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="text-center py-16">
                            {searchQuery ? (
                              <>
                                <Icon.search className="w-7 h-7 text-mac-tertiary mx-auto mb-2" />
                                <p className="text-[13px] text-mac-secondary font-medium">
                                  No matching records
                                </p>
                                <p className="text-[11px] text-mac-tertiary mt-1">
                                  Try a different search term
                                </p>
                              </>
                            ) : (
                              <>
                                <Icon.log className="w-7 h-7 text-mac-tertiary mx-auto mb-2" />
                                <p className="text-[13px] text-mac-secondary font-medium">
                                  No detections yet
                                </p>
                                <p className="text-[11px] text-mac-tertiary mt-1">
                                  Records will appear here in real-time
                                </p>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </main>
        </div>

        {/* ━━━ STATUS BAR ━━━ */}
        <div className="h-[26px] bg-gradient-to-b from-[#ebebeb] to-[#dedede] border-t border-mac-border/60 flex items-center px-4 text-[10px] text-mac-tertiary select-none gap-4">
          <span className="font-medium">SAGE</span>
          <span className="text-mac-border">|</span>
          <span>{logs.length} detections</span>
          <span className="text-mac-border">|</span>
          <span>{totalDetections} objects</span>
          <span className="ml-auto font-mono tabular-nums">{uptime}</span>
        </div>
      </div>

      {/* ━━━ LIGHTBOX MODAL ━━━ */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-5xl max-h-[90vh] w-full animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`${serverBase}${lightboxImage}`}
              alt="Detection capture"
              className="w-full h-full object-contain rounded-2xl shadow-2xl ring-1 ring-white/10"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors flex items-center justify-center text-[16px] font-bold ring-1 ring-white/20"
            >
              ×
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-[11px] text-white/70">
              Press Esc or click outside to close
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
