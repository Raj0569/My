const { Router } = require('express');
const Enquiry = require('../models/Enquiry');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();

router.post('/', asyncHandler(async (request, response) => {
  const { name, email, phone, course, message = '' } = request.body;
  if (!name?.trim() || !email?.trim() || !phone?.trim() || !course?.trim()) {
    return response.status(400).json({ message: 'Name, email, phone, and course are required.' });
  }
  const enquiry = await Enquiry.create({
    reference: `ENQ${Date.now().toString().slice(-9)}`,
    name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), course: course.trim(), message: message.trim()
  });
  response.status(201).json({ reference: enquiry.reference, message: 'Enquiry received.' });
}));

router.get('/', requireAuth, requireAdmin, requirePermission('enquiries.view'), asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 20));
  const [items, total] = await Promise.all([
    Enquiry.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Enquiry.countDocuments()
  ]);
  response.json({ items, page, pages: Math.ceil(total / limit), total });
}));

router.patch('/:id/state', requireAuth, requireAdmin, requirePermission('enquiries.update'), asyncHandler(async (request, response) => {
  const allowedStates = ['new', 'contacted', 'closed'];
  if (!allowedStates.includes(request.body.state)) return response.status(400).json({ message: 'State must be new, contacted, or closed.' });
  const enquiry = await Enquiry.findByIdAndUpdate(request.params.id, { state: request.body.state }, { new: true, runValidators: true });
  if (!enquiry) return response.status(404).json({ message: 'Enquiry not found.' });
  response.json(enquiry);
}));

module.exports = router;
