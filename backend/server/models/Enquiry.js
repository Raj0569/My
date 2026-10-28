const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  course: { type: String, required: true },
  message: { type: String, trim: true, maxlength: 500 },
  state: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Enquiry', enquirySchema);
