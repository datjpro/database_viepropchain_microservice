// backfill-properties-from-nfts.js
// Usage: set MONGODB_URI in environment, then run:
// node scripts/backfill-properties-from-nfts.js

require("dotenv").config();
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error(
    "Please set MONGODB_URI in environment before running this script."
  );
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const nftsColl = db.collection("nfts");
  const propsColl = db.collection("properties");

  // Find nfts that have propertyId set
  const cursor = nftsColl.find({ propertyId: { $exists: true, $ne: null } });

  let count = 0;
  while (await cursor.hasNext()) {
    const nft = await cursor.next();
    const propId = nft.propertyId;
    // Ensure propId is an ObjectId if it's string
    let propObjectId;
    try {
      propObjectId = typeof propId === "string" ? ObjectId(propId) : propId;
    } catch (err) {
      console.warn(
        `Skipping nft _id=${nft._id} because propertyId is invalid: ${propId}`
      );
      continue;
    }

    const update = {
      $set: {
        "nft.isMinted": true,
        "nft.tokenId": nft.tokenId,
        "nft.contractAddress": nft.contractAddress,
        "nft.metadataUri": nft.metadataUri || nft.tokenURI || null,
        "nft.metadataCID": nft.metadataCID || null,
        "nft.mintedAt": nft.mintedAt ? new Date(nft.mintedAt) : new Date(),
        owner: nft.currentOwner || nft.mintedBy || nft.owner || null,
      },
    };

    try {
      const res = await propsColl.updateOne({ _id: propObjectId }, update);
      if (res.matchedCount === 0) {
        console.warn(
          `No property found with _id=${propObjectId} for nft _id=${nft._id}`
        );
      } else {
        console.log(
          `Updated property ${propObjectId} from nft tokenId=${nft.tokenId}`
        );
        count++;
      }
    } catch (err) {
      console.error(`Failed to update property ${propObjectId}:`, err.message);
    }
  }

  console.log(`Processed ${count} properties.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
