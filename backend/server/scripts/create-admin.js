require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

async function createAdmin() {
  const { MONGODB_URI, ADMIN_BOOTSTRAP_PASSWORD } = process.env;
  if (!MONGODB_URI) throw new Error('Set MONGODB_URI in .env before bootstrapping the Super Admin.');
  if (!ADMIN_BOOTSTRAP_PASSWORD || ADMIN_BOOTSTRAP_PASSWORD.length < 12) {
    throw new Error('Set ADMIN_BOOTSTRAP_PASSWORD in .env to a password of at least 12 characters.');
  }
  await mongoose.connect(MONGODB_URI);
  const email = 'admin@northfield.local';
  const passwordHash = await bcrypt.hash(ADMIN_BOOTSTRAP_PASSWORD, 12);
  await Admin.findOneAndUpdate(
    { email },
    { $set: { name: 'Northfield Super Admin', role: 'superadmin', roleName: 'Super Admin', permissions: [], passwordHash } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  console.log('Northfield Super Admin account is ready.');
}

createAdmin()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
