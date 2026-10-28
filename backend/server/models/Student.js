const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student'], default: 'student' },
  enrollmentStatus: { type: String, enum: ['in_process', 'completed', 'left'], default: 'in_process' },
  enrolledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicant', default: null },
  admittedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
