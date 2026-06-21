# SAGE — Surveillance & Alert for Geospatial Emergencies

## 1. Project Overview
**SAGE** is a comprehensive, real-time thermal surveillance and alert dashboard designed for disaster management, border security, and geospatial emergencies. It provides low-latency video streaming from edge devices (Raspberry Pi), real-time AI object detection (using YOLOv8), and a collaborative dashboard that synchronizes data across all connected clients.

## 2. Key Features
- **Low-Latency Video Streaming:** Captures video from a Raspberry Pi camera and streams it to a web interface via a custom WebSocket relay.
- **Real-Time AI Object Detection:** Integrates a high-performance **YOLOv8m** AI pipeline that specializes in thermal image processing. It detects and classifies critical assets such as People, Cars, and Bicycles.
- **Thermal Image Enhancement:** Pre-processes thermal images by boosting contrast and sharpness before inference to ensure higher detection accuracy.
- **Detection Logging & Real-time Sync:** All captures and detections are logged in MongoDB. Connected clients stay in perfect sync using Socket.IO.
- **Interactive Dashboard:** Built with React and Tailwind CSS, featuring live video, manual capture controls, detection history, and fullscreen previews.

## 3. System Architecture

The project architecture is distributed into four distinct layers:

### A. Edge Device Layer (Raspberry Pi)
- Hardware: Raspberry Pi 4 with a Camera Module.
- Software: Uses `rpicam-vid` to capture H.264 video and pipes it to `ffmpeg`.
- Function: Converts the raw video stream to MPEG-TS and streams it over HTTP to the Relay Server.

### B. Streaming Layer (Relay Server)
- Technology: Node.js
- Function: Receives the incoming MPEG-TS HTTP stream on port 8081 and broadcasts it to the frontend clients via WebSockets (JSMpeg) on port 8082. This ensures extremely low latency (<0.5 seconds).

### C. Backend Layer (Express API & MongoDB)
- Technology: Node.js, Express, MongoDB (Mongoose), Socket.IO
- Function: 
  - Manages REST API endpoints for uploading frames and fetching logs.
  - Stores image paths, metadata, and detection counts in MongoDB.
  - Uses Socket.IO to emit events (`new_log`, `delete_log`) to keep all connected web clients instantly updated.

### D. AI Inference Layer (Flask Server)
- Technology: Python, Flask, Ultralytics (YOLOv8), Hugging Face (DETR)
- Function: An independent microservice that accepts image frames via POST requests, applies thermal image enhancements (using PIL `ImageEnhance`), runs object detection using YOLOv8m, draws color-coded bounding boxes on the image, and returns the annotated image and counts.

### E. Frontend Layer (React Dashboard)
- Technology: React, Vite, Tailwind CSS, JSMpeg
- Function: Displays the live camera feed, renders a list of historical detection logs with metadata, and allows users to capture current frames and delete old logs.

## 4. Machine Learning Implementation
The project implements two separate ML workflows depending on the use-case:

1. **Real-time Inference (YOLOv8m):** 
   A Flask API (`inference_server.py`) hosts a YOLOv8m model. Before inference, the images undergo programmatic enhancement (1.8x Contrast, 1.5x Sharpness). Detected COCO classes are mapped to four core SAGE categories: **People, Cars, Bicycles, Other**.
2. **Dataset Analysis (DETR):**
   A secondary script (`thermal_detect_hf.py`) uses Facebook's DETR (Detection Transformer) from Hugging Face for processing large batches of thermal training images.

## 5. Technology Stack Summary
- **Frontend:** React, Vite, Tailwind CSS, JSMpeg
- **Backend:** Node.js, Express.js, Socket.IO
- **Database:** MongoDB
- **Video Streaming:** FFmpeg, MPEG-TS, WebSockets
- **Machine Learning:** Python, Flask, YOLOv8 (Ultralytics), DETR (Hugging Face), PyTorch, PIL
- **Hardware:** Raspberry Pi 4
