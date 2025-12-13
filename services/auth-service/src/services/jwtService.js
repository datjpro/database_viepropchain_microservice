/**
 * ========================================================================
 * JWT SERVICE - JWT token generation and verification
 * ========================================================================
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_SECRET, JWT_EXPIRY } = require("../config/jwt");

class JWTService {
  /**
   * Generate JWT token
   */
  generateToken(user) {
    try {
      const token = jwt.sign(
        {
          userId: user._id.toString(),
          email: user.email,
          walletAddress: user.walletAddress || null,
          role: user.role,
          emailVerified: user.emailVerified,
          authMethods: user.authMethods.map((m) => m.type),
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      return token;
    } catch (error) {
      throw new Error(`Failed to generate token: ${error.message}`);
    }
  }

  /**
   * Save token to user
   */
  async saveToken(user, token) {
    try {
      user.sessionToken = token;
      user.tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await user.save();

      return user;
    } catch (error) {
      throw new Error(`Failed to save token: ${error.message}`);
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token) {
    try {
      const decoded = this.verifyToken(token);

      // Find user by userId (primary) or walletAddress (fallback for old tokens)
      let user;
      if (decoded.userId) {
        user = await User.findById(decoded.userId);
      } else if (decoded.walletAddress) {
        user = await User.findOne({ walletAddress: decoded.walletAddress });
      }

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }
}

module.exports = new JWTService();
