#!/usr/bin/env node
/**
 * scripts/check-wallet.js
 * Usage: node scripts/check-wallet.js 0xWalletAddress
 * Loads MONGODB_URI from services/indexer-service/.env (via dotenv) or from env.
 */

const path = require("path");
const mongoose = require("mongoose");

// Load env from service folder
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const walletArg = process.argv[2] || process.env.WALLET;
if (!walletArg) {
  console.error("Usage: node scripts/check-wallet.js <walletAddress>");
  process.exit(1);
}

const wallet = walletArg.toLowerCase();
const walletRegex = new RegExp(`^${wallet}$`, "i");

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("MONGODB_URI not set in .env or environment");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB");

  // Require model after connection (some setups expect mongoose instance)
  const NFT = require(path.resolve(__dirname, "..", "src", "models", "NFT"));

  // Default: only search NFTs owned by the wallet (owner/currentOwner).
  // Pass `--include-minted` or set env `INCLUDE_MINTED=true` to include mintedBy/originalOwner.
  const includeMinted =
    process.argv.includes("--include-minted") ||
    process.env.INCLUDE_MINTED === "true";

  const orClauses = [{ owner: walletRegex }, { currentOwner: walletRegex }];
  if (includeMinted) {
    orClauses.push({ mintedBy: walletRegex }, { originalOwner: walletRegex });
  }

  const orQuery = { $or: orClauses };

  const total = await NFT.countDocuments(orQuery);
  console.log(
    `Found ${total} matching NFT(s) for wallet ${walletArg} (includeMinted=${includeMinted})`
  );

  if (total > 0) {
    const docs = await NFT.find(orQuery).limit(50).lean();
    for (const d of docs) {
      console.log("---");
      console.log(`tokenId: ${d.tokenId}  _id: ${d._id}`);
      console.log(
        `owner: ${d.owner}  currentOwner: ${d.currentOwner}  mintedBy: ${d.mintedBy}`
      );
      if (includeMinted)
        console.log("(included by minted/original owner search)");
      console.log(`propertyId: ${d.propertyId}  status: ${d.status}`);
      if (d.metadataUri) console.log(`metadataUri: ${d.metadataUri}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
