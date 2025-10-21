/**
 * ========================================================================
 * STATS ROUTES
 * ========================================================================
 */

const express = require("express");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

router.get("/stats/overview", analyticsController.getOverviewStats);
router.get("/stats/price-trends", analyticsController.getPriceTrends);

module.exports = router;
