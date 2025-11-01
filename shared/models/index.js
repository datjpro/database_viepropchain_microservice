/**
 * ========================================================================
 * SHARED MODELS - Common MongoDB models for all services
 * ========================================================================
 */

const mongoose = require("mongoose");

// ============================================================================
// NFT MODEL
// ============================================================================
const NFTSchema = new mongoose.Schema({
  tokenId: { type: Number, required: true, unique: true },
  owner: { type: String, required: true },
  tokenURI: String,
  transferHistory: [{
    from: String,
    to: String,
    transactionHash: String,
    blockNumber: Number,
    timestamp: Date
  }],
  createdAt: { type: Date, default: Date.now }
});

// ============================================================================
// PROPERTY MODEL
// ============================================================================
const PropertySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  propertyType: { 
    type: String, 
    enum: ['apartment', 'house', 'villa', 'townhouse', 'condo'],
    required: true 
  },
  address: {
    city: String,
    district: String,
    ward: String,
    street: String
  },
  area: Number,
  images: [String],
  owner: String,
  nft: {
    tokenId: Number,
    currentOwner: String,
    contractAddress: String
  },
  marketplaceStatus: {
    type: String,
    enum: ['unlisted', 'listed', 'sold'],
    default: 'unlisted'
  },
  currentListingId: Number,
  createdAt: { type: Date, default: Date.now }
});

// ============================================================================
// TRANSACTION MODEL
// ============================================================================
const TransactionSchema = new mongoose.Schema({
  transactionHash: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['mint', 'transfer', 'listing', 'sale', 'offer'],
    required: true 
  },
  from: String,
  to: String,
  tokenId: Number,
  blockNumber: Number,
  gasUsed: Number,
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending' 
  },
  timestamp: { type: Date, default: Date.now }
});

// ============================================================================
// LISTING MODEL
// ============================================================================
const ListingSchema = new mongoose.Schema({
  listingId: { type: Number, unique: true, sparse: true }, // From blockchain
  tokenId: { type: Number, required: true },
  contractAddress: { type: String, required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  propertyName: String,
  propertyType: String,
  propertyAddress: {
    city: String,
    district: String,
    ward: String
  },
  propertyArea: Number,
  propertyImages: [String],
  seller: {
    userId: { type: mongoose.Schema.Types.ObjectId },
    walletAddress: { type: String, required: true },
    email: String,
    name: String
  },
  price: {
    amount: { type: String, required: true }, // Wei string
    currency: { type: String, default: 'ETH' }
  },
  status: { 
    type: String, 
    enum: ['active', 'sold', 'cancelled'], 
    default: 'active' 
  },
  description: String,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
  views: { type: Number, default: 0 },
  favorites: { type: Number, default: 0 },
  offers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Offer' }],
  listedAt: { type: Date, default: Date.now },
  soldAt: Date,
  cancelledAt: Date,
  transactionHash: String,
  blockNumber: Number,
  buyer: {
    walletAddress: String
  }
}, {
  timestamps: true
});

// ============================================================================
// OFFER MODEL
// ============================================================================
const OfferSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  tokenId: { type: Number, required: true },
  buyer: {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    walletAddress: { type: String, required: true },
    email: String,
    name: String
  },
  price: {
    amount: { type: String, required: true }, // Wei string
    currency: { type: String, default: 'ETH' }
  },
  message: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled', 'expired'],
    default: 'pending'
  },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
  respondedAt: Date,
  response: String
}, {
  timestamps: true
});

// ============================================================================
// EXPORT MODELS
// ============================================================================
module.exports = {
  NFT: mongoose.model('NFT', NFTSchema),
  Property: mongoose.model('Property', PropertySchema),
  Transaction: mongoose.model('Transaction', TransactionSchema),
  Listing: mongoose.model('Listing', ListingSchema),
  Offer: mongoose.model('Offer', OfferSchema)
};