const mongoose = require("mongoose");

const surveillanceLogSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  person: {
    type: Number,
    default: 0,
  },
  car: {
    type: Number,
    default: 0,
  },
  bicycle: {
    type: Number,
    default: 0,
  },
  other: {
    type: Number,
    default: 0,
  },
  // "edge" = from Raspberry Pi, "manual" = user upload, "auto" = camera capture with server-side AI
  source: {
    type: String,
    enum: ["edge", "manual", "auto"],
    default: "auto",
  },
  // Individual detection details from the AI model
  detections: {
    type: [
      {
        label: String,
        category: String,
        score: Number,
        box: [Number],
      },
    ],
    default: [],
  },
});

module.exports = mongoose.model("SurveillanceLog", surveillanceLogSchema);
