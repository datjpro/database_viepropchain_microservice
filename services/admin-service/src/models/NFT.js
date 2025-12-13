const mongoose = require("mongoose");

const nftSchema = new mongoose.Schema(
  {
    // NFT Identity
    tokenId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    contractAddress: {
      type: String,
      required: true,
      lowercase: true,
    },

    // Property Reference
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },

    // Ownership
    currentOwner: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },
    originalOwner: {
      type: String,
      required: true,
      lowercase: true,
    },

    // Metadata
    metadataUri: {
      type: String,
      required: true,
    },
    metadataCID: String,

    // Minting Info
    mintedAt: {
      type: Date,
      default: Date.now,
    },
    mintedBy: {
      type: String,
      lowercase: true,
    },
    mintTransactionHash: {
      type: String,
      required: true,
    },
    mintBlockNumber: Number,

    // NFT Status
    status: {
      type: String,
      enum: ["minted", "listed", "sold", "transferred", "burned"],
      default: "minted",
      index: true,
    },

    // Marketplace Info (if listed for sale)
    listing: {
      isListed: { type: Boolean, default: false, index: true },
      listingId: Number,
      price: Number, // Price in ETH (wei)
      priceETH: Number, // Price in ETH (readable)
      listedAt: Date,
      seller: { type: String, lowercase: true },
      expiresAt: Date,
    },

    // Sale History
    saleHistory: [
      {
        from: { type: String, lowercase: true },
        to: { type: String, lowercase: true },
        price: Number, // in wei
        priceETH: Number, // readable
        transactionHash: String,
        blockNumber: Number,
        soldAt: { type: Date, default: Date.now },
      },
    ],

    // Transfer History
    transferHistory: [
      {
        from: { type: String, lowercase: true },
        to: { type: String, lowercase: true },
        transactionHash: String,
        blockNumber: Number,
        transferredAt: { type: Date, default: Date.now },
        transferType: {
          type: String,
          enum: ["mint", "sale", "transfer", "gift"],
        },
      },
    ],

    // Statistics
    totalTransfers: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    lastTransferAt: Date,
    lastSaleAt: Date,

    // Views & Analytics
    views: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes
nftSchema.index({ tokenId: 1, contractAddress: 1 }, { unique: true });
nftSchema.index({ currentOwner: 1, status: 1 });
nftSchema.index({ "listing.isListed": 1, "listing.price": 1 });
nftSchema.index({ propertyId: 1 });

// Virtual for OpenSea-style URL
nftSchema.virtual("openSeaUrl").get(function () {
  return `https://opensea.io/assets/${this.contractAddress}/${this.tokenId}`;
});

// Method: List NFT for sale
nftSchema.methods.listForSale = function (price, seller, listingId) {
  this.listing = {
    isListed: true,
    listingId: listingId,
    price: price,
    priceETH: parseFloat((price / 1e18).toFixed(4)),
    listedAt: new Date(),
    seller: seller.toLowerCase(),
  };
  this.status = "listed";
  return this.save();
};

// Method: Unlist NFT
nftSchema.methods.unlist = function () {
  this.listing.isListed = false;
  this.status = this.saleHistory.length > 0 ? "sold" : "minted";
  return this.save();
};

// Method: Record sale
nftSchema.methods.recordSale = function (from, to, price, txHash, blockNumber) {
  this.saleHistory.push({
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    price: price,
    priceETH: parseFloat((price / 1e18).toFixed(4)),
    transactionHash: txHash,
    blockNumber: blockNumber,
    soldAt: new Date(),
  });

  this.transferHistory.push({
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    transactionHash: txHash,
    blockNumber: blockNumber,
    transferredAt: new Date(),
    transferType: "sale",
  });

  this.currentOwner = to.toLowerCase();
  this.totalSales += 1;
  this.totalTransfers += 1;
  this.lastSaleAt = new Date();
  this.lastTransferAt = new Date();
  this.status = "sold";
  this.listing.isListed = false;

  return this.save();
};

// Method: Record transfer (non-sale)
nftSchema.methods.recordTransfer = function (
  from,
  to,
  txHash,
  blockNumber,
  type = "transfer"
) {
  this.transferHistory.push({
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    transactionHash: txHash,
    blockNumber: blockNumber,
    transferredAt: new Date(),
    transferType: type,
  });

  this.currentOwner = to.toLowerCase();
  this.totalTransfers += 1;
  this.lastTransferAt = new Date();
  this.status = "transferred";

  return this.save();
};

module.exports = mongoose.model("NFT", nftSchema);
