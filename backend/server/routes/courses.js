const { Router } = require('express');
const Course = require('../models/Course');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();

router.get('/', asyncHandler(async (_request, response) => {
  const courses = await Course.find({ isActive: true }).sort({ name: 1 });
  response.json(courses);
}));

router.get('/:id', asyncHandler(async (request, response) => {
  const course = await Course.findOne({ _id: request.params.id, isActive: true });
  if (!course) return response.status(404).json({ message: 'Course not found.' });
  response.json(course);
}));

router.get('/manage/list', requireAuth, requireAdmin, requirePermission('courses.view'), asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 10));
  const filter = {};
  if (request.query.status === 'active') filter.isActive = true;
  if (request.query.status === 'inactive') filter.isActive = false;
  if (request.query.search?.trim()) filter.name = { $regex: request.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const [items, total] = await Promise.all([
    Course.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
    Course.countDocuments(filter),
  ]);
  response.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

router.post('/', requireAuth, requireAdmin, requirePermission('courses.create'), asyncHandler(async (request, response) => {
  const course = await Course.create(request.body);
  response.status(201).json(course);
}));

router.patch('/:id', requireAuth, requireAdmin, requirePermission('courses.edit'), asyncHandler(async (request, response) => {
  const allowed = ['name', 'code', 'category', 'description', 'duration', 'eligibility', 'eligibilityDetails', 'courseStructure', 'placementDetails', 'annualFee', 'isActive'];
  const updates = Object.fromEntries(Object.entries(request.body).filter(([key]) => allowed.includes(key)));
  const course = await Course.findByIdAndUpdate(request.params.id, updates, { new: true, runValidators: true });
  if (!course) return response.status(404).json({ message: 'Course not found.' });
  response.json(course);
}));

router.delete('/:id', requireAuth, requireAdmin, requirePermission('courses.delete'), asyncHandler(async (request, response) => {
  const course = await Course.findByIdAndUpdate(request.params.id, { isActive: false }, { new: true });
  if (!course) return response.status(404).json({ message: 'Course not found.' });
  response.json({ message: 'Course archived.' });
}));

module.exports = router;
