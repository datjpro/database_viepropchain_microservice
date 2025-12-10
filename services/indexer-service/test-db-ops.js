const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const cols = await db.listCollections().toArray();
    console.log(
      "Collections:",
      cols.map((c) => c.name)
    );

    const coll = db.collection("nfts");
    try {
      console.log("Attempting findOne on nfts...");
      const res = await coll.findOne({}, { maxTimeMS: 5000 });
      console.log("findOne result:", res);
    } catch (err) {
      console.error("findOne error:", err && err.message, err);
    }

    try {
      console.log("Attempting insertOne on nfts...");
      const r = await coll.insertOne({
        testAt: new Date(),
        note: "test-db-ops",
      });
      console.log("insertOne result:", r.insertedId);
    } catch (err) {
      console.error("insertOne error:", err && err.message, err);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error("Connection error:", err && err.message, err);
    process.exit(1);
  }
}

run();
