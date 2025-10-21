/**
 * ========================================================================
 * AUTH SERVICE - Sign-in with Ethereum logic
 * ========================================================================
 */

const { ethers } = require("ethers");
const { User } = require("../../../../shared/models");

class AuthService {
  /**
   * Get or create nonce for wallet
   */
  async getNonce(walletAddress) {
    try {
      if (!ethers.isAddress(walletAddress)) {
        throw new Error("Invalid wallet address");
      }

      const address = walletAddress.toLowerCase();

      // Find or create user
      let user = await User.findOne({ walletAddress: address });

      if (!user) {
        // Create new user
        user = new User({
          walletAddress: address,
          nonce: Math.floor(Math.random() * 1000000).toString(),
        });
        await user.save();
        console.log(`✅ Created new user: ${address}`);
      } else {
        // Generate new nonce
        user.nonce = Math.floor(Math.random() * 1000000).toString();
        await user.save();
      }

      return {
        nonce: user.nonce,
        walletAddress: address,
        message: `Please sign this message to login: ${user.nonce}`,
      };
    } catch (error) {
      throw new Error(`Failed to get nonce: ${error.message}`);
    }
  }

  /**
   * Verify signature
   */
  async verifySignature(walletAddress, signature) {
    try {
      const address = walletAddress.toLowerCase();

      // Get user and nonce
      const user = await User.findOne({ walletAddress: address });

      if (!user) {
        throw new Error("User not found. Please get nonce first.");
      }

      // Verify signature
      const message = `Please sign this message to login: ${user.nonce}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== address) {
        throw new Error("Invalid signature");
      }

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      console.log(`✅ User signature verified: ${address}`);

      return user;
    } catch (error) {
      throw new Error(`Signature verification failed: ${error.message}`);
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(walletAddress) {
    try {
      const user = await User.findOne({
        walletAddress: walletAddress.toLowerCase(),
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        walletAddress: user.walletAddress,
        role: user.role,
        profile: user.profile,
        favorites: user.favorites,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      };
    } catch (error) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(walletAddress, profileData) {
    try {
      const { name, email, phone, avatar, bio } = profileData;

      const user = await User.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $set: {
            "profile.name": name,
            "profile.email": email,
            "profile.phone": phone,
            "profile.avatar": avatar,
            "profile.bio": bio,
          },
        },
        { new: true }
      );

      if (!user) {
        throw new Error("User not found");
      }

      console.log(`✅ Profile updated: ${walletAddress}`);

      return {
        walletAddress: user.walletAddress,
        profile: user.profile,
      };
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }
}

module.exports = new AuthService();
