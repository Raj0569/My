const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  code: { type: String, trim: true, uppercase: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, maxlength: 2000 },
  duration: { type: String, required: true },
  eligibility: { type: String, required: true },
  annualFee: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
