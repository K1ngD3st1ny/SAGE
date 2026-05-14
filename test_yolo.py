#!/usr/bin/env python3
"""
Test YOLOv8m on thermal images with lower confidence and image enhancement.
Applies CLAHE contrast enhancement which helps models see thermal objects better.
"""
import io, sys, os, random, time
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from pathlib import Path
from ultralytics import YOLO
from PIL import Image, ImageEnhance, ImageOps
import numpy as np

TRAIN_DIR = Path("./train")
OUTPUT_DIR = Path("./test_yolo_results")
OUTPUT_DIR.mkdir(exist_ok=True)

def enhance_thermal(img_path):
    """Apply CLAHE-like enhancement to thermal image for better detection."""
    img = Image.open(img_path).convert("RGB")
    # Boost contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.8)
    # Boost sharpness
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(1.5)
    return img

def classify(cls_id):
    # COCO: 0=person, 1=bicycle, 2=car
    if cls_id == 0: return "person"
    if cls_id == 1: return "bicycle"
    if cls_id == 2: return "car"
    return "other"

all_images = sorted(TRAIN_DIR.glob("*.jpg"))
print(f"Found {len(all_images)} images")

# Pick 10 random + include some that likely have objects (lower altitude = 60)
random.seed(123)
samples = random.sample(all_images, min(10, len(all_images)))

print(f"\n{'='*70}")
print(f"Testing YOLOv8m with thermal enhancement on 10 images")
print(f"Using lower confidence threshold (0.15) for thermal imagery")
print(f"{'='*70}")

print("\n[*] Loading YOLOv8m model (medium - more accurate)...")
model = YOLO("yolov8m.pt")
print("[*] Model loaded!\n")

total_counts = {"person": 0, "car": 0, "bicycle": 0, "other": 0}

for i, img_path in enumerate(samples):
    print(f"\n--- Image {i+1}/10: {img_path.name} ---")
    
    # Enhance the thermal image
    enhanced = enhance_thermal(img_path)
    
    t0 = time.time()
    results = model.predict(
        source=enhanced,
        conf=0.15,      # Lower confidence for thermal
        iou=0.45,
        verbose=False,
    )
    elapsed = (time.time() - t0) * 1000
    
    r = results[0]
    counts = {"person": 0, "car": 0, "bicycle": 0, "other": 0}
    
    if r.boxes is not None:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            label = model.names[cls_id]
            cat = classify(cls_id)
            counts[cat] += 1
            print(f"  [{cat.upper():8s}] {label:15s} conf={conf:.2f}")
    
    for k in counts:
        total_counts[k] += counts[k]
    
    total = sum(counts.values())
    print(f"  >> person={counts['person']} car={counts['car']} bicycle={counts['bicycle']} other={counts['other']} total={total} ({elapsed:.0f}ms)")
    
    # Save annotated image
    annotated = r.plot()
    out_path = OUTPUT_DIR / f"yolom_{img_path.name}"
    Image.fromarray(annotated).save(str(out_path))

print(f"\n{'='*70}")
print(f"TOTAL (YOLOv8m + enhancement):")
print(f"  Person:  {total_counts['person']}")
print(f"  Car:     {total_counts['car']}")
print(f"  Bicycle: {total_counts['bicycle']}")
print(f"  Other:   {total_counts['other']}")
print(f"  TOTAL:   {sum(total_counts.values())}")
print(f"{'='*70}")
print(f"\nAnnotated images saved to: {OUTPUT_DIR.absolute()}")
