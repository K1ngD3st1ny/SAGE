#!/usr/bin/env python3
"""
SAGE Edge Inference — Lightweight YOLOv3 detection + POST to Express backend.

Runs on Raspberry Pi / Jetson / any device with a camera.
Requires only: onnxruntime, opencv, numpy, requests (NO PyTorch).

Usage:
    python detect_and_post.py \
        --model sage-yolov3.onnx \
        --server http://<YOUR_PC_IP>:5000 \
        --camera 0 \
        --interval 2 \
        --conf 0.5 \
        --nms 0.4
"""

import argparse
import io
import os
import sys
import time
import tempfile

import cv2
import numpy as np
import requests

# ---------------------------------------------------------------------------
# ONNX Runtime inference
# ---------------------------------------------------------------------------

def load_onnx_model(model_path: str):
    """Load ONNX model with ONNX Runtime."""
    import onnxruntime as ort

    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    available = ort.get_available_providers()
    providers = [p for p in providers if p in available]

    session = ort.InferenceSession(model_path, providers=providers)
    print(f"[SAGE] Model loaded: {model_path}")
    print(f"[SAGE] Providers: {session.get_providers()}")
    return session


def preprocess(frame: np.ndarray, img_size: int = 416) -> np.ndarray:
    """Resize, normalise and reshape a BGR frame for YOLOv3."""
    img = cv2.resize(frame, (img_size, img_size))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))  # HWC → CHW
    img = np.expand_dims(img, 0)         # add batch dim
    return img


def nms_numpy(boxes, scores, iou_threshold: float):
    """Pure-numpy NMS. boxes: Nx4 [x1, y1, x2, y2], scores: N."""
    if len(boxes) == 0:
        return []

    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]

    keep = []
    while order.size > 0:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        w = np.maximum(0.0, xx2 - xx1)
        h = np.maximum(0.0, yy2 - yy1)
        inter = w * h
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-16)
        inds = np.where(iou <= iou_threshold)[0]
        order = order[inds + 1]

    return keep


def postprocess(raw_output: np.ndarray, conf_thres: float, nms_thres: float):
    """
    Parse YOLO output tensor and return list of (class_id, confidence) tuples.

    raw_output shape: [batch, num_detections, 5 + num_classes]
        each detection: [x_center, y_center, w, h, obj_conf, cls0, cls1, ...]
    """
    detections = raw_output[0]  # first batch item

    # Filter by objectness score
    obj_conf = detections[:, 4]
    mask = obj_conf > conf_thres
    detections = detections[mask]

    if len(detections) == 0:
        return []

    # Class scores = obj_conf * class_conf
    class_confs = detections[:, 5:]
    class_ids = np.argmax(class_confs, axis=1)
    class_scores = np.max(class_confs, axis=1)
    scores = detections[:, 4] * class_scores

    # Convert xywh → xyxy for NMS
    boxes = np.zeros((len(detections), 4), dtype=np.float32)
    boxes[:, 0] = detections[:, 0] - detections[:, 2] / 2  # x1
    boxes[:, 1] = detections[:, 1] - detections[:, 3] / 2  # y1
    boxes[:, 2] = detections[:, 0] + detections[:, 2] / 2  # x2
    boxes[:, 3] = detections[:, 1] + detections[:, 3] / 2  # y2

    keep = nms_numpy(boxes, scores, nms_thres)

    results = []
    for idx in keep:
        results.append((int(class_ids[idx]), float(scores[idx])))
    return results


# ---------------------------------------------------------------------------
# Class mapping:  dataset.classes → SAGE dashboard categories
#   0: noobject   → skip
#   1: person     → person
#   2: car        → car
#   3: bicycle    → bicycle
#   4: othervehicle → other
#   5: dontcare   → skip
# ---------------------------------------------------------------------------

CLASS_MAP = {
    1: "person",
    2: "car",
    3: "bicycle",
    4: "other",
}


def count_detections(results):
    """Aggregate detections into {person, car, bicycle, other} counts."""
    counts = {"person": 0, "car": 0, "bicycle": 0, "other": 0}
    for class_id, _score in results:
        key = CLASS_MAP.get(class_id)
        if key:
            counts[key] += 1
    return counts


# ---------------------------------------------------------------------------
# POST to Express backend
# ---------------------------------------------------------------------------

def post_to_server(server_url: str, frame: np.ndarray, counts: dict):
    """
    POST the captured frame + detection counts to the SAGE Express API.
    Endpoint: POST /api/upload  (multipart form with 'image' file)
    """
    url = f"{server_url.rstrip('/')}/api/upload"

    # Encode frame as JPEG in memory
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    jpeg_bytes = buf.tobytes()

    files = {
        "image": ("frame.jpg", jpeg_bytes, "image/jpeg"),
    }
    data = {
        "person": str(counts["person"]),
        "car": str(counts["car"]),
        "bicycle": str(counts["bicycle"]),
        "other": str(counts["other"]),
    }

    try:
        resp = requests.post(url, files=files, data=data, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        print(f"[SAGE] POST failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="SAGE Edge Inference")
    parser.add_argument("--model", type=str, default="sage-yolov3.onnx",
                        help="Path to ONNX model")
    parser.add_argument("--server", type=str, default="http://localhost:5000",
                        help="SAGE backend URL")
    parser.add_argument("--camera", type=int, default=0,
                        help="Camera device index (0 = default)")
    parser.add_argument("--interval", type=float, default=2.0,
                        help="Seconds between captures")
    parser.add_argument("--conf", type=float, default=0.5,
                        help="Confidence threshold")
    parser.add_argument("--nms", type=float, default=0.4,
                        help="NMS IoU threshold")
    parser.add_argument("--img-size", type=int, default=416,
                        help="Model input size")
    parser.add_argument("--show", action="store_true",
                        help="Display detections in a window (requires display)")
    args = parser.parse_args()

    # Load model
    session = load_onnx_model(args.model)
    input_name = session.get_inputs()[0].name

    # Open camera
    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print(f"[SAGE] ERROR: Cannot open camera {args.camera}")
        sys.exit(1)
    print(f"[SAGE] Camera {args.camera} opened")

    print(f"[SAGE] Posting to {args.server}/api/upload every {args.interval}s")
    print(f"[SAGE] Press Ctrl+C to stop\n")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[SAGE] Failed to grab frame, retrying...")
                time.sleep(1)
                continue

            # Preprocess
            t0 = time.time()
            blob = preprocess(frame, args.img_size)

            # Inference
            raw_output = session.run(None, {input_name: blob})
            t_infer = time.time() - t0

            # Postprocess
            results = postprocess(raw_output[0], args.conf, args.nms)
            counts = count_detections(results)

            total = sum(counts.values())
            print(
                f"[SAGE] {total} detections "
                f"(person={counts['person']}, car={counts['car']}, "
                f"bicycle={counts['bicycle']}, other={counts['other']}) "
                f"— {t_infer*1000:.0f}ms"
            )

            # POST to server
            resp = post_to_server(args.server, frame, counts)
            if resp:
                print(f"[SAGE] Uploaded → id={resp.get('_id', 'n/a')}")

            # Optional display
            if args.show:
                cv2.putText(
                    frame,
                    f"P:{counts['person']} C:{counts['car']} B:{counts['bicycle']} O:{counts['other']}",
                    (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2,
                )
                cv2.imshow("SAGE Edge", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

            time.sleep(args.interval)

    except KeyboardInterrupt:
        print("\n[SAGE] Stopped by user")
    finally:
        cap.release()
        if args.show:
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
