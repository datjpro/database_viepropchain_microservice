/**
 * ========================================================================
 * AUTH ROUTES
 * ========================================================================
 */

const express = require("express");
const authController = require("../controllers/authController");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// Public routes
router.post("/get-nonce", authController.getNonce);
router.post("/verify-signature", authController.verifySignature);

// Protected routes
router.get("/profile", verifyToken, authController.getProfile);
router.put("/profile", verifyToken, authController.updateProfile);

module.exports = router;
