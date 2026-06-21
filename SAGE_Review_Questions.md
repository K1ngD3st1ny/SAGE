# SAGE — Examiner Review Q&A

This document contains potential questions an examiner might ask during a project review of the **SAGE (Surveillance & Alert for Geospatial Emergencies)** project, along with comprehensive answers.

---

### 1. General Architecture & Networking

**Q1: How does the live video stream from the Raspberry Pi reach the web browser with low latency?**
**Answer:** The Raspberry Pi captures H.264 video using `rpicam-vid`. This raw video is piped directly into `ffmpeg`, which converts it to an MPEG-TS format and streams it over HTTP to our Node.js Relay Server. The Relay Server receives this HTTP stream on port 8081 and instantly broadcasts it over WebSockets on port 8082. The React frontend then uses the `JSMpeg` library to decode and render the WebSocket stream onto an HTML Canvas element. This architecture avoids the heavy buffering typical of HLS/DASH, resulting in sub-second latency.

**Q2: Why did you use three separate servers (Relay, Backend API, Flask AI) instead of a monolith?**
**Answer:** A microservices approach ensures the system is non-blocking and scalable. 
- The **Relay Server** strictly handles high-throughput binary video data.
- The **Backend Server (Express)** handles business logic, MongoDB database queries, and WebSocket (Socket.IO) client synchronization.
- The **Flask AI Server** runs computationally heavy ML models (YOLOv8) in Python. Keeping ML isolated prevents the Node.js event loop from blocking during image inference, ensuring the dashboard remains responsive.

---

### 2. Machine Learning & Computer Vision

**Q3: Why did you choose YOLOv8 for object detection over other models like DETR or Faster R-CNN?**
**Answer:** YOLOv8 (specifically YOLOv8m) was chosen for the real-time inference server because it offers an optimal balance between high accuracy and extremely fast inference speeds. In a disaster management scenario, processing frames quickly is crucial. While we do use Facebook's DETR (via Hugging Face) for offline batch analysis of datasets due to its transformer-based accuracy, YOLOv8 is vastly superior for real-time edge/API implementations.

**Q4: How does your system handle the specific challenges of Thermal Images?**
**Answer:** Thermal images often lack the sharp edges and vivid textures of standard RGB images. To combat this, the Flask Inference API includes a pre-processing step using Python's `PIL.ImageEnhance`. Before feeding an image to YOLOv8, we programmatically boost the image contrast by 1.8x and sharpness by 1.5x. This makes heat signatures significantly more distinguishable for the model, improving detection confidence.

**Q5: How do you map the model's output to the categories shown on the dashboard?**
**Answer:** YOLOv8 is trained on the COCO dataset which has 80 classes. We filter these down to what is relevant for emergency surveillance. Class 0 (person) maps to **People**, class 2 (car) to **Cars**, and class 1 (bicycle) to **Bicycles**. Other vehicles like buses, trucks, and motorcycles are grouped into an **Other** category. Irrelevant classes (like indoor objects) are ignored (`KEEP_CLASSES` filter).

---

### 3. Frontend & State Management

**Q6: If I click "Capture" on the dashboard, what exactly happens under the hood?**
**Answer:** 
1. The React frontend extracts the current frame from the JSMpeg Canvas element and converts it to a Blob.
2. This image is sent via a `multipart/form-data` POST request to the Express Backend.
3. The Express server saves the image to the disk (or forwards it to the Flask ML Server for inference).
4. Once the ML server returns the detection counts and the annotated image (with bounding boxes), the Express server saves a new log entry in MongoDB.
5. Finally, the Express server emits a Socket.IO event to all connected dashboards, causing them to fetch the newly created log and update their UI in real-time.

**Q7: How do you ensure multiple operators viewing the dashboard see the same data?**
**Answer:** We implemented real-time bidirectional communication using `Socket.IO`. Whenever the MongoDB database is updated (e.g., a new image is captured, or a log is deleted), the backend emits global events (`new_log` or `delete_log`). The React application listens for these events in a `useEffect` hook and automatically updates the local React state, ensuring all clients stay synchronized without needing to manually refresh the page.

---

### 4. Hardware & Edge Deployment

**Q8: Why not run the YOLOv8 model directly on the Raspberry Pi?**
**Answer:** While the Raspberry Pi 4 is capable of running lightweight models (like YOLOv8n or TFLite models), running a medium model like YOLOv8m at a high frame rate generates significant heat and requires more compute power than the Pi can comfortably provide. By operating the Pi purely as an edge streaming device, we save its resources for uninterrupted video transmission and offload the heavy ML computations to a dedicated server/PC with a better CPU/GPU.

---

### 5. Future Enhancements

**Q9: What are some limitations of your current implementation, and how would you improve it?**
**Answer:** 
- **Security:** Currently, the WebSocket video stream is unencrypted. Adding WSS (WebSocket Secure) and authentication tokens would secure the feed.
- **Edge AI:** We could integrate a Google Coral Edge TPU with the Raspberry Pi, which would allow us to perform real-time ML inference directly on the edge device at 30+ FPS, reducing the network payload.
- **Storage:** Storing images locally on the Express server's disk doesn't scale well. Migrating image storage to a cloud bucket (like AWS S3) would make the application fully stateless and cloud-ready.
