/**
 * ========================================================================
 * ADMIN SERVICE - Port 4003
 * ========================================================================
 * Nhiệm vụ: Điều phối tạo property và mint NFT
 * - CRUD properties
 * - Build metadata NFT
 * - Gọi IPFS Service để upload
 * - Gọi Blockchain Service để mint
 * ========================================================================
 */

const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

const { Property } = require('../../shared/models');

const app = express();
const PORT = process.env.PORT || 4003;

// Services URLs
const IPFS_SERVICE_URL = process.env.IPFS_SERVICE_URL || 'http://localhost:4002';
const BLOCKCHAIN_SERVICE_URL = process.env.BLOCKCHAIN_SERVICE_URL || 'http://localhost:4004';

// ============================================================================
// MONGODB CONNECTION
// ============================================================================
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', async (req, res) => {
  try {
    // Check other services
    let ipfsStatus = 'unknown';
    let blockchainStatus = 'unknown';
    
    try {
      const ipfsRes = await axios.get(`${IPFS_SERVICE_URL}/health`, { timeout: 2000 });
      ipfsStatus = ipfsRes.data.success ? 'connected' : 'error';
    } catch (e) {
      ipfsStatus = 'disconnected';
    }
    
    try {
      const blockchainRes = await axios.get(`${BLOCKCHAIN_SERVICE_URL}/health`, { timeout: 2000 });
      blockchainStatus = blockchainRes.data.success ? 'connected' : 'error';
    } catch (e) {
      blockchainStatus = 'disconnected';
    }
    
    res.json({
      success: true,
      service: 'Admin Service',
      port: PORT,
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      dependencies: {
        ipfsService: ipfsStatus,
        blockchainService: blockchainStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// ============================================================================
// CREATE PROPERTY
// ============================================================================
app.post('/properties', async (req, res) => {
  try {
    const propertyData = req.body;
    
    // Validate required fields
    if (!propertyData.name || !propertyData.propertyType || !propertyData.price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, propertyType, price'
      });
    }
    
    console.log(`🔄 Creating property: ${propertyData.name}`);
    
    // Create property
    const property = new Property({
      ...propertyData,
      status: 'draft',
      createdAt: new Date()
    });
    
    await property.save();
    
    console.log(`   ✅ Property created: ${property._id}`);
    
    res.json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
    
  } catch (error) {
    console.error('❌ Create property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create property',
      message: error.message
    });
  }
});

// ============================================================================
// GET ALL PROPERTIES
// ============================================================================
app.get('/properties', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      propertyType,
      status,
      city,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build query
    const query = {};
    
    if (propertyType) query.propertyType = propertyType;
    if (status) query.status = status;
    if (city) query['location.city'] = city;
    if (minPrice || maxPrice) {
      query['price.amount'] = {};
      if (minPrice) query['price.amount'].$gte = Number(minPrice);
      if (maxPrice) query['price.amount'].$lte = Number(maxPrice);
    }
    
    // Execute query
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    
    const [properties, total] = await Promise.all([
      Property.find(query)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Property.countDocuments(query)
    ]);
    
    res.json({
      success: true,
      data: properties,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Get properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get properties'
    });
  }
});

// ============================================================================
// GET PROPERTY BY ID
// ============================================================================
app.get('/properties/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    res.json({
      success: true,
      data: property
    });
    
  } catch (error) {
    console.error('❌ Get property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get property'
    });
  }
});

// ============================================================================
// UPDATE PROPERTY
// ============================================================================
app.put('/properties/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    console.log(`✅ Property updated: ${property._id}`);
    
    res.json({
      success: true,
      message: 'Property updated',
      data: property
    });
    
  } catch (error) {
    console.error('❌ Update property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update property'
    });
  }
});

// ============================================================================
// DELETE PROPERTY
// ============================================================================
app.delete('/properties/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { status: 'archived', archivedAt: new Date() },
      { new: true }
    );
    
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    console.log(`✅ Property archived: ${property._id}`);
    
    res.json({
      success: true,
      message: 'Property archived'
    });
    
  } catch (error) {
    console.error('❌ Delete property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete property'
    });
  }
});

// ============================================================================
// MINT PROPERTY TO NFT (ĐIỀU PHỐI)
// ============================================================================
app.post('/properties/:id/mint', async (req, res) => {
  try {
    const { recipient } = req.body;
    
    if (!recipient) {
      return res.status(400).json({
        success: false,
        error: 'Missing recipient address'
      });
    }
    
    // 1. Get property
    const property = await Property.findById(req.params.id);
    
    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    if (property.nft.isMinted) {
      return res.status(400).json({
        success: false,
        error: 'Property already minted'
      });
    }
    
    console.log(`🔄 Minting property: ${property.name}`);
    
    // 2. Build metadata
    const metadata = {
      name: property.name,
      description: property.description,
      image: property.imageUrl || property.media.images[0]?.url,
      external_url: `https://viepropchain.com/properties/${property._id}`,
      attributes: [
        { trait_type: 'Property Type', value: property.propertyType },
        { trait_type: 'City', value: property.location.city },
        { trait_type: 'District', value: property.location.district || 'N/A' },
        { trait_type: 'Area', value: `${property.details.area?.value || 0} ${property.details.area?.unit || 'm2'}` },
        { trait_type: 'Bedrooms', value: property.details.bedrooms?.toString() || '0' },
        { trait_type: 'Legal Status', value: property.details.legalStatus || 'Unknown' }
      ].filter(attr => attr.value && attr.value !== 'N/A'),
      legal_documents: property.media.documents?.map(doc => ({
        name: doc.name,
        url: doc.url
      })) || [],
      propertyId: property._id.toString()
    };
    
    // 3. Upload metadata to IPFS
    console.log(`   🔄 Uploading metadata to IPFS...`);
    const ipfsResponse = await axios.post(
      `${IPFS_SERVICE_URL}/upload/metadata`,
      metadata
    );
    
    if (!ipfsResponse.data.success) {
      throw new Error('Failed to upload metadata to IPFS');
    }
    
    const metadataCID = ipfsResponse.data.data.cid;
    const tokenURI = ipfsResponse.data.data.url;
    
    console.log(`   ✅ Metadata uploaded: ${metadataCID}`);
    
    // 4. Mint NFT on blockchain
    console.log(`   🔄 Minting NFT on blockchain...`);
    const mintResponse = await axios.post(
      `${BLOCKCHAIN_SERVICE_URL}/mint`,
      {
        recipient,
        tokenURI
      }
    );
    
    if (!mintResponse.data.success) {
      throw new Error('Failed to mint NFT');
    }
    
    const { tokenId, transactionHash, blockNumber, mintedBy } = mintResponse.data.data;
    
    console.log(`   ✅ NFT minted: Token ID ${tokenId}`);
    
    // 5. Update property
    property.nft = {
      isMinted: true,
      tokenId,
      contractAddress: mintResponse.data.data.contractAddress,
      currentOwner: recipient.toLowerCase(),
      metadataCID,
      mintedAt: new Date(),
      mintedBy,
      transactionHash
    };
    
    property.status = 'minted';
    property.imageUrl = metadata.image;
    
    // Cache attributes
    property.details.cachedAttributes = metadata.attributes;
    
    await property.save();
    
    console.log(`✅ Property minted successfully: ${property._id}`);
    
    res.json({
      success: true,
      message: 'Property minted as NFT successfully',
      data: {
        propertyId: property._id,
        tokenId,
        contractAddress: mintResponse.data.data.contractAddress,
        owner: recipient,
        transactionHash,
        blockNumber,
        tokenURI,
        metadataCID
      }
    });
    
  } catch (error) {
    console.error('❌ Mint property error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to mint property',
      message: error.response?.data?.message || error.message
    });
  }
});

// ============================================================================
// GET STATISTICS
// ============================================================================
app.get('/properties/stats/overview', async (req, res) => {
  try {
    const [
      totalProperties,
      totalMinted,
      byType,
      byStatus
    ] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ 'nft.isMinted': true }),
      Property.aggregate([
        { $group: { _id: '$propertyType', count: { $sum: 1 } } }
      ]),
      Property.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        totalProperties,
        totalMinted,
        byType,
        byStatus
      }
    });
    
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     ADMIN SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}                                           ║
║                                                              ║
║  Dependencies:                                               ║
║  ├─ IPFS Service: ${IPFS_SERVICE_URL}                ║
║  └─ Blockchain Service: ${BLOCKCHAIN_SERVICE_URL}    ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /properties            - Create property            ║
║  ├─ GET  /properties            - Get all properties         ║
║  ├─ GET  /properties/:id        - Get property               ║
║  ├─ PUT  /properties/:id        - Update property            ║
║  ├─ DELETE /properties/:id      - Archive property           ║
║  ├─ POST /properties/:id/mint   - Mint property to NFT       ║
║  └─ GET  /properties/stats/overview - Get statistics         ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
