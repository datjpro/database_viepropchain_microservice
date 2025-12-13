const mongoose = require("mongoose");

async function dropCollections() {
  try {
    await mongoose.connect("mongodb://localhost:27017/viepropchain");
    console.log("🔌 Connected to MongoDB");

    const db = mongoose.connection.db;

    // Drop listings collection completely
    try {
      await db.collection("listings").drop();
      console.log("🗑️ Dropped listings collection");
    } catch (error) {
      console.log("⚠️ Listings collection might not exist");
    }

    // Drop offers collection too (because of listingId reference)
    try {
      await db.collection("offers").drop();
      console.log("🗑️ Dropped offers collection");
    } catch (error) {
      console.log("⚠️ Offers collection might not exist");
    }

    await mongoose.connection.close();
    console.log("✅ Database cleanup completed - all indexes removed");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

dropCollections();
