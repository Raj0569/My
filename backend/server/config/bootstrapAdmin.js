const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

async function bootstrapAdmin() {
  const email = "admin@northfield.local";
  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) return;

  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error(
      "Set ADMIN_BOOTSTRAP_PASSWORD to at least 12 characters before creating the first Super Admin.",
    );
  }

  await Admin.create({
    name: "Northfield Super Admin",
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "superadmin",
    roleName: "Super Admin",
    permissions: [],
  });
  console.log("Created the initial Northfield Super Admin account.");
}

module.exports = bootstrapAdmin;
