/**
 * ========================================================================
 * AUTH SERVICE - Port 4001
 * ========================================================================
 * Nhiệm vụ: Sign-in with Ethereum, verify signature, tạo JWT token
 * ========================================================================
 */

const express = require('express');
const mongoose = require('mongoose');
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { User } = require('../../shared/models');

const app = express();
const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

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
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Auth Service',
    port: PORT,
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ============================================================================
// STEP 1: GET NONCE - Lấy nonce để user ký
// ============================================================================
app.post('/get-nonce', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address'
      });
    }

    const address = walletAddress.toLowerCase();

    // Tìm hoặc tạo user
    let user = await User.findOne({ walletAddress: address });

    if (!user) {
      // Tạo user mới
      user = new User({
        walletAddress: address,
        nonce: Math.floor(Math.random() * 1000000).toString()
      });
      await user.save();
      console.log(`✅ Created new user: ${address}`);
    } else {
      // Generate nonce mới
      user.nonce = Math.floor(Math.random() * 1000000).toString();
      await user.save();
    }

    res.json({
      success: true,
      message: 'Please sign this message to login',
      nonce: user.nonce,
      walletAddress: address
    });

  } catch (error) {
    console.error('❌ Get nonce error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nonce',
      message: error.message
    });
  }
});

// ============================================================================
// STEP 2: VERIFY SIGNATURE - Xác thực chữ ký và tạo JWT token
// ============================================================================
app.post('/verify-signature', async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing wallet address or signature'
      });
    }

    const address = walletAddress.toLowerCase();

    // Lấy user và nonce
    const user = await User.findOne({ walletAddress: address });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please get nonce first.'
      });
    }

    // Verify signature
    const message = `Please sign this message to login: ${user.nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== address) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Tạo JWT token
    const token = jwt.sign(
      {
        walletAddress: address,
        userId: user._id,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Lưu token vào database
    user.sessionToken = token;
    user.tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    user.lastLoginAt = new Date();
    await user.save();

    console.log(`✅ User logged in: ${address}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        walletAddress: user.walletAddress,
        role: user.role,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('❌ Verify signature error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify signature',
      message: error.message
    });
  }
});

// ============================================================================
// MIDDLEWARE: VERIFY JWT TOKEN
// ============================================================================
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// ============================================================================
// GET USER PROFILE
// ============================================================================
app.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ walletAddress: req.user.walletAddress });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        walletAddress: user.walletAddress,
        role: user.role,
        profile: user.profile,
        favorites: user.favorites,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get profile'
    });
  }
});

// ============================================================================
// UPDATE USER PROFILE
// ============================================================================
app.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email, phone, avatar, bio } = req.body;

    const user = await User.findOneAndUpdate(
      { walletAddress: req.user.walletAddress },
      {
        $set: {
          'profile.name': name,
          'profile.email': email,
          'profile.phone': phone,
          'profile.avatar': avatar,
          'profile.bio': bio
        }
      },
      { new: true }
    );

    console.log(`✅ Profile updated: ${req.user.walletAddress}`);

    res.json({
      success: true,
      message: 'Profile updated',
      user: {
        walletAddress: user.walletAddress,
        profile: user.profile
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      AUTH SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}                                           ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /get-nonce          - Get nonce for signing        ║
║  ├─ POST /verify-signature   - Verify & login               ║
║  ├─ GET  /profile            - Get user profile             ║
║  └─ PUT  /profile            - Update user profile          ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
