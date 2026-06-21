# SAGE — Surveillance & Alert for Geospatial Emergencies

A real-time thermal surveillance and AI-powered object detection system built for disaster management, border security, and geospatial emergency response. SAGE streams live video from edge devices (Raspberry Pi), runs YOLOv8-based detection on thermal imagery, and presents results through an interactive web dashboard.

**Live Demo:** [https://sage-ugo7.onrender.com](https://sage-ugo7.onrender.com)

---

## Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Testing the AI Detection](#testing-the-ai-detection)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [License](#license)

---

## Features

- **Low-Latency Video Streaming** — Captures video from a Raspberry Pi camera and streams it to the browser via a WebSocket relay (JSMpeg). Sub-second latency.
- **YOLOv8 Object Detection** — A Flask-based inference server runs YOLOv8m on uploaded frames, detecting people, cars, bicycles, and other vehicles.
- **Thermal Image Enhancement** — Automatically boosts contrast (1.8x) and sharpness (1.5x) on thermal images before inference for improved accuracy.
- **Annotated Results** — Returns images with color-coded bounding boxes (blue for people, orange for cars, green for bicycles, purple for other) and confidence scores.
- **Real-Time Dashboard** — React + Tailwind CSS interface with live feed, AI analysis panel, session metrics, detection history, and fullscreen image previews.
- **Real-Time Sync** — All connected clients stay synchronized via Socket.IO. New detections appear instantly across all open dashboards.
- **Manual Analysis** — Upload any image directly through the dashboard to run AI detection without a live camera feed.

---

## System Architecture

The system is composed of five distributed layers:

```
┌─────────────────────┐
│   Raspberry Pi 4    │  Edge Device Layer
│  rpicam-vid + ffmpeg│──── H.264 / MPEG-TS stream ────┐
└─────────────────────┘                                 │
                                                        ▼
                                              ┌───────────────────┐
                                              │   Relay Server    │  Streaming Layer
                                              │   (relay.js)      │
                                              │  HTTP:8081→WS:8082│
                                              └────────┬──────────┘
                                                       │ WebSocket
                                                       ▼
┌───────────────────────┐    REST API    ┌───────────────────────────┐
│  AI Inference Server  │◄──────────────►│    Backend Server         │
│  (Flask + YOLOv8m)    │   /detect      │    (Express + Socket.IO)  │
│  HuggingFace Spaces   │               │    Render.com             │
│  Port 7860            │               │    Port 5000              │
└───────────────────────┘               └────────────┬──────────────┘
                                                     │ Socket.IO
                                                     ▼
                                          ┌─────────────────────────┐
                                          │   React Dashboard       │  Frontend Layer
                                          │   (Vite + Tailwind)     │
                                          │   Served by Express     │
                                          └─────────────────────────┘
```

### Layer Breakdown

| Layer | Technology | Role |
|-------|-----------|------|
| **Edge Device** | Raspberry Pi 4, rpicam-vid, FFmpeg | Captures H.264 video, transcodes to MPEG-TS, streams over HTTP |
| **Relay Server** | Node.js, WebSocket (ws) | Receives MPEG-TS on port 8081, broadcasts to browsers via WebSocket on port 8082 |
| **Backend** | Node.js, Express, Socket.IO | REST API for uploads, detection logs, AI status checks. Proxies images to the AI server |
| **AI Inference** | Python, Flask, YOLOv8m (Ultralytics) | Thermal enhancement + object detection. Returns counts, detections, and annotated images |
| **Frontend** | React 18, Vite, Tailwind CSS, JSMpeg | Dashboard with live video, AI analysis, metrics, and detection log |

---

## Tech Stack

**Frontend:** React 18, Vite 5, Tailwind CSS 3, Socket.IO Client, JSMpeg

**Backend:** Node.js, Express 4, Socket.IO, Multer, node-fetch, form-data

**AI / ML:** Python 3.11, Flask, Ultralytics YOLOv8m, Pillow, NumPy

**Streaming:** FFmpeg, MPEG-TS, WebSocket (ws)

**Infrastructure:** Render.com (backend + frontend), Hugging Face Spaces (AI inference), Docker

**Hardware:** Raspberry Pi 4 Model B, Camera Module v2

---

## Project Structure

```
SAGE/
├── client/                     # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx   # Main dashboard component
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                     # Express backend
│   ├── server.js               # API routes, Socket.IO, AI proxy
│   ├── .env.example            # Environment variable template
│   ├── uploads/                # Runtime image storage
│   └── package.json
│
├── hf_space/                   # HuggingFace Spaces deployment
│   ├── app.py                  # Flask inference server (YOLOv8m)
│   ├── Dockerfile              # Container config for HF Spaces
│   └── requirements.txt        # Python dependencies
│
├── inference/                  # Edge device detection script
│   ├── detect_and_post.py      # Capture + detect + POST to backend
│   └── requirements.txt
│
├── TEST/                       # Sample thermal images for testing
│   ├── 0_60_30_0_06457.jpg
│   ├── 0_60_30_0_06461.jpg
│   ├── 0_60_30_0_06474.jpg
│   ├── 0_60_40_0_06490.jpg
│   └── ...
│
├── relay.js                    # WebSocket video relay server
├── package.json                # Root scripts (build, start)
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- Python >= 3.11 (only if running the AI server locally)
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/K1ngD3st1ny/SAGE.git
cd SAGE
```

### 2. Configure Environment Variables

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
AI_SERVER_URL=https://k1ngdest1ny-sage.hf.space
```

The `AI_SERVER_URL` points to the hosted YOLOv8 inference server on Hugging Face Spaces. You can also run the inference server locally (see below).

### 3. Install Dependencies and Build

```bash
# Install server dependencies
cd server && npm install && cd ..

# Install client dependencies and build
cd client && npm install && npm run build && cd ..
```

### 4. Run the Server

```bash
# Production mode (serves React build)
cd server && NODE_ENV=production node server.js

# Or development mode (frontend on :5173, backend on :5000)
cd client && npm run dev     # Terminal 1
cd server && npm run dev     # Terminal 2
```

### 5. (Optional) Run the AI Server Locally

If you want to run the inference server on your own machine instead of using the hosted version:

```bash
cd hf_space
pip install -r requirements.txt
python app.py
```

Then update `server/.env`:

```env
AI_SERVER_URL=http://localhost:7860
```

### 6. (Optional) Start the Video Relay

For live Raspberry Pi camera streaming:

```bash
node relay.js
```

On the Raspberry Pi, run:

```bash
rpicam-vid -t 0 --width 1280 --height 720 --framerate 30 --codec h264 --inline -o - | \
  ffmpeg -i - -f mpegts -codec:v mpeg1video -s 960x540 -b:v 1500k -bf 0 \
  http://<YOUR_PC_IP>:8081/sage_secure_link
```

---

## Testing the AI Detection

Since a live Raspberry Pi camera feed is not always available, a `TEST/` folder is included with sample thermal images that can be used to verify the detection pipeline.

### Using the Dashboard

1. Open the dashboard at [https://sage-ugo7.onrender.com](https://sage-ugo7.onrender.com) (or `http://localhost:5000` if running locally)
2. Navigate to **AI Analysis** in the sidebar
3. Download any image from the [`TEST/`](./TEST) folder
4. Drag and drop the image onto the upload area, or click to browse
5. Click **Run AI Detection**
6. View the detection results: annotated image with bounding boxes, object counts, and inference time

### Using the API Directly

You can also test detection via the API:

```bash
# Health check
curl https://k1ngdest1ny-sage.hf.space/health

# Run detection on a test image
curl -X POST \
  -F "image=@TEST/0_60_30_0_06457.jpg" \
  "https://k1ngdest1ny-sage.hf.space/detect?conf=0.3&annotate=true"
```

The response includes:

```json
{
  "person": 4,
  "car": 2,
  "bicycle": 0,
  "other": 1,
  "total": 7,
  "detections": [
    {
      "label": "person",
      "category": "person",
      "score": 0.8721,
      "box": [120.5, 340.2, 180.1, 420.8]
    }
  ],
  "inference_ms": 245,
  "annotated_image": "<base64-encoded JPEG>"
}
```

### Test Images

The `TEST/` folder contains thermal surveillance images from aerial viewpoints. These images include scenes with people, vehicles, and mixed objects — representative of real-world deployment scenarios.

| File | Description |
|------|-------------|
| `0_60_30_0_06457.jpg` | Aerial thermal — mixed targets |
| `0_60_30_0_06461.jpg` | Aerial thermal — vehicle cluster |
| `0_60_30_0_06474.jpg` | Aerial thermal — pedestrian activity |
| `0_60_40_0_06490.jpg` | Aerial thermal — wide-angle scene |
| `images.jpg` | Thermal reference image |

---

## Deployment

The production system is deployed across two platforms:

### Backend + Frontend — Render.com

The Node.js backend and React frontend are deployed as a single Render Web Service. The build command compiles the React app and the start command serves everything from Express.

**Environment variables required on Render:**

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `AI_SERVER_URL` | `https://k1ngdest1ny-sage.hf.space` |

### AI Inference Server — Hugging Face Spaces

The YOLOv8m inference server runs as a Docker container on Hugging Face Spaces. It downloads the model weights at build time and exposes a Flask API on port 7860.

- Space URL: [https://huggingface.co/spaces/K1ngDest1ny/SAGE](https://huggingface.co/spaces/K1ngDest1ny/SAGE)
- API Endpoint: `https://k1ngdest1ny-sage.hf.space`

---

## API Reference

### Backend API (Express)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload an image with optional detection counts from edge device |
| `POST` | `/api/analyze` | Upload an image for AI analysis (manual trigger from dashboard) |
| `GET` | `/api/ai-status` | Check if the AI inference server is reachable |
| `GET` | `/api/logs` | Fetch the last 50 detection log entries |
| `DELETE` | `/api/logs/:id` | Delete a specific detection log and its associated image |

### AI Inference API (Flask)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check — returns model status |
| `POST` | `/detect` | Upload image for YOLOv8 detection. Query params: `conf` (threshold, default 0.2), `annotate` (return annotated image, default true) |

---

## Detection Categories

The AI model maps COCO class IDs to four SAGE-specific categories:

| Category | COCO Classes | Bounding Box Color |
|----------|-------------|-------------------|
| Person | person | Blue `#007AFF` |
| Car | car | Orange `#FF9500` |
| Bicycle | bicycle | Green `#34C759` |
| Other | motorcycle, bus, truck | Purple `#AF52DE` |

---

## License

This project was built as part of an academic initiative for disaster management and geospatial surveillance systems.
