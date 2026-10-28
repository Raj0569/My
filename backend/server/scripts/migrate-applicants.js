require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Applicant = require('../models/Applicant');
const Application = require('../models/Application');
const AdminRole = require('../models/AdminRole');

async function migrateApplicants() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);
  const approvalRoles = [
    ['Reviewer', 'applications.approve.reviewer'],
    ['Department Head', 'applications.approve.department_head'],
    ['Principal', 'applications.approve.principal'],
    ['Director', 'applications.approve.director'],
  ];
  for (const [name, permission] of approvalRoles) {
    await AdminRole.findOneAndUpdate({ name }, { $setOnInsert: { permissions: [permission] } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
  }
  const accounts = await Student.find().select('+passwordHash');
  let moved = 0;
  let retained = 0;
  for (const student of accounts) {
    const hasEnrollment = await Application.exists({ student: student._id, $or: [{ status: 'Admission Confirmed' }, { approvalStage: 'complete' }] });
    if (hasEnrollment) { retained += 1; continue; }
    const applicant = await Applicant.findOneAndUpdate(
      { email: student.email },
      { $setOnInsert: { name: student.name, email: student.email, phone: student.phone, passwordHash: student.passwordHash } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    await Application.updateMany(
      { student: student._id },
      [
        { $set: { applicant: applicant._id, approvalStage: { $cond: [{ $in: ['$status', ['Rejected']] }, 'rejected', 'reviewer'] }, status: { $cond: [{ $in: ['$status', ['Rejected']] }, 'Rejected', 'Under Review'] } } },
        { $unset: 'student' },
      ],
    );
    await student.deleteOne();
    moved += 1;
  }
  console.log(`Applicant migration complete. Moved ${moved}; retained ${retained} already-enrolled accounts.`);
}

migrateApplicants()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
