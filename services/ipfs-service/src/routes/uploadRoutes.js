/**
 * ========================================================================
 * UPLOAD ROUTES
 * ========================================================================
 */

const express = require("express");
const multer = require("multer");
const uploadController = require("../controllers/uploadController");

const router = express.Router();

// Multer config (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload image
router.post("/image", upload.single("file"), uploadController.uploadImage);

// Upload document
router.post("/document", upload.single("file"), uploadController.uploadDocument);

// Upload metadata JSON
router.post("/metadata", uploadController.uploadMetadata);

module.exports = router;
