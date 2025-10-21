/**
 * ========================================================================
 * NFT ROUTES
 * ========================================================================
 */

const express = require("express");
const nftQueryController = require("../controllers/nftQueryController");

const router = express.Router();

router.get("/nfts/:tokenId", nftQueryController.getNFTInfo);

module.exports = router;
