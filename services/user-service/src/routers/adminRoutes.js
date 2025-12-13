/**
 * ========================================================================
 * ADMIN ROUTES - User Management
 * ========================================================================
 */

const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { verifyToken, verifyAdmin } = require("../middleware/auth");

// All routes require authentication and admin role
router.use(verifyToken);
router.use(verifyAdmin);

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get("/users", adminController.getAllUsers);

/**
 * GET /api/admin/users/:userId
 * Get user by ID
 */
router.get("/users/:userId", adminController.getUserById);

/**
 * PUT /api/admin/users/:userId/role
 * Update user role
 */
router.put("/users/:userId/role", adminController.updateUserRole);

/**
 * DELETE /api/admin/users/:userId
 * Deactivate user
 */
router.delete("/users/:userId", adminController.deleteUser);

/**
 * POST /api/admin/users/:userId/reactivate
 * Reactivate user
 */
router.post("/users/:userId/reactivate", adminController.reactivateUser);

/**
 * GET /api/admin/statistics
 * Get admin statistics
 */
router.get("/statistics", adminController.getStatistics);

/**
 * POST /api/admin/fix-nft-ownership
 * Manually sync NFT ownership from blockchain to database (Admin only)
 * Body: { tokenId, newOwner }
 */
router.post("/fix-nft-ownership", adminController.fixNftOwnership);

module.exports = router;
