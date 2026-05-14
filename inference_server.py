#!/usr/bin/env python3
"""
SAGE Inference Server — Flask API using YOLOv8m for Thermal Object Detection

Uses Ultralytics YOLOv8m with thermal image enhancement (contrast + sharpness).
Returns detection counts + annotated image with colored bounding boxes.

Usage:
    python inference_server.py
    python inference_server.py --port 5050 --conf 0.2
"""

import argparse
import base64
import io
import sys
import time

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
from ultralytics import YOLO
import numpy as np

# ── Fix Windows console encoding ─────────────────────────────────────
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

app = Flask(__name__)
CORS(app)

# ── Global model reference ───────────────────────────────────────────
model = None

# ── COCO class ID -> SAGE category mapping ───────────────────────────
# YOLOv8 COCO class IDs
SAGE_CATEGORY = {
    0: "person",      # person
    1: "bicycle",     # bicycle
    2: "car",         # car
    3: "other",       # motorcycle
    5: "other",       # bus
    7: "other",       # truck
}

# Classes to keep (relevant for aerial thermal surveillance)
KEEP_CLASSES = {0, 1, 2, 3, 5, 7}

# ── Color scheme per SAGE category (R, G, B) ─────────────────────────
CATEGORY_COLORS = {
    "person":  (0, 122, 255),    # Blue
    "car":     (255, 149, 0),    # Orange
    "bicycle": (52, 199, 89),    # Green
    "other":   (175, 82, 222),   # Purple
}


def get_sage_category(cls_id):
    return SAGE_CATEGORY.get(cls_id, "other")


def enhance_thermal(image: Image.Image) -> Image.Image:
    """Enhance thermal image contrast and sharpness for better detection."""
    img = image.convert("RGB")
    img = ImageEnhance.Contrast(img).enhance(1.8)
    img = ImageEnhance.Sharpness(img).enhance(1.5)
    return img


def load_model(model_name: str = "yolov8m.pt"):
    """Load the YOLOv8 model."""
    global model
    print(f"[SAGE-AI] Loading YOLOv8 model: {model_name}")
    model = YOLO(model_name)
    print(f"[SAGE-AI] Model loaded! Classes: {len(model.names)} COCO classes")
    print(f"[SAGE-AI] Ready to accept requests!")


def detect_objects(image: Image.Image, conf_threshold: float = 0.2):
    """Run YOLOv8 inference on a PIL Image with thermal enhancement."""
    enhanced = enhance_thermal(image)

    results = model.predict(
        source=enhanced,
        conf=conf_threshold,
        iou=0.45,
        classes=list(KEEP_CLASSES),  # Only detect relevant classes
        verbose=False,
    )

    r = results[0]
    counts = {"person": 0, "car": 0, "bicycle": 0, "other": 0}
    detections = []

    if r.boxes is not None:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            label = model.names[cls_id]
            sage_cat = get_sage_category(cls_id)
            xyxy = box.xyxy[0].tolist()

            counts[sage_cat] += 1
            detections.append({
                "label": label,
                "category": sage_cat,
                "score": round(conf, 4),
                "box": [round(x, 1) for x in xyxy],
            })

    return counts, detections


def draw_annotations(image: Image.Image, detections: list) -> Image.Image:
    """Draw colored bounding boxes and labels on the image."""
    img = image.convert("RGB").copy()
    draw = ImageDraw.Draw(img, "RGBA")

    try:
        font = ImageFont.truetype("arial.ttf", 14)
        font_small = ImageFont.truetype("arial.ttf", 11)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 14)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
        except (OSError, IOError):
            font = ImageFont.load_default()
            font_small = font

    for det in detections:
        cat = det["category"]
        color = CATEGORY_COLORS.get(cat, (175, 82, 222))
        x1, y1, x2, y2 = det["box"]
        label = det["label"]
        score = det["score"]

        # Semi-transparent fill
        draw.rectangle([x1, y1, x2, y2], fill=color + (35,))

        # Border (3px)
        for offset in range(3):
            draw.rectangle(
                [x1 - offset, y1 - offset, x2 + offset, y2 + offset],
                outline=color + (220,)
            )

        # Label badge
        label_text = f"{label} {score*100:.0f}%"
        bbox = draw.textbbox((0, 0), label_text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        pad = 4

        label_bg = [x1, y1 - text_h - pad * 2, x1 + text_w + pad * 2, y1]
        if label_bg[1] < 0:
            label_bg = [x1, y1, x1 + text_w + pad * 2, y1 + text_h + pad * 2]

        draw.rectangle(label_bg, fill=color + (200,))
        draw.text(
            (label_bg[0] + pad, label_bg[1] + pad),
            label_text,
            fill=(255, 255, 255),
            font=font
        )

    # Legend
    seen = []
    for det in detections:
        if det["category"] not in seen:
            seen.append(det["category"])

    if seen:
        lx = img.width - 160
        ly = 10
        lh = len(seen) * 22 + 16
        draw.rectangle([lx - 8, ly - 4, img.width - 8, ly + lh], fill=(0, 0, 0, 160))
        for i, cat in enumerate(seen):
            color = CATEGORY_COLORS.get(cat, (175, 82, 222))
            y = ly + 4 + i * 22
            draw.rectangle([lx, y, lx + 14, y + 14], fill=color + (255,))
            draw.text((lx + 20, y), cat.capitalize(), fill=(255, 255, 255), font=font_small)

    return img


# ── Routes ───────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "model": "YOLOv8m",
        "model_loaded": model is not None,
    })


@app.route("/detect", methods=["POST"])
def detect():
    """
    Run YOLOv8 object detection on an uploaded thermal image.
    Returns counts + annotated image with colored bounding boxes.
    """
    if "image" not in request.files:
        return jsonify({"error": "No image file provided."}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "Empty filename."}), 400

    conf = float(request.args.get("conf", 0.2))
    annotate = request.args.get("annotate", "true").lower() in ("true", "1", "yes")

    try:
        image = Image.open(file.stream)
    except Exception as e:
        return jsonify({"error": f"Could not open image: {str(e)}"}), 400

    t0 = time.time()
    counts, detections = detect_objects(image, conf)

    # Draw annotated image
    annotated_b64 = None
    if annotate and detections:
        annotated_img = draw_annotations(image, detections)
        buf = io.BytesIO()
        annotated_img.save(buf, format="JPEG", quality=90)
        annotated_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

    inference_ms = round((time.time() - t0) * 1000)
    total = counts["person"] + counts["car"] + counts["bicycle"] + counts["other"]

    print(
        f"[SAGE-AI] Detected: person={counts['person']}, car={counts['car']}, "
        f"bicycle={counts['bicycle']}, other={counts['other']} "
        f"(total={total}, {inference_ms}ms)"
    )

    result = {
        **counts,
        "total": total,
        "detections": detections,
        "inference_ms": inference_ms,
    }
    if annotated_b64:
        result["annotated_image"] = annotated_b64

    return jsonify(result)


# ── Main ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SAGE AI Inference Server")
    parser.add_argument("--port", type=int, default=5050, help="Port to run on")
    parser.add_argument("--model", type=str, default="yolov8m.pt",
                        help="YOLO model file (yolov8n/s/m/l/x.pt)")
    parser.add_argument("--conf", type=float, default=0.2,
                        help="Default confidence threshold")
    args = parser.parse_args()

    load_model(args.model)

    print(f"\n[SAGE-AI] Inference server running on http://localhost:{args.port}")
    print(f"[SAGE-AI] POST /detect  — send thermal image for detection")
    print(f"[SAGE-AI] GET  /health  — health check\n")

    app.run(host="0.0.0.0", port=args.port, debug=False)
