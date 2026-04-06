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
});

module.exports = mongoose.model("SurveillanceLog", surveillanceLogSchema);
