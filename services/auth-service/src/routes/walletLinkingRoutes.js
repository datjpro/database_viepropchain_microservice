/**
 * ========================================================================
 * WALLET LINKING ROUTES
 * ========================================================================
 */

const express = require("express");
const router = express.Router();
const walletLinkingController = require("../controllers/walletLinkingController");
const verifyToken = require("../middleware/verifyToken");

/**
 * @route   POST /auth/link-wallet/message
 * @desc    Get message to sign for wallet linking
 * @access  Private (requires JWT token from Gmail login)
 */
router.post(
  "/link-wallet/message",
  verifyToken,
  walletLinkingController.getLinkMessage
);

/**
 * @route   POST /auth/link-wallet
 * @desc    Link MetaMask wallet to user account
 * @access  Private (requires JWT token from Gmail login)
 */
router.post("/link-wallet", verifyToken, walletLinkingController.linkWallet);

/**
 * @route   POST /auth/unlink-wallet
 * @desc    Unlink wallet from user account
 * @access  Private (requires JWT token)
 */
router.post(
  "/unlink-wallet",
  verifyToken,
  walletLinkingController.unlinkWallet
);

module.exports = router;
