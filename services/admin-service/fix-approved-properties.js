/**
 * ========================================================================
 * FIX SCRIPT: Update approved properties from 'draft' to 'active'
 * ========================================================================
 * Run this script once to fix properties that were approved but stuck in draft status
 *
 * Usage: node fix-approved-properties.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/viepropchain_admin_service";

async function fixApprovedProperties() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to database");

    const Property = require("./src/models/Property");

    // Find properties that are verified but still in draft status
    const propertiesToFix = await Property.find({
      verificationStatus: "verified",
      status: "draft",
    });

    console.log(`\n📊 Found ${propertiesToFix.length} properties to fix:\n`);

    if (propertiesToFix.length === 0) {
      console.log("✅ No properties need fixing!");
      await mongoose.connection.close();
      return;
    }

    // Update each property
    for (const property of propertiesToFix) {
      console.log(`🔧 Fixing property: ${property._id}`);
      console.log(`   Title: ${property.title}`);
      console.log(`   Owner: ${property.owner}`);
      console.log(`   Status: ${property.status} → active`);

      property.status = "active";
      await property.save();

      console.log(`   ✅ Updated successfully\n`);
    }

    console.log(
      `\n✅ Fixed ${propertiesToFix.length} properties! They should now appear on /properties page.`
    );

    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Run the script
fixApprovedProperties();
