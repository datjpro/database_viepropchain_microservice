/**
 * ========================================================================
 * WALLET LINKING CONTROLLER
 * ========================================================================
 * Allow users to link/unlink MetaMask wallet to their Gmail account
 * ========================================================================
 */

const { ethers } = require("ethers");
const User = require("../models/User");

class WalletLinkingController {
  /**
   * Link wallet to user account
   */
  async linkWallet(req, res) {
    try {
      const { walletAddress, signature } = req.body;
      const tokenData = req.user; // From verifyToken middleware (decoded JWT)

      if (!walletAddress || !signature) {
        return res.status(400).json({
          success: false,
          error: "Missing walletAddress or signature",
        });
      }

      // Validate wallet address format
      if (!ethers.isAddress(walletAddress)) {
        return res.status(400).json({
          success: false,
          error: "Invalid wallet address",
        });
      }

      // Get user from database (Mongoose document)
      const user = await User.findOne({
        $or: [{ _id: tokenData.userId }, { email: tokenData.email }],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Check if wallet is already linked to another user
      const existingUser = await User.findOne({
        walletAddress: walletAddress.toLowerCase(),
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Wallet already linked to another account",
          message: "This wallet is already connected to a different account",
        });
      }

      // Verify signature
      const message = `Link wallet ${walletAddress.toLowerCase()} to ViePropChain account ${
        user.email
      }`;

      let recoveredAddress;
      try {
        recoveredAddress = ethers.verifyMessage(message, signature);
      } catch (error) {
        console.error("❌ Signature verification failed:", error);
        return res.status(401).json({
          success: false,
          error: "Invalid signature",
          message: "Signature verification failed",
        });
      }

      // Check if recovered address matches provided address
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({
          success: false,
          error: "Signature mismatch",
          message: "Signature does not match wallet address",
        });
      }

      console.log(`🔗 Linking wallet ${walletAddress} to user ${user.email}`);

      // Update user with wallet
      user.walletAddress = walletAddress.toLowerCase();
      user.walletLinkedAt = new Date();

      // Add wallet auth method if not exists
      if (!user.authMethods.some((m) => m.type === "wallet")) {
        user.authMethods.push({ type: "wallet", linkedAt: new Date() });
      }

      await user.save();

      console.log(`✅ Wallet linked successfully`);

      // 🔥 UPDATE USER PROFILE SERVICE with wallet address
      try {
        const axios = require("axios");
        const USER_SERVICE_URL =
          process.env.USER_SERVICE_URL || "http://localhost:4006";
        await axios.put(
          `${USER_SERVICE_URL}/api/profiles/user/${user._id}/wallet`,
          { walletAddress: user.walletAddress },
          { timeout: 3000 }
        );
        console.log(
          `✅ Updated wallet address in User Profile Service for user ${user._id}`
        );
      } catch (error) {
        console.warn(
          `⚠️ Failed to update User Profile Service (will auto-sync later):`,
          error.message
        );
      }

      // 🔥 GENERATE NEW JWT TOKEN with wallet info
      const jwt = require("jsonwebtoken");
      const JWT_SECRET =
        process.env.JWT_SECRET || "viepropchain-secret-key-2025";

      const newToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          walletAddress: user.walletAddress,
          role: user.role || "user",
          emailVerified: user.emailVerified,
          authMethods: user.authMethods.map((m) => m.type),
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        message: "Wallet linked successfully",
        token: newToken, // 🔥 NEW TOKEN WITH WALLET
        user: {
          id: user._id,
          email: user.email,
          walletAddress: user.walletAddress,
          walletLinkedAt: user.walletLinkedAt,
          authMethods: user.authMethods,
        },
      });
    } catch (error) {
      console.error("❌ Link wallet error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to link wallet",
        message: error.message,
      });
    }
  }

  /**
   * Unlink wallet from user account
   */
  async unlinkWallet(req, res) {
    try {
      const tokenData = req.user; // From verifyToken middleware (decoded JWT)

      // Get user from database (Mongoose document)
      const user = await User.findOne({
        $or: [{ _id: tokenData.userId }, { email: tokenData.email }],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      if (!user.walletAddress) {
        return res.status(400).json({
          success: false,
          error: "No wallet linked",
          message: "This account does not have a linked wallet",
        });
      }

      console.log(
        `🔓 Unlinking wallet ${user.walletAddress} from user ${user.email}`
      );

      const oldWallet = user.walletAddress;

      // Remove wallet
      user.walletAddress = null;
      user.walletLinkedAt = null;

      // Remove wallet auth method
      user.authMethods = user.authMethods.filter((m) => m.type !== "wallet");

      await user.save();

      console.log(`✅ Wallet unlinked successfully`);

      res.json({
        success: true,
        message: "Wallet unlinked successfully",
        unlinkedWallet: oldWallet,
        user: {
          id: user._id,
          email: user.email,
          walletAddress: null,
          authMethods: user.authMethods,
        },
      });
    } catch (error) {
      console.error("❌ Unlink wallet error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to unlink wallet",
        message: error.message,
      });
    }
  }

  /**
   * Get message to sign for wallet linking
   */
  async getLinkMessage(req, res) {
    try {
      const { walletAddress } = req.body;
      const tokenData = req.user; // From verifyToken middleware (decoded JWT)

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          error: "Missing walletAddress",
        });
      }

      if (!ethers.isAddress(walletAddress)) {
        return res.status(400).json({
          success: false,
          error: "Invalid wallet address",
        });
      }

      // Get user email from token data
      const userEmail = tokenData.email;

      const message = `Link wallet ${walletAddress.toLowerCase()} to ViePropChain account ${userEmail}`;

      res.json({
        success: true,
        message,
        walletAddress: walletAddress.toLowerCase(),
        email: userEmail,
      });
    } catch (error) {
      console.error("❌ Get link message error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate message",
        message: error.message,
      });
    }
  }
}

module.exports = new WalletLinkingController();
