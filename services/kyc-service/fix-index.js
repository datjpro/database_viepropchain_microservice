/**
 * ========================================================================
 * FIX KYC WALLETADDRESS INDEX - DROP COLLECTION & RECREATE
 * ========================================================================
 * Run: node fix-index.js
 * ========================================================================
 */

const mongoose = require("mongoose");

async function fixIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb://127.0.0.1:27017/viepropchain", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // 1. Check if collection exists
    const collections = await db.listCollections({ name: "kycs" }).toArray();

    if (collections.length > 0) {
      console.log("\n⚠️  Collection 'kycs' exists. Dropping...");
      await db.dropCollection("kycs");
      console.log("✅ Dropped old collection 'kycs'");
    } else {
      console.log("\n⚠️  Collection 'kycs' not found (clean state)");
    }

    // 2. Create new collection with correct schema
    console.log("\n📋 Creating new collection with correct indexes...");

    const collection = db.collection("kycs");

    // Create indexes as per schema
    await collection.createIndex({ userId: 1 }, { unique: true });
    console.log("✅ Created index: userId_1 (unique)");

    await collection.createIndex({ email: 1 });
    console.log("✅ Created index: email_1");

    await collection.createIndex({ idNumber: 1 }, { unique: true });
    console.log("✅ Created index: idNumber_1 (unique)");

    await collection.createIndex(
      { walletAddress: 1 },
      { unique: true, sparse: true }
    );
    console.log("✅ Created index: walletAddress_1 (unique, sparse)");

    // 3. Verify indexes
    console.log("\n📋 Final indexes:");
    const indexes = await collection.indexes();
    indexes.forEach((idx) => {
      const sparse = idx.sparse ? " [SPARSE]" : "";
      const unique = idx.unique ? " [UNIQUE]" : "";
      console.log(`  - ${idx.name}:${unique}${sparse}`, idx.key);
    });

    console.log("\n✅ Fix completed! Now you can submit KYC.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixIndex();
