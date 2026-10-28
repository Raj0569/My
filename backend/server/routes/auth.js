const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Applicant = require('../models/Applicant');
const Admin = require('../models/Admin');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();

function createToken(user, role, permissions = []) {
  if (!process.env.JWT_SECRET) throw Object.assign(new Error('JWT_SECRET is not configured.'), { status: 500 });
  return jwt.sign({ sub: user.id, role, name: user.name, permissions }, process.env.JWT_SECRET, { expiresIn: '8h' });
}

router.post('/register', asyncHandler(async (request, response) => {
  const { name, email, phone, password } = request.body;
  if (!name?.trim() || !email?.trim() || !phone?.trim() || typeof password !== 'string') {
    return response.status(400).json({ message: 'Name, email, phone, and password are required.' });
  }
  if (password.length < 8) return response.status(400).json({ message: 'Password must have at least 8 characters.' });
  const normalizedEmail = email.trim().toLowerCase();
  if (await Promise.all([Student.exists({ email: normalizedEmail }), Applicant.exists({ email: normalizedEmail })]).then((matches) => matches.some(Boolean))) return response.status(409).json({ message: 'An account with this email already exists.' });

  const applicant = await Applicant.create({ name: name.trim(), email: normalizedEmail, phone: phone.trim(), passwordHash: await bcrypt.hash(password, 12) });
  response.status(201).json({ token: createToken(applicant, 'applicant'), user: { id: applicant.id, name: applicant.name, email: applicant.email, role: 'applicant' } });
}));

router.post('/login', asyncHandler(async (request, response) => {
  const { email, password } = request.body;
  if (!email?.trim() || typeof password !== 'string') return response.status(400).json({ message: 'Email and password are required.' });
  const normalizedEmail = email.trim().toLowerCase();
  const student = await Student.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (student && await bcrypt.compare(password, student.passwordHash)) {
    return response.json({ token: createToken(student, 'student'), user: { id: student.id, name: student.name, email: student.email, role: 'student' } });
  }
  const applicant = await Applicant.findOne({ email: normalizedEmail }).select('+passwordHash');
  if (!applicant || !(await bcrypt.compare(password, applicant.passwordHash))) return response.status(401).json({ message: 'Email or password is incorrect.' });
  response.json({ token: createToken(applicant, 'applicant'), user: { id: applicant.id, name: applicant.name, email: applicant.email, role: 'applicant' } });
}));

router.post('/admin/login', asyncHandler(async (request, response) => {
  const { email, password } = request.body;
  if (!email?.trim() || typeof password !== 'string') return response.status(400).json({ message: 'Email and password are required.' });
  const admin = await Admin.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  if (!admin || !admin.isActive || !(await bcrypt.compare(password, admin.passwordHash))) return response.status(401).json({ message: 'Email or password is incorrect.' });
  const role = admin.role === 'superadmin' ? 'superadmin' : 'admin';
  const adminPermissions = role === 'superadmin' ? [] : admin.permissions;
  response.json({ token: createToken(admin, role, adminPermissions), user: { id: admin.id, name: admin.name, email: admin.email, role, roleName: admin.roleName, permissions: adminPermissions } });
}));

module.exports = router;
