FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV/Pillow
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglx-mesa0 libglib2.0-0t64 fonts-dejavu-core && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download YOLOv8m model at build time (cached in Docker layer)
RUN python -c "from ultralytics import YOLO; YOLO('yolov8m.pt')"

# Copy app code
COPY app.py .

# HF Spaces expects port 7860
EXPOSE 7860

CMD ["python", "app.py"]
