# SAGE — Surveillance & Alert for Geospatial Emergencies

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Raspberry_Pi-A22846?style=for-the-badge&logo=raspberrypi&logoColor=white" />
</p>

A real-time surveillance dashboard that streams live video from a Raspberry Pi camera, allows manual frame capture, and maintains a searchable detection log with image previews.

---

## Features

- **Live Video Streaming** — MPEG-TS video from Raspberry Pi camera via JSMpeg WebSocket relay
- **Manual Frame Capture** — Capture button grabs the current video frame and stores it
- **Detection Log** — Timestamped log of all captured images with real-time updates
- **Image Preview** — Click any thumbnail to view in the main feed area or fullscreen lightbox
- **Delete Records** — Remove individual log entries (deletes both the database record and image file)
- **Real-time Sync** — All connected dashboards stay in sync via Socket.IO
- **Search & Filter** — Filter detection records by time or category

## Architecture

```
Raspberry Pi                              PC / Server
┌──────────────────────┐           ┌──────────────────────────────┐
│  rpicam-vid + ffmpeg │──HTTP──►  │  relay.js (8081/8082)        │
│  (H.264 → MPEG-TS)  │           │    └─ WebSocket → Browser    │
└──────────────────────┘           │                              │
                                   │  server.js (5000)            │
                                   │    ├─ Express REST API       │
                                   │    ├─ MongoDB (image logs)   │
                                   │    └─ Socket.IO (real-time)  │
                                   │                              │
                                   │  Vite Dev Server (5173)      │
                                   │    └─ React Dashboard        │
                                   └──────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, Vite, Tailwind CSS, JSMpeg |
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | MongoDB (Mongoose ODM) |
| **Streaming** | MPEG-TS over HTTP → WebSocket relay |
| **Edge Device** | Raspberry Pi with Camera Module |
| **ML (Optional)** | YOLOv3 ONNX Runtime inference |

## Prerequisites

- **Node.js** ≥ 18.x
- **MongoDB** Community Server (running locally or remote)
- **Raspberry Pi** with Camera Module and FFmpeg installed
- Both devices on the same local network

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/AgamPandey133/Sage.git
cd Sage
```

### 2. Install dependencies

```bash
# Root (relay server)
npm install

# Backend API server
cd server
npm install

# Frontend dashboard
cd ../client
npm install
```

### 3. Configure environment

Create `server/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/sage
CLIENT_URL=http://localhost:5173
```

## Running the Application

You need **3 terminals on your PC** + **1 command on the Raspberry Pi**.

### Terminal 1 — Video Relay Server
```bash
node relay.js
```

### Terminal 2 — Backend API Server
```bash
cd server
node server.js
```

### Terminal 3 — Frontend Dashboard
```bash
cd client
npm run dev
```

### Raspberry Pi — Camera Stream
```bash
rpicam-vid -t 0 --width 1280 --height 720 --framerate 30 \
  --codec h264 --inline -o - | \
  ffmpeg -i - -f mpegts -codec:v mpeg1video -s 960x540 \
  -b:v 1500k -bf 0 http://10.112.61.185:8081/sage_secure_link
```

> Replace `<YOUR_PC_IP>` with your PC's local IP address (find it using `ipconfig` on Windows or `hostname -I` on Linux).

### Open the Dashboard

Navigate to **http://localhost:5173** in your browser.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload a captured frame (multipart form) |
| `GET` | `/api/logs` | Fetch detection history (latest 50) |
| `DELETE` | `/api/logs/:id` | Delete a log entry and its image |

## Port Reference

| Port | Service |
|------|---------|
| `5173` | Vite dev server (frontend) |
| `5000` | Express API + Socket.IO |
| `8081` | Relay HTTP (receives stream from Pi) |
| `8082` | Relay WebSocket (sends to browser) |
| `27017` | MongoDB |

## Project Structure

```
sage-dashboard/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   └── Dashboard.jsx   # Main dashboard component
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── index.html
├── server/                  # Express backend
│   ├── models/
│   │   └── SurveillanceLog.js  # Mongoose schema
│   ├── uploads/             # Captured images (gitignored)
│   └── server.js
├── inference/               # Edge device scripts
│   ├── detect_and_post.py   # YOLOv3 ONNX inference + upload
│   └── requirements.txt
├── ML/                      # Training data & notebooks
├── index.html               # Legacy standalone dashboard
├── relay.js                 # MPEG-TS → WebSocket relay
├── .gitignore
└── README.md
```

## License

This project is for educational and research purposes.
