const { Router } = require('express');
const crypto = require('crypto');
const Application = require('../models/Application');
const Applicant = require('../models/Applicant');
const Student = require('../models/Student');
const Course = require('../models/Course');
const { requireAuth, requireAdmin, requirePermission } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();
const SLOT_BOOKING_FEE_PAISE = 500000;
const stages = ['reviewer', 'department_head', 'principal', 'director'];
const stagePermission = {
  reviewer: 'applications.approve.reviewer',
  department_head: 'applications.approve.department_head',
  principal: 'applications.approve.principal',
  director: 'applications.approve.director',
};
const stageLabel = { reviewer: 'Reviewer', department_head: 'Department Head', principal: 'Principal', director: 'Director' };

router.post('/', requireAuth, asyncHandler(async (_request, response) => {
  response.status(410).json({ message: 'Course registrations now require eligibility review and a verified slot-booking payment. Use the course Register now flow.' });
}));

router.post('/register-order', requireAuth, asyncHandler(async (request, response) => {
  if (request.user.role !== 'applicant') return response.status(403).json({ message: 'Create or sign in to an applicant account to register for a course.' });
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return response.status(503).json({ message: 'Online booking is not configured yet. Contact admissions to register.' });
  }

  const { courseId, personalDetails, academicDetails, termsAccepted } = request.body;
  const subjects = Array.isArray(academicDetails?.subjects)
    ? academicDetails.subjects.map((subject) => String(subject).trim()).filter(Boolean)
    : [];
  const percentage = Number(academicDetails?.percentage);
  if (!courseId || !personalDetails?.name?.trim() || !personalDetails?.dateOfBirth || !personalDetails?.address?.trim() || !/^\d{6}$/.test(String(personalDetails?.pinCode || '')) || !personalDetails?.city?.trim() || !personalDetails?.state?.trim() || !academicDetails?.qualification?.trim() || !academicDetails?.stream?.trim() || !Number.isFinite(percentage) || percentage < 0 || percentage > 100 || !academicDetails?.passingYear) {
    return response.status(400).json({ message: 'Complete all personal, course, and academic fields with a valid percentage and 6-digit PIN code.' });
  }
  if (termsAccepted !== true) return response.status(400).json({ message: 'Confirm the non-refundable ₹5,000 booking-fee terms before continuing.' });

  const course = await Course.findOne({ _id: courseId, isActive: true });
  if (!course) return response.status(400).json({ message: 'Choose an active course.' });
  if (!course.eligibleQualifications?.length) return response.status(409).json({ message: 'This course eligibility has not been configured yet. Contact admissions before registering.' });

  const normalize = (value) => String(value).trim().toLocaleLowerCase('en-IN');
  const qualifications = course.eligibleQualifications.map(normalize);
  if (!qualifications.includes(normalize(academicDetails.qualification))) {
    return response.status(422).json({ message: `This course accepts: ${course.eligibleQualifications.join(', ')}.` });
  }
  const acceptedStreams = (course.eligibleStreams || []).map(normalize);
  if (acceptedStreams.length && !acceptedStreams.includes('any stream') && !acceptedStreams.includes(normalize(academicDetails.stream))) {
    return response.status(422).json({ message: `Your selected stream does not meet this course criteria. Accepted streams: ${course.eligibleStreams.join(', ')}.` });
  }
  if (course.minimumPercentage != null && percentage < course.minimumPercentage) {
    return response.status(422).json({ message: `This course requires at least ${course.minimumPercentage}% marks.` });
  }
  const submittedSubjects = new Set(subjects.map(normalize));
  const missingSubjects = (course.requiredSubjects || []).filter((subject) => !submittedSubjects.has(normalize(subject)));
  if (missingSubjects.length) return response.status(422).json({ message: `Required subjects not listed: ${missingSubjects.join(', ')}.` });

  const existingPending = await Application.findOne({
    applicant: request.user.sub,
    course: course._id,
    status: 'Payment Pending',
    approvalStage: 'payment_pending',
  });
  if (existingPending?.payment?.orderId) {
    return response.json({
      applicationNumber: existingPending.applicationNumber,
      courseName: course.name,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: existingPending.payment.orderId,
      amount: existingPending.payment.amountPaise,
      currency: existingPending.payment.currency,
    });
  }
  const alreadyBooked = await Application.exists({
    applicant: request.user.sub,
    course: course._id,
    'payment.status': 'captured',
    status: { $in: ['Under Review', 'Approved', 'Admission Confirmed'] },
  });
  if (alreadyBooked) return response.status(409).json({ message: 'You already have a paid registration for this course.' });

  const applicationNumber = `ADM${new Date().getFullYear()}${Date.now().toString().slice(-7)}`;
  const receipt = `slot_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const gatewayResponse = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: SLOT_BOOKING_FEE_PAISE,
      currency: 'INR',
      receipt,
      notes: { applicationNumber, courseCode: course.code || '' },
    }),
  });
  const gatewayOrder = await gatewayResponse.json().catch(() => ({}));
  if (!gatewayResponse.ok || gatewayOrder.amount !== SLOT_BOOKING_FEE_PAISE || gatewayOrder.currency !== 'INR') {
    console.error('Razorpay order creation failed:', gatewayOrder.error?.code || gatewayResponse.status);
    return response.status(502).json({ message: 'The payment service could not start checkout. Please try again later.' });
  }

  const application = await Application.create({
    applicationNumber,
    applicant: request.user.sub,
    course: course._id,
    personalDetails,
    academicDetails: {
      qualification: academicDetails.qualification.trim(),
      stream: academicDetails.stream.trim(),
      percentage,
      subjects,
      passingYear: Number(academicDetails.passingYear),
    },
    eligibilityCheck: { checkedAt: new Date(), result: 'passed' },
    payment: { provider: 'razorpay', orderId: gatewayOrder.id, amountPaise: gatewayOrder.amount, currency: gatewayOrder.currency, status: 'pending' },
    status: 'Payment Pending',
    approvalStage: 'payment_pending',
    statusHistory: [{ status: 'Payment Pending', changedBy: request.user.sub, actorType: 'Applicant', note: 'Eligibility criteria passed; waiting for slot-booking payment.' }],
  });
  response.status(201).json({
    applicationNumber: application.applicationNumber,
    courseName: course.name,
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: gatewayOrder.id,
    amount: gatewayOrder.amount,
    currency: gatewayOrder.currency,
  });
}));

router.post('/verify-registration-payment', requireAuth, asyncHandler(async (request, response) => {
  if (request.user.role !== 'applicant') return response.status(403).json({ message: 'Applicant access is required.' });
  const { orderId, paymentId, signature } = request.body;
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || typeof signature !== 'string') {
    return response.status(400).json({ message: 'Payment verification details are incomplete.' });
  }
  const application = await Application.findOne({ applicant: request.user.sub, 'payment.orderId': orderId });
  if (!application) return response.status(404).json({ message: 'Registration order not found.' });
  if (application.payment.status === 'captured') {
    return response.json({ applicationNumber: application.applicationNumber, status: application.status, slotBookedAt: application.slotBookedAt });
  }
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${orderId}|${paymentId}`).digest('hex');
  if (!/^[a-f\d]{64}$/i.test(signature) || !crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) {
    return response.status(400).json({ message: 'Payment signature could not be verified.' });
  }

  const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}`,
    },
  });
  const gatewayPayment = await paymentResponse.json().catch(() => ({}));
  if (!paymentResponse.ok || gatewayPayment.order_id !== orderId || gatewayPayment.amount !== SLOT_BOOKING_FEE_PAISE || gatewayPayment.currency !== 'INR' || gatewayPayment.status !== 'captured') {
    return response.status(409).json({ message: 'Payment is not captured yet. Wait a moment and retry verification.' });
  }

  const now = new Date();
  const updated = await Application.findOneAndUpdate(
    { _id: application._id, status: 'Payment Pending', approvalStage: 'payment_pending', 'payment.orderId': orderId },
    {
      $set: {
        status: 'Under Review',
        approvalStage: 'reviewer',
        submittedAt: now,
        slotBookedAt: now,
        'payment.paymentId': paymentId,
        'payment.status': 'captured',
        'payment.paidAt': now,
      },
      $push: {
        statusHistory: {
          $each: [
            { status: 'Submitted', changedBy: request.user.sub, actorType: 'Applicant', note: 'Slot-booking payment verified.' },
            { status: 'Under Review', changedBy: request.user.sub, actorType: 'Applicant', note: 'Registration submitted for college review.' },
          ],
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!updated) {
    const alreadyUpdated = await Application.findById(application._id);
    if (alreadyUpdated?.payment?.status === 'captured') {
      return response.json({ applicationNumber: alreadyUpdated.applicationNumber, status: alreadyUpdated.status, slotBookedAt: alreadyUpdated.slotBookedAt });
    }
    return response.status(409).json({ message: 'Registration status changed. Refresh the portal and check your application.' });
  }
  response.json({ applicationNumber: updated.applicationNumber, status: updated.status, slotBookedAt: updated.slotBookedAt });
}));

router.get('/mine', requireAuth, asyncHandler(async (request, response) => {
  if (!['applicant', 'student'].includes(request.user.role)) return response.status(403).json({ message: 'Applicant access is required.' });
  let ownerFilter;
  if (request.user.role === 'applicant') ownerFilter = { $or: [{ applicant: request.user.sub }, { student: request.user.sub }] };
  else {
    const student = await Student.findById(request.user.sub).select('enrolledFrom');
    ownerFilter = student?.enrolledFrom
      ? { $or: [{ student: request.user.sub }, { applicant: student.enrolledFrom }] }
      : { student: request.user.sub };
  }
  const applications = await Application.find(ownerFilter).populate('course', 'name code duration').sort({ submittedAt: -1 });
  response.json(applications);
}));

router.get('/number/:applicationNumber', requireAuth, asyncHandler(async (request, response) => {
  const application = await Application.findOne({ applicationNumber: request.params.applicationNumber.toUpperCase() })
    .populate('course', 'name code duration').populate('applicant', 'name email phone').populate('student', 'name email phone');
  if (!application) return response.status(404).json({ message: 'Application not found.' });
  if (!['admin', 'superadmin'].includes(request.user.role)) {
    const ownsApplicant = String(application.applicant?._id || application.applicant || '') === request.user.sub;
    const ownsStudent = String(application.student?._id || application.student || '') === request.user.sub;
    const student = request.user.role === 'student' ? await Student.findById(request.user.sub).select('enrolledFrom') : null;
    const ownsLinkedApplicant = student?.enrolledFrom && String(application.applicant?._id || application.applicant || '') === String(student.enrolledFrom);
    if (!ownsApplicant && !ownsStudent && !ownsLinkedApplicant) return response.status(403).json({ message: 'You can only view your own application.' });
  }
  response.json(application);
}));

router.get('/inbox', requireAuth, requireAdmin, asyncHandler(async (request, response) => {
  const permittedStages = stages.filter((stage) => request.user.permissions?.includes(stagePermission[stage]));
  if (!permittedStages.length) return response.status(403).json({ message: 'You do not have approval inbox access.' });
  const queryStages = [...permittedStages];
  if (permittedStages.includes('director')) queryStages.push('enrollment_pending');
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 20));
  const filter = { approvalStage: { $in: queryStages } };
  const [items, total] = await Promise.all([
    Application.find(filter).populate('applicant', 'name email phone').populate('student', 'name email phone').populate('course', 'name code category').populate('approvalHistory.changedBy', 'name roleName').sort({ submittedAt: 1 }).skip((page - 1) * limit).limit(limit),
    Application.countDocuments(filter),
  ]);
  response.json({ items, total, page, pages: Math.ceil(total / limit), stages: permittedStages.map((stage) => ({ key: stage, label: stageLabel[stage] })) });
}));

router.get('/', requireAuth, requireAdmin, requirePermission('applications.view'), asyncHandler(async (request, response) => {
  const page = Math.max(1, Number(request.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(request.query.limit) || 20));
  const filter = request.query.status ? { status: request.query.status } : {};
  const search = String(request.query.q || '').trim();
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchingCourses = await Course.find({ $or: [{ name: { $regex: safe, $options: 'i' } }, { code: { $regex: safe, $options: 'i' } }] }).distinct('_id');
    filter.$or = [
      { applicationNumber: { $regex: safe, $options: 'i' } },
      { 'personalDetails.name': { $regex: safe, $options: 'i' } },
      ...(matchingCourses.length ? [{ course: { $in: matchingCourses } }] : []),
    ];
  }
  const [items, total] = await Promise.all([
    Application.find(filter).populate('applicant', 'name email phone').populate('student', 'name email phone').populate('course', 'name code').populate('approvalHistory.changedBy', 'name roleName').sort({ submittedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Application.countDocuments(filter),
  ]);
  response.json({ items, page, pages: Math.ceil(total / limit), total });
}));

router.patch('/:id/decision', requireAuth, requireAdmin, asyncHandler(async (request, response) => {
  const { decision, note } = request.body;
  const remark = typeof note === 'string' ? note.trim() : '';
  if (!['approve', 'reject'].includes(decision)) return response.status(400).json({ message: 'Choose approve or reject.' });
  if (remark.length < 2) return response.status(400).json({ message: 'Enter a remark for this decision.' });
  let application = await Application.findById(request.params.id);
  if (!application) return response.status(404).json({ message: 'Application not found.' });
  const stage = application.approvalStage;
  if (!stages.includes(stage) && stage !== 'enrollment_pending') return response.status(409).json({ message: 'This application is not waiting for an approval.' });
  if (!request.user.permissions?.includes(stagePermission[stage === 'enrollment_pending' ? 'director' : stage])) {
    return response.status(403).json({ message: 'You do not have permission for this approval stage.' });
  }
  if (stage !== 'enrollment_pending' && application.approvalHistory.some((entry) => String(entry.changedBy) === String(request.user.sub))) {
    return response.status(403).json({ message: 'A staff member may approve each application only once.' });
  }

  if (stage === 'enrollment_pending') {
    if (decision !== 'approve') return response.status(409).json({ message: 'Director confirmation is already recorded and is being finalized.' });
    const student = await createEnrolledStudent(application);
    const completed = await finishEnrollment(application._id, student, request.user.sub);
    return response.json({ applicationNumber: completed.applicationNumber, approvalStage: completed.approvalStage, status: completed.status });
  }

  if (decision === 'reject') {
    const updated = await Application.findOneAndUpdate(
      { _id: application._id, approvalStage: stage },
      { $set: { approvalStage: 'rejected', status: 'Rejected' }, $push: { approvalHistory: { stage, decision: 'rejected', note: remark, changedBy: request.user.sub }, statusHistory: { status: 'Rejected', changedBy: request.user.sub, actorType: 'Admin', note: remark.slice(0, 300) } } },
      { new: true, runValidators: true },
    );
    if (!updated) return response.status(409).json({ message: 'Another approver has already acted on this application.' });
    return response.json({ applicationNumber: updated.applicationNumber, approvalStage: updated.approvalStage, status: updated.status });
  }

  const nextStage = stages[stages.indexOf(stage) + 1];
  if (stage !== 'director') {
    const updated = await Application.findOneAndUpdate(
      { _id: application._id, approvalStage: stage },
      { $set: { approvalStage: nextStage }, $push: { approvalHistory: { stage, decision: 'approved', note: remark, changedBy: request.user.sub } } },
      { new: true, runValidators: true },
    );
    if (!updated) return response.status(409).json({ message: 'Another approver has already acted on this application.' });
    return response.json({ applicationNumber: updated.applicationNumber, approvalStage: updated.approvalStage, status: updated.status });
  }

  const locked = await Application.findOneAndUpdate(
    { _id: application._id, approvalStage: 'director' },
    { $set: { approvalStage: 'enrollment_pending' }, $push: { approvalHistory: { stage: 'director', decision: 'approved', note: remark, changedBy: request.user.sub } } },
    { new: true },
  );
  if (!locked) return response.status(409).json({ message: 'Another approver has already acted on this application.' });
  const student = await createEnrolledStudent(locked);
  const completed = await finishEnrollment(locked._id, student, request.user.sub);
  response.json({ applicationNumber: completed.applicationNumber, approvalStage: completed.approvalStage, status: completed.status });
}));

async function finishEnrollment(applicationId, student, approverId) {
  const completed = await Application.findOneAndUpdate(
    { _id: applicationId, approvalStage: 'enrollment_pending' },
    { $set: { student: student._id, approvalStage: 'complete', status: 'Admission Confirmed' }, $push: { statusHistory: { status: 'Admission Confirmed', changedBy: approverId, actorType: 'Admin', note: 'Director confirmed admission.' } } },
    { new: true, runValidators: true },
  );
  if (completed) return completed;
  return Application.findById(applicationId);
}

async function createEnrolledStudent(application) {
  if (application.student) {
    const existing = await Student.findById(application.student);
    if (existing) return existing;
  }
  const applicant = application.applicant ? await Applicant.findById(application.applicant).select('+passwordHash') : null;
  if (!applicant) throw Object.assign(new Error('Applicant account could not be found for enrollment.'), { status: 409 });
  return Student.findOneAndUpdate(
    { email: applicant.email },
    { $setOnInsert: { name: applicant.name, email: applicant.email, phone: applicant.phone, passwordHash: applicant.passwordHash, role: 'student', enrolledFrom: applicant._id, admittedAt: new Date() } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
}

module.exports = router;
