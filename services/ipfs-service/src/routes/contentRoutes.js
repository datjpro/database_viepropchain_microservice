/**
 * ========================================================================
 * CONTENT ROUTES
 * ========================================================================
 */

const express = require("express");
const uploadController = require("../controllers/uploadController");

const router = express.Router();

// Get content by CID
router.get("/:cid", uploadController.getContent);

module.exports = router;
