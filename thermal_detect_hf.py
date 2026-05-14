#!/usr/bin/env python3
"""
SAGE Thermal Image Object Detection - Using Hugging Face DETR Model

Processes all JPG thermal images in the ./train folder and counts:
  - Cars
  - People (persons)
  - Bicycles
  - Other assets (buses, trucks, motorcycles, etc.)

Uses Facebook's DETR (DEtection TRansformer) model from Hugging Face,
pre-trained on COCO dataset. COCO classes include person, car, bicycle,
bus, truck, motorcycle, etc.

Usage:
    python thermal_detect_hf.py
    python thermal_detect_hf.py --train-dir ./train --conf 0.5 --output results.json
    python thermal_detect_hf.py --sample 10     # process only 10 random images
"""

import argparse
import json
import os
import sys
import time
import io
from pathlib import Path
from collections import defaultdict

# Fix Windows console encoding for special characters
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from PIL import Image
from tqdm import tqdm
from transformers import DetrImageProcessor, DetrForObjectDetection
import torch


# ----------------------------------------------------------------------
# COCO class ID -> SAGE category mapping
# DETR uses COCO labels. We map them to our 4 categories:
#   person  -> People
#   car     -> Cars
#   bicycle -> Bicycles
#   Everything else detected -> Other
# ----------------------------------------------------------------------

SAGE_CATEGORY_MAP = {
    "person":       "People",
    "car":          "Cars",
    "bicycle":      "Bicycles",
    # The following are mapped to "Other"
    "bus":          "Other",
    "truck":        "Other",
    "motorcycle":   "Other",
    "train":        "Other",
    "boat":         "Other",
    "airplane":     "Other",
    "skateboard":   "Other",
    "traffic light": "Other",
    "fire hydrant": "Other",
    "stop sign":    "Other",
    "parking meter": "Other",
    "bench":        "Other",
    "dog":          "Other",
    "cat":          "Other",
    "horse":        "Other",
    "bird":         "Other",
    "backpack":     "Other",
    "umbrella":     "Other",
    "handbag":      "Other",
    "suitcase":     "Other",
}


def get_sage_category(label: str) -> str:
    """Map a COCO label string to one of our SAGE categories."""
    return SAGE_CATEGORY_MAP.get(label, "Other")


# ----------------------------------------------------------------------
# Model loading
# ----------------------------------------------------------------------

def load_model(model_name: str = "facebook/detr-resnet-50"):
    """
    Load the DETR model and processor from Hugging Face.
    Uses facebook/detr-resnet-50 -- a solid balance of speed and accuracy.
    """
    print(f"\n[*] Loading Hugging Face model: {model_name}")
    print("    (This may take a minute on first run to download weights...)\n")

    processor = DetrImageProcessor.from_pretrained(model_name)
    model = DetrForObjectDetection.from_pretrained(model_name)

    # Use GPU if available
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()

    print(f"[OK] Model loaded on device: {device}")
    return processor, model, device


# ----------------------------------------------------------------------
# Detection
# ----------------------------------------------------------------------

def detect_objects(image_path: str, processor, model, device: str,
                   conf_threshold: float = 0.5):
    """
    Run DETR object detection on a single image.

    Returns:
        dict with keys: People, Cars, Bicycles, Other (counts)
        list of individual detections: [{label, score, box}, ...]
    """
    image = Image.open(image_path).convert("RGB")

    # Preprocess
    inputs = processor(images=image, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    # Inference (no gradients needed)
    with torch.no_grad():
        outputs = model(**inputs)

    # Post-process: convert outputs to COCO-format detections
    target_sizes = torch.tensor([image.size[::-1]]).to(device)  # (height, width)
    results = processor.post_process_object_detection(
        outputs, target_sizes=target_sizes, threshold=conf_threshold
    )[0]

    # Aggregate counts
    counts = {"People": 0, "Cars": 0, "Bicycles": 0, "Other": 0}
    detections = []

    for score, label_id, box in zip(
        results["scores"], results["labels"], results["boxes"]
    ):
        label_name = model.config.id2label[label_id.item()]
        sage_cat = get_sage_category(label_name)
        counts[sage_cat] += 1
        detections.append({
            "label": label_name,
            "sage_category": sage_cat,
            "score": round(score.item(), 4),
            "box": [round(x, 1) for x in box.tolist()],
        })

    return counts, detections


# ----------------------------------------------------------------------
# Main pipeline
# ----------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="SAGE Thermal Image Object Detection using Hugging Face DETR"
    )
    parser.add_argument(
        "--train-dir", type=str, default="./train",
        help="Path to the train directory containing JPG thermal images"
    )
    parser.add_argument(
        "--conf", type=float, default=0.5,
        help="Confidence threshold for detections (0.0-1.0)"
    )
    parser.add_argument(
        "--model", type=str, default="facebook/detr-resnet-50",
        help="Hugging Face model name/path"
    )
    parser.add_argument(
        "--output", type=str, default="detection_results.json",
        help="Output JSON file for detailed results"
    )
    parser.add_argument(
        "--sample", type=int, default=0,
        help="Process only N random images (0 = all)"
    )
    args = parser.parse_args()

    # -- Discover images -----------------------------------------------
    train_dir = Path(args.train_dir)
    if not train_dir.exists():
        print(f"[ERROR] Directory not found: {train_dir}")
        sys.exit(1)

    image_files = sorted(train_dir.glob("*.jpg"))
    if not image_files:
        print(f"[ERROR] No JPG files found in {train_dir}")
        sys.exit(1)

    if args.sample > 0:
        import random
        random.seed(42)
        image_files = random.sample(image_files, min(args.sample, len(image_files)))

    total_images = len(image_files)
    print(f"\n[INFO] Found {total_images} thermal images in: {train_dir}")

    # -- Load model ----------------------------------------------------
    processor, model, device = load_model(args.model)

    # -- Run detection -------------------------------------------------
    grand_totals = {"People": 0, "Cars": 0, "Bicycles": 0, "Other": 0}
    per_image_results = []
    errors = []

    print(f"\n[DETECT] Running object detection (conf >= {args.conf})...\n")
    start_time = time.time()

    for img_path in tqdm(image_files, desc="Detecting", unit="img"):
        try:
            counts, detections = detect_objects(
                str(img_path), processor, model, device, args.conf
            )

            # Accumulate
            for cat in grand_totals:
                grand_totals[cat] += counts[cat]

            per_image_results.append({
                "image": img_path.name,
                "counts": counts,
                "total": sum(counts.values()),
                "detections": detections,
            })

        except Exception as e:
            errors.append({"image": img_path.name, "error": str(e)})

    elapsed = time.time() - start_time

    # -- Print summary -------------------------------------------------
    grand_total = sum(grand_totals.values())

    print("\n" + "=" * 60)
    print("  SAGE -- Thermal Image Detection Results")
    print("=" * 60)
    print(f"  Model          : {args.model}")
    print(f"  Confidence     : >= {args.conf}")
    print(f"  Images scanned : {total_images}")
    print(f"  Time elapsed   : {elapsed:.1f}s ({elapsed/total_images:.2f}s/img)")
    if errors:
        print(f"  Errors         : {len(errors)}")
    print("-" * 60)
    print(f"  [People]    : {grand_totals['People']:,}")
    print(f"  [Cars]      : {grand_totals['Cars']:,}")
    print(f"  [Bicycles]  : {grand_totals['Bicycles']:,}")
    print(f"  [Other]     : {grand_totals['Other']:,}")
    print("-" * 60)
    print(f"  TOTAL       : {grand_total:,}")
    print("=" * 60)

    # -- Top 10 images by detection count ------------------------------
    sorted_results = sorted(per_image_results, key=lambda x: x["total"], reverse=True)
    print("\n[TOP 10] Images with most detections:")
    print(f"  {'Image':<35} {'People':>7} {'Cars':>7} {'Bikes':>7} {'Other':>7} {'Total':>7}")
    print("  " + "-" * 70)
    for entry in sorted_results[:10]:
        c = entry["counts"]
        print(
            f"  {entry['image']:<35} "
            f"{c['People']:>7} {c['Cars']:>7} "
            f"{c['Bicycles']:>7} {c['Other']:>7} "
            f"{entry['total']:>7}"
        )

    # -- Save detailed JSON --------------------------------------------
    output_data = {
        "model": args.model,
        "confidence_threshold": args.conf,
        "total_images": total_images,
        "elapsed_seconds": round(elapsed, 2),
        "grand_totals": grand_totals,
        "grand_total_objects": grand_total,
        "per_image": per_image_results,
        "errors": errors,
    }

    output_path = Path(args.output)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"\n[SAVED] Detailed results saved to: {output_path.resolve()}")
    print("   (Contains per-image breakdowns, bounding boxes, and scores)\n")


if __name__ == "__main__":
    main()
