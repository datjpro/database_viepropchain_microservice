const express = require("express");
const router = express.Router();
const keyController = require("../controllers/keyController");
const { verifyToken } = require("../middleware/auth");

// Apply auth middleware
router.use(verifyToken);

// Register public key
router.post("/register", keyController.registerPublicKey);

// Get my active key
router.get("/me", keyController.getMyKey);

// Get public key for a user
router.get("/:userId", keyController.getPublicKey);

// Get public keys for multiple users (batch)
router.post("/batch", keyController.getBatchPublicKeys);

// Revoke current key
router.post("/revoke", keyController.revokeKey);

module.exports = router;
