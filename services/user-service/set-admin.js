/**
 * Script to set a user as admin by email
 * Usage: node set-admin.js <email>
 */

require("dotenv").config();
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: String,
    role: String,
  },
  {
    collection: "users",
    strict: false,
  }
);

const User = mongoose.model("User", userSchema);

async function setAdmin(email) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`👤 Found user: ${user.email}`);
    console.log(`   Current role: ${user.role}`);

    user.role = "admin";
    await user.save();

    console.log(`✅ User ${email} is now an admin!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.log("Usage: node set-admin.js <email>");
  console.log("Example: node set-admin.js todat2207@gmail.com");
  process.exit(1);
}

setAdmin(email);
