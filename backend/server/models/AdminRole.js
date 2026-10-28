const mongoose = require('mongoose');

const adminRoleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 60 },
  permissions: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('AdminRole', adminRoleSchema);
