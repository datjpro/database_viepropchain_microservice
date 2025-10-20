/**
 * ========================================================================
 * IPFS SERVICE - Port 4002
 * ========================================================================
 * Nhiệm vụ: Upload files lên IPFS/Pinata, trả về CID
 * - Upload images
 * - Upload documents  
 * - Upload metadata JSON
 * ========================================================================
 */

const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
require('dotenv').config();

const { IPFSMetadata } = require('../../shared/models');

const app = express();
const PORT = process.env.PORT || 4002;

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
// PINATA CONFIG
// ============================================================================
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;
const PINATA_JWT = process.env.PINATA_JWT;

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

// ============================================================================
// MULTER CONFIG (for file uploads)
// ============================================================================
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'IPFS Service',
    port: PORT,
    pinata: PINATA_JWT ? 'configured' : 'not configured',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ============================================================================
// UPLOAD IMAGE TO IPFS
// ============================================================================
app.post('/upload/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    const { propertyId } = req.body;
    
    console.log(`🔄 Uploading image to IPFS...`);
    console.log(`   Filename: ${req.file.originalname}`);
    console.log(`   Size: ${req.file.size} bytes`);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    
    const metadata = JSON.stringify({
      name: req.file.originalname,
      keyvalues: {
        type: 'image',
        propertyId: propertyId || 'unknown'
      }
    });
    formData.append('pinataMetadata', metadata);
    
    // Upload to Pinata
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    );
    
    const cid = response.data.IpfsHash;
    const url = `${PINATA_GATEWAY}/${cid}`;
    
    console.log(`   ✅ Uploaded to IPFS: ${cid}`);
    
    // Save to database
    const ipfsMetadata = new IPFSMetadata({
      cid,
      type: 'image',
      content: {
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      },
      propertyId: propertyId || null,
      pinataInfo: {
        pinataId: response.data.PinataId,
        pinStatus: 'pinned',
        pinSize: response.data.PinSize
      },
      gatewayUrls: {
        pinata: url,
        ipfs: `ipfs://${cid}`
      }
    });
    
    await ipfsMetadata.save();
    
    res.json({
      success: true,
      message: 'Image uploaded to IPFS',
      data: {
        cid,
        url,
        ipfsUrl: `ipfs://${cid}`,
        filename: req.file.originalname,
        size: req.file.size
      }
    });
    
  } catch (error) {
    console.error('❌ Upload image error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image',
      message: error.message
    });
  }
});

// ============================================================================
// UPLOAD DOCUMENT TO IPFS
// ============================================================================
app.post('/upload/document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    const { propertyId, documentType, documentName } = req.body;
    
    console.log(`🔄 Uploading document to IPFS...`);
    console.log(`   Filename: ${req.file.originalname}`);
    
    const formData = new FormData();
    formData.append('file', req.file.buffer, req.file.originalname);
    
    const metadata = JSON.stringify({
      name: documentName || req.file.originalname,
      keyvalues: {
        type: 'document',
        documentType: documentType || 'legal',
        propertyId: propertyId || 'unknown'
      }
    });
    formData.append('pinataMetadata', metadata);
    
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    );
    
    const cid = response.data.IpfsHash;
    const url = `${PINATA_GATEWAY}/${cid}`;
    
    console.log(`   ✅ Uploaded to IPFS: ${cid}`);
    
    // Save to database
    const ipfsMetadata = new IPFSMetadata({
      cid,
      type: 'document',
      content: {
        filename: req.file.originalname,
        documentName: documentName || req.file.originalname,
        documentType: documentType || 'legal',
        size: req.file.size,
        mimeType: req.file.mimetype
      },
      propertyId: propertyId || null,
      pinataInfo: {
        pinataId: response.data.PinataId,
        pinStatus: 'pinned'
      },
      gatewayUrls: {
        pinata: url,
        ipfs: `ipfs://${cid}`
      }
    });
    
    await ipfsMetadata.save();
    
    res.json({
      success: true,
      message: 'Document uploaded to IPFS',
      data: {
        cid,
        url,
        ipfsUrl: `ipfs://${cid}`,
        filename: req.file.originalname,
        documentName: documentName || req.file.originalname,
        documentType: documentType || 'legal'
      }
    });
    
  } catch (error) {
    console.error('❌ Upload document error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to upload document',
      message: error.message
    });
  }
});

// ============================================================================
// UPLOAD METADATA JSON TO IPFS
// ============================================================================
app.post('/upload/metadata', async (req, res) => {
  try {
    const metadata = req.body;
    
    if (!metadata || Object.keys(metadata).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No metadata provided'
      });
    }
    
    console.log(`🔄 Uploading metadata to IPFS...`);
    console.log(`   Name: ${metadata.name}`);
    
    // Upload JSON to Pinata
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PINATA_JWT}`
        }
      }
    );
    
    const cid = response.data.IpfsHash;
    const url = `${PINATA_GATEWAY}/${cid}`;
    
    console.log(`   ✅ Metadata uploaded: ${cid}`);
    
    // Save to database
    const ipfsMetadata = new IPFSMetadata({
      cid,
      type: 'metadata',
      content: metadata,
      propertyId: metadata.propertyId || null,
      pinataInfo: {
        pinataId: response.data.PinataId,
        pinStatus: 'pinned'
      },
      gatewayUrls: {
        pinata: url,
        ipfs: `ipfs://${cid}`
      }
    });
    
    await ipfsMetadata.save();
    
    res.json({
      success: true,
      message: 'Metadata uploaded to IPFS',
      data: {
        cid,
        url,
        ipfsUrl: `ipfs://${cid}`,
        metadata
      }
    });
    
  } catch (error) {
    console.error('❌ Upload metadata error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to upload metadata',
      message: error.message
    });
  }
});

// ============================================================================
// GET CONTENT BY CID
// ============================================================================
app.get('/content/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    
    // Check database first
    let ipfsMetadata = await IPFSMetadata.findOne({ cid });
    
    if (ipfsMetadata) {
      // Update access count
      ipfsMetadata.accessCount = (ipfsMetadata.accessCount || 0) + 1;
      ipfsMetadata.lastAccessedAt = new Date();
      await ipfsMetadata.save();
      
      return res.json({
        success: true,
        data: {
          cid,
          type: ipfsMetadata.type,
          content: ipfsMetadata.content,
          gatewayUrls: ipfsMetadata.gatewayUrls
        }
      });
    }
    
    // If not in database, fetch from IPFS
    const url = `${PINATA_GATEWAY}/${cid}`;
    const response = await axios.get(url);
    
    res.json({
      success: true,
      data: {
        cid,
        content: response.data,
        url
      }
    });
    
  } catch (error) {
    console.error('❌ Get content error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get content',
      message: error.message
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      IPFS SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  Pinata: ${PINATA_JWT ? 'Configured' : 'Not configured'}                                          ║
║  MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}                                           ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /upload/image      - Upload image                   ║
║  ├─ POST /upload/document   - Upload document                ║
║  ├─ POST /upload/metadata   - Upload metadata JSON           ║
║  └─ GET  /content/:cid      - Get content by CID             ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
