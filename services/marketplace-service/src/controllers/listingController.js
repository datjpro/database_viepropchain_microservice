/**
 * ========================================================================
 * LISTING CONTROLLER - Handle listing operations
 * ========================================================================
 */

const { Listing, Offer } = require("../models");
const axios = require("axios");

const QUERY_SERVICE_URL =
  process.env.QUERY_SERVICE_URL || "http://localhost:4005";
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:4006";

/**
 * Create new listing
 */
exports.createListing = async (req, res) => {
  try {
    const {
      tokenId,
      contractAddress,
      propertyId,
      price,
      description,
      expiresAt,
    } = req.body;
    const userId = req.user.userId;
    const walletAddress = req.user.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Wallet not linked",
        message: "Please link your wallet first to create a listing",
      });
    }

    // Get property details from Query Service
    let propertyData;
    try {
      const propertyResponse = await axios.get(
        `${QUERY_SERVICE_URL}/properties/${propertyId}`
      );
      propertyData = propertyResponse.data.data;
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    // Check if listing already exists for this tokenId
    const existingListing = await Listing.findOne({
      tokenId,
      status: "active",
    });

    if (existingListing) {
      return res.status(400).json({
        success: false,
        error: "NFT already listed",
        message: "This NFT is already listed in the marketplace",
      });
    }

    // Create listing
    const listing = new Listing({
      tokenId,
      contractAddress,
      propertyId,
      propertyName: propertyData.name,
      propertyType: propertyData.propertyType,
      propertyAddress: {
        city: propertyData.location?.city,
        district: propertyData.location?.district,
        ward: propertyData.location?.ward,
      },
      propertyArea: propertyData.details?.area?.value,
      propertyImages: propertyData.media?.images?.map((img) => img.url) || [],
      seller: {
        userId,
        walletAddress,
        email: req.user.email,
        name: req.user.name,
      },
      price: {
        amount: price.toString(),
        currency: "ETH",
      },
      description,
      expiresAt: expiresAt || undefined,
    });

    await listing.save();

    console.log(`✅ Listing created: Token #${tokenId}`);

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: listing,
    });
  } catch (error) {
    console.error("❌ Create listing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create listing",
      message: error.message,
    });
  }
};

/**
 * Get all active listings with filters
 */
exports.getListings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      propertyType,
      city,
      minPrice,
      maxPrice,
      sortBy = "listedAt",
      sortOrder = "desc",
    } = req.query;

    const query = { status: "active" };

    if (propertyType) query.propertyType = propertyType;
    if (city) query["propertyAddress.city"] = city;

    if (minPrice || maxPrice) {
      query["price.amount"] = {};
      if (minPrice) query["price.amount"].$gte = minPrice.toString();
      if (maxPrice) query["price.amount"].$lte = maxPrice.toString();
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [listings, total] = await Promise.all([
      Listing.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Listing.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Get listings error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get listings",
    });
  }
};

/**
 * Get listing by ID
 */
exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).lean();

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found",
      });
    }

    res.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    console.error("❌ Get listing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get listing",
    });
  }
};

/**
 * Get listing by token ID
 */
exports.getListingByTokenId = async (req, res) => {
  try {
    const listing = await Listing.findOne({
      tokenId: req.params.tokenId,
      status: "active",
    }).lean();

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found",
      });
    }

    res.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    console.error("❌ Get listing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get listing",
    });
  }
};

/**
 * Update listing
 */
exports.updateListing = async (req, res) => {
  try {
    const { price, description, expiresAt } = req.body;
    const userId = req.user.userId;

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found",
      });
    }

    // Check ownership
    if (listing.seller.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
        message: "You can only update your own listings",
      });
    }

    if (listing.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Cannot update inactive listing",
      });
    }

    // Update fields
    if (price) listing.price.amount = price.toString();
    if (description) listing.description = description;
    if (expiresAt) listing.expiresAt = expiresAt;

    await listing.save();

    res.json({
      success: true,
      message: "Listing updated successfully",
      data: listing,
    });
  } catch (error) {
    console.error("❌ Update listing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update listing",
    });
  }
};

/**
 * Cancel listing
 */
exports.cancelListing = async (req, res) => {
  try {
    const userId = req.user.userId;

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found",
      });
    }

    // Check ownership
    if (listing.seller.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
        message: "You can only cancel your own listings",
      });
    }

    if (listing.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Listing is not active",
      });
    }

    listing.status = "cancelled";
    listing.cancelledAt = new Date();
    await listing.save();

    console.log(`✅ Listing cancelled: ${listing._id}`);

    res.json({
      success: true,
      message: "Listing cancelled successfully",
    });
  } catch (error) {
    console.error("❌ Cancel listing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel listing",
    });
  }
};

/**
 * Get my listings
 */
exports.getMyListings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    const query = { "seller.userId": userId };
    if (status) query.status = status;

    const listings = await Listing.find(query).sort({ listedAt: -1 }).lean();

    res.json({
      success: true,
      data: listings,
    });
  } catch (error) {
    console.error("❌ Get my listings error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get listings",
    });
  }
};

/**
 * Track listing view
 */
exports.trackView = async (req, res) => {
  try {
    await Listing.findByIdAndUpdate(req.params.id, {
      $inc: { views: 1 },
    });

    res.json({
      success: true,
      message: "View tracked",
    });
  } catch (error) {
    console.error("❌ Track view error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track view",
    });
  }
};
