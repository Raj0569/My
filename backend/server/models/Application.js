const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  status: { type: String, enum: ['Payment Pending', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Admission Confirmed'], required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'statusHistory.actorType' },
  actorType: { type: String, enum: ['Applicant', 'Student', 'Admin'], required: true },
  note: { type: String, trim: true, maxlength: 300 },
  changedAt: { type: Date, default: Date.now }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
  applicationNumber: { type: String, required: true, unique: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'Applicant', index: true },
  course: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Course' },
  personalDetails: {
    name: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    address: { type: String, required: true, trim: true },
    pinCode: { type: String, trim: true, match: /^\d{6}$/ },
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 }
  },
  academicDetails: {
    qualification: { type: String, required: true, trim: true },
    stream: { type: String, trim: true },
    percentage: { type: Number, min: 0, max: 100 },
    subjects: { type: [String], default: [] },
    passingYear: { type: Number, required: true, min: 2000, max: 2035 }
  },
  eligibilityCheck: {
    checkedAt: Date,
    result: { type: String, enum: ['passed'] },
  },
  payment: {
    provider: { type: String, enum: ['razorpay'] },
    orderId: { type: String, index: true },
    paymentId: String,
    amountPaise: Number,
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'captured'] },
    paidAt: Date,
  },
  slotBookedAt: Date,
  status: { type: String, enum: ['Payment Pending', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Admission Confirmed'], default: 'Submitted' },
  statusHistory: { type: [historySchema], default: [] },
  approvalStage: { type: String, enum: ['payment_pending', 'reviewer', 'department_head', 'principal', 'director', 'enrollment_pending', 'complete', 'rejected'], default: 'reviewer', index: true },
  approvalHistory: [{
    stage: { type: String, enum: ['reviewer', 'department_head', 'principal', 'director'], required: true },
    decision: { type: String, enum: ['approved', 'rejected'], required: true },
    note: { type: String, trim: true, maxlength: 1000, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    changedAt: { type: Date, default: Date.now },
  }],
  reviewNote: { type: String, trim: true, maxlength: 1000, select: false },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
