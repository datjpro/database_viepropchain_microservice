/**
 * ========================================================================
 * SHARED MODELS - Database Models cho tất cả services
 * ========================================================================
 * 
 * File này export tất cả Mongoose models để các services có thể import
 * 
 * Services sử dụng:
 * - Auth Service: User
 * - Admin Service: Property, IPFSMetadata
 * - Blockchain Service: NFT, Transaction
 * - Indexer Service: NFT, Transaction, Marketplace, Property
 * - Query Service: Property, NFT, Analytics
 */

const mongoose = require('mongoose');

// ============================================================================
// 1. USER MODEL - Auth Service
// ============================================================================
const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address'
    }
  },
  nonce: {
    type: String,
    required: true,
    default: () => Math.floor(Math.random() * 1000000).toString()
  },
  sessionToken: String,
  tokenExpiry: Date,
  role: {
    type: String,
    enum: ['user', 'admin', 'agent'],
    default: 'user',
    index: true
  },
  profile: {
    name: String,
    email: String,
    phone: String,
    avatar: String,
    bio: String
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastLoginAt: Date
}, { timestamps: true });

userSchema.index({ role: 1, createdAt: -1 });

// ============================================================================
// 2. PROPERTY MODEL - Admin Service, Query Service
// ============================================================================
const propertySchema = new mongoose.Schema({
  propertyType: {
    type: String,
    required: true,
    enum: ['apartment', 'land', 'house', 'villa', 'commercial'],
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    index: 'text'
  },
  description: {
    type: String,
    required: true,
    index: 'text'
  },
  imageUrl: String,

  location: {
    address: { type: String, required: true, index: 'text' },
    district: { type: String, index: true },
    city: { type: String, required: true, index: true },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  details: {
    area: { value: Number, unit: { type: String, default: 'm2' } },
    bedrooms: { type: Number, index: true },
    bathrooms: Number,
    legalStatus: String,
    cachedAttributes: [{ trait_type: String, value: String }]
  },

  price: {
    amount: { type: Number, required: true, index: true },
    currency: { type: String, default: 'VND' },
    updatedAt: Date
  },

  nft: {
    isMinted: { type: Boolean, default: false, index: true },
    nftId: { type: mongoose.Schema.Types.ObjectId, ref: 'NFT' },
    tokenId: { type: Number, index: true, sparse: true },
    contractAddress: { type: String, lowercase: true, index: true },
    currentOwner: { type: String, lowercase: true, index: true },
    metadataCID: String,
    mintedAt: Date,
    mintedBy: String,
    transactionHash: String
  },

  status: {
    type: String,
    enum: ['draft', 'approved', 'pending_mint', 'minted', 'listed', 'sold', 'archived'],
    default: 'draft',
    index: true
  },

  creator: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    walletAddress: { type: String, lowercase: true, index: true },
    name: String
  },

  owner: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    walletAddress: { type: String, lowercase: true, index: true },
    name: String
  },

  media: {
    images: [{ url: String, cid: String, isPrimary: Boolean }],
    documents: [{ name: String, url: String, cid: String, type: String }]
  },

  analytics: {
    views: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    lastViewedAt: Date
  },

  isPublic: { type: Boolean, default: false, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  tags: [{ type: String, lowercase: true, index: true }],

  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: Date
}, { timestamps: true });

propertySchema.index({ propertyType: 1, status: 1, createdAt: -1 });
propertySchema.index({ 'location.city': 1, 'location.district': 1, propertyType: 1 });
propertySchema.index({ 'price.amount': 1, propertyType: 1, status: 1 });

// ============================================================================
// 3. NFT MODEL - Blockchain Service, Indexer Service
// ============================================================================
const nftSchema = new mongoose.Schema({
  tokenId: { type: Number, required: true, unique: true, index: true },
  contractAddress: { type: String, required: true, lowercase: true, index: true },
  owner: { type: String, required: true, lowercase: true, index: true },
  tokenURI: { type: String, required: true },
  metadataCID: { type: String, required: true, index: true },

  mintedBy: { type: String, required: true, lowercase: true },
  mintedTo: { type: String, required: true, lowercase: true },
  mintedAt: { type: Date, required: true, index: true },
  mintTransactionHash: { type: String, required: true, lowercase: true, index: true },
  blockNumber: { type: Number, required: true, index: true },

  transferHistory: [{
    from: String,
    to: String,
    transactionHash: String,
    blockNumber: Number,
    timestamp: Date
  }],

  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true, index: true },

  metadataCache: {
    name: String,
    description: String,
    image: String,
    attributes: [{ trait_type: String, value: mongoose.Schema.Types.Mixed }]
  },

  isActive: { type: Boolean, default: true, index: true },
  lastSyncedAt: { type: Date, default: Date.now }
}, { timestamps: true });

nftSchema.index({ tokenId: 1, contractAddress: 1 }, { unique: true });
nftSchema.index({ owner: 1, isActive: 1 });

// ============================================================================
// 4. TRANSACTION MODEL - Indexer Service
// ============================================================================
const transactionSchema = new mongoose.Schema({
  transactionHash: { type: String, required: true, unique: true, lowercase: true, index: true },
  type: {
    type: String,
    required: true,
    enum: ['mint', 'transfer', 'approval', 'list', 'buy', 'cancel'],
    index: true
  },
  contractAddress: { type: String, required: true, lowercase: true, index: true },
  from: { type: String, lowercase: true, index: true },
  to: { type: String, lowercase: true, index: true },
  tokenId: { type: Number, index: true, sparse: true },
  value: { type: String, default: '0' },
  
  gasUsed: Number,
  gasPrice: String,
  
  blockNumber: { type: Number, required: true, index: true },
  blockTimestamp: { type: Date, required: true, index: true },
  
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'confirmed', index: true },
  
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
  nftId: { type: mongoose.Schema.Types.ObjectId, ref: 'NFT', index: true },
  
  createdAt: { type: Date, default: Date.now, index: true }
});

transactionSchema.index({ type: 1, blockTimestamp: -1 });
transactionSchema.index({ tokenId: 1, blockTimestamp: -1 });

// ============================================================================
// 5. IPFS METADATA MODEL - IPFS Service
// ============================================================================
const ipfsMetadataSchema = new mongoose.Schema({
  cid: { type: String, required: true, unique: true, index: true },
  type: { type: String, required: true, enum: ['metadata', 'image', 'document'], index: true },
  content: { type: mongoose.Schema.Types.Mixed, required: true },
  
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
  
  pinataInfo: {
    pinataId: String,
    pinStatus: String
  },
  
  gatewayUrls: {
    pinata: String,
    ipfs: String
  },
  
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// ============================================================================
// 6. ANALYTICS MODEL - Query Service
// ============================================================================
const analyticsSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['property_view', 'property_favorite', 'property_share', 'user_login', 'nft_mint'],
    index: true
  },
  
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  walletAddress: { type: String, lowercase: true, index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
  
  timestamp: { type: Date, default: Date.now, index: true },
  date: { type: Date, index: true },
  
  ipAddress: String,
  userAgent: String
}, { timestamps: false });

analyticsSchema.index({ type: 1, timestamp: -1 });
analyticsSchema.index({ propertyId: 1, type: 1, timestamp: -1 });

// ============================================================================
// EXPORT MODELS
// ============================================================================
module.exports = {
  User: mongoose.model('User', userSchema),
  Property: mongoose.model('Property', propertySchema),
  NFT: mongoose.model('NFT', nftSchema),
  Transaction: mongoose.model('Transaction', transactionSchema),
  IPFSMetadata: mongoose.model('IPFSMetadata', ipfsMetadataSchema),
  Analytics: mongoose.model('Analytics', analyticsSchema)
};
