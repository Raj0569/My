const { Router } = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const AdminRole = require('../models/AdminRole');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Application = require('../models/Application');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();
const permissions = ['courses.view', 'courses.create', 'courses.edit', 'courses.delete', 'students.view', 'students.edit', 'staff.manage', 'applications.view', 'applications.approve.reviewer', 'applications.approve.department_head', 'applications.approve.principal', 'applications.approve.director', 'enquiries.view', 'enquiries.update'];
const approvalPermissions = permissions.filter((permission) => permission.startsWith('applications.approve.'));
router.use(requireAuth, requireAdmin);

function requireStudentAccess(req, res, next) {
  if (req.user?.role === 'superadmin' || req.user?.permissions?.some((permission) => ['students.view', 'students.edit'].includes(permission))) return next();
  return res.status(403).json({ message: 'You do not have permission to view students.' });
}

async function studentFilter(query) {
  const filter = {};
  const admittedStudentIds = await Application.find({ status: 'Admission Confirmed', student: { $ne: null } }).distinct('student');
  filter._id = { $in: admittedStudentIds };
  if (['in_process', 'completed', 'left'].includes(query.status)) filter.enrollmentStatus = query.status;
  const q = String(query.q || '').trim();
  if (q) {
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const [courses, namedStudents] = await Promise.all([
      Course.find({ $or: [{ name: { $regex: safe, $options: 'i' } }, { code: { $regex: safe, $options: 'i' } }] }).select('_id'),
      Student.find({ $or: [{ name: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }] }).distinct('_id'),
    ]);
    const courseIds = courses.map((course) => course._id);
    const courseStudents = courseIds.length ? await Application.find({ course: { $in: courseIds } }).distinct('student') : [];
    const matchedIds = new Set([...namedStudents, ...courseStudents].map(String));
    filter._id = { $in: admittedStudentIds.filter((id) => matchedIds.has(String(id))) };
  }
  return filter;
}

async function studentsWithApplications(filter, options = {}) {
  let query = Student.find(filter).select('name email phone role enrollmentStatus createdAt admittedAt').sort({ createdAt: -1 });
  if (options.skip !== undefined) query = query.skip(options.skip);
  if (options.limit !== undefined) query = query.limit(options.limit);
  const students = await query;
  const applications = students.length ? await Application.find({ student: { $in: students.map((student) => student._id) } }).populate('course', 'name code').select('student course applicationNumber personalDetails submittedAt status').sort({ submittedAt: -1 }) : [];
  const applicationByStudent = new Map();
  for (const application of applications) if (!applicationByStudent.has(String(application.student))) applicationByStudent.set(String(application.student), application);
  return students.map((student) => {
    const application = applicationByStudent.get(String(student._id));
    return { ...student.toObject(), course: application?.course || null, applicationNumber: application?.applicationNumber || null, personalDetails: application?.personalDetails || {}, submittedAt: application?.submittedAt || null };
  });
}

router.get(['/users', '/students'], requireStudentAccess, asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = await studentFilter(req.query);
  const [items, total] = await Promise.all([
    studentsWithApplications(filter, { skip: (page - 1) * limit, limit }),
    Student.countDocuments(filter),
  ]);
  res.json({ total, items, page, pages: Math.ceil(total / limit) });
}));

router.get('/students/export', requireStudentAccess, asyncHandler(async (req, res) => {
  const filter = await studentFilter(req.query);
  const items = await studentsWithApplications(filter);
  res.json({ items });
}));

router.patch('/students/:id', requirePermission('students.edit'), asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found.' });
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : student.name;
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : student.email;
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : student.phone;
  const enrollmentStatus = req.body.enrollmentStatus ?? student.enrollmentStatus;
  if (name.length < 2 || !email || !phone) return res.status(400).json({ message: 'Name, email, and phone are required.' });
  if (!['in_process', 'completed', 'left'].includes(enrollmentStatus)) return res.status(400).json({ message: 'Choose a valid student status.' });
  if (await Student.exists({ email, _id: { $ne: student._id } })) return res.status(409).json({ message: 'Another student already uses this email.' });
  student.name = name;
  student.email = email;
  student.phone = phone;
  student.enrollmentStatus = enrollmentStatus;
  if (['address', 'pinCode', 'city', 'state'].some((field) => Object.hasOwn(req.body, field))) {
    const application = await Application.findOne({ student: student._id, status: 'Admission Confirmed' }).sort({ submittedAt: -1 });
    if (!application) return res.status(409).json({ message: 'The student admission application could not be found.' });
    for (const field of ['address', 'pinCode', 'city', 'state']) {
      if (typeof req.body[field] === 'string') application.personalDetails[field] = req.body[field].trim();
    }
    if (!application.personalDetails.address || !/^\d{6}$/.test(application.personalDetails.pinCode || '') || !application.personalDetails.city || !application.personalDetails.state) {
      return res.status(400).json({ message: 'Enter the address, valid 6-digit PIN code, city, and state.' });
    }
    await application.save();
  }
  await student.save();
  res.json({ id: student.id, name: student.name, email: student.email, phone: student.phone, enrollmentStatus: student.enrollmentStatus });
}));

router.get('/staff', requirePermission('staff.manage'), asyncHandler(async (_req, res) => {
  const { q = '', status = 'all' } = _req.query;
  const page = Math.max(1, Number(_req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(_req.query.limit) || 10));
  const filter = { role: 'admin' };
  if (status === 'active') filter.isActive = true;
  if (status === 'inactive') filter.isActive = false;
  if (q.trim()) {
    const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: { $regex: safe, $options: 'i' } }, { email: { $regex: safe, $options: 'i' } }];
  }
  const [staff, total] = await Promise.all([
    Admin.find(filter).select('name email role roleName permissions isActive createdAt').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Admin.countDocuments(filter),
  ]);
  const roles = await AdminRole.find().sort({ name: 1 });
  res.json({ staff, roles, permissions, total, page, pages: Math.ceil(total / limit) });
}));

router.get('/roles', requirePermission('staff.manage'), asyncHandler(async (_req, res) => {
  res.json({ roles: await AdminRole.find().sort({ name: 1 }), permissions });
}));

router.post('/roles', requirePermission('staff.manage'), asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const selected = Array.isArray(req.body.permissions) ? req.body.permissions.filter((item) => permissions.includes(item)) : [];
  if (!name) return res.status(400).json({ message: 'Role name is required.' });
  if (selected.filter((item) => approvalPermissions.includes(item)).length > 1) return res.status(400).json({ message: 'Create a separate approver role for each approval stage.' });
  const role = await AdminRole.create({ name, permissions: selected });
  res.status(201).json(role);
}));

router.patch('/roles/:id', requirePermission('staff.manage'), asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const selected = Array.isArray(req.body.permissions) ? req.body.permissions.filter((item) => permissions.includes(item)) : [];
  if (!name) return res.status(400).json({ message: 'Role name is required.' });
  if (selected.filter((item) => approvalPermissions.includes(item)).length > 1) return res.status(400).json({ message: 'A role can approve one stage only. Create a separate role for each stage.' });
  const current = await AdminRole.findById(req.params.id);
  if (!current) return res.status(404).json({ message: 'Role not found.' });
  const oldName = current.name;
  current.name = name;
  current.permissions = selected;
  const role = await current.save();
  await Admin.updateMany({ role: 'admin', roleName: oldName }, { roleName: role.name, permissions: selected });
  res.json(role);
}));

router.delete('/roles/:id', requirePermission('staff.manage'), asyncHandler(async (req, res) => {
  const role = await AdminRole.findById(req.params.id);
  if (!role) return res.status(404).json({ message: 'Role not found.' });
  if (await Admin.countDocuments({ role: 'admin', roleName: role.name })) return res.status(409).json({ message: 'This role is assigned to staff. Reassign them before deleting it.' });
  await role.deleteOne();
  res.json({ message: 'Role deleted.' });
}));

router.post('/staff', requirePermission('staff.manage'), asyncHandler(async (req, res) => {
  const { name, email, password, roleId } = req.body;
  if (!name?.trim() || !email?.trim() || typeof password !== 'string' || password.length < 12 || !roleId) return res.status(400).json({ message: 'Name, email, role, and a password of at least 12 characters are required.' });
  const role = await AdminRole.findById(roleId);
  if (!role) return res.status(400).json({ message: 'Choose a valid staff role.' });
  const admin = await Admin.create({ name: name.trim(), email: email.trim().toLowerCase(), passwordHash: await bcrypt.hash(password, 12), role: 'admin', roleName: role.name, permissions: role.permissions });
  res.status(201).json({ id: admin.id, name: admin.name, email: admin.email, roleName: admin.roleName, permissions: admin.permissions });
}));

router.patch('/staff/:id', requirePermission('staff.manage'), asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.params.id);
  if (!admin || admin.role === 'superadmin') return res.status(404).json({ message: 'Staff member not found.' });
  if (String(admin._id) === requestId(req)) return res.status(400).json({ message: 'You cannot deactivate or edit your own staff account here.' });
  const role = await AdminRole.findById(req.body.roleId);
  if (!role) return res.status(400).json({ message: 'Choose a valid staff role.' });
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });
  admin.name = name;
  admin.email = email;
  admin.roleName = role.name;
  admin.permissions = role.permissions;
  if (typeof req.body.isActive === 'boolean') admin.isActive = req.body.isActive;
  await admin.save();
  res.json({ id: admin.id, name: admin.name, email: admin.email, roleName: admin.roleName, permissions: admin.permissions, isActive: admin.isActive });
}));

function requestId(req) { return String(req.user.sub); }

module.exports = router;
