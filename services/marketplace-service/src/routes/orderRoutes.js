/**
 * ========================================================================
 * ORDER ROUTES - Hybrid transaction endpoints
 * ========================================================================
 */

const express = require("express");
const orderController = require("../controllers/orderController");

const router = express.Router();

// Create orders
router.post("/rent", orderController.createRentOrder);
router.post("/buy", orderController.createBuyOrder);

// Finalize sale after frontend completes blockchain transaction
router.post("/finalize-sale", orderController.finalizeSale);

// Payment management
router.post("/:orderId/confirm-payment", orderController.confirmPayment);

// Order queries
router.get("/:orderId", orderController.getOrder);
router.get("/buyer/:userId", orderController.getOrdersByBuyer);
router.get("/pending/all", orderController.getPendingOrders);

// Blockchain sync
router.post("/:orderId/retry-sync", orderController.retrySync);

module.exports = router;
