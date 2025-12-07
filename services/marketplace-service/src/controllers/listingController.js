/**
 * ========================================================================
 * LISTING CONTROLLER - Handle listing operations
 * ========================================================================
 */

const { Listing, Offer } = require("../models");
const axios = require("axios");

/**
 * Convert price from ETH to wei using precise string manipulation
 * @param {string|number} priceInEth - Price in ETH
 * @returns {string} Price in wei
 */
const ethToWei = (priceInEth) => {
  if (!priceInEth || priceInEth === "0") return "0";

  const ethString = priceInEth.toString().trim();
  const decimalIndex = ethString.indexOf(".");

  if (decimalIndex === -1) {
    // No decimal point, just append 18 zeros
    const result = (
      BigInt(ethString) * BigInt("1000000000000000000")
    ).toString();
    return result;
  }

  // Handle decimal numbers
  const integerPart = ethString.slice(0, decimalIndex);
  const decimalPart = ethString.slice(decimalIndex + 1);

  // Pad or trim decimal part to 18 digits
  const paddedDecimal = decimalPart.padEnd(18, "0").slice(0, 18);

  // Combine and convert to wei
  const fullNumber = integerPart + paddedDecimal;
  const result = BigInt(fullNumber).toString();
  return result;
};

const ADMIN_SERVICE_URL =
  process.env.ADMIN_SERVICE_URL || "http://localhost:4003";
const BLOCKCHAIN_SERVICE_URL =
  process.env.BLOCKCHAIN_SERVICE_URL || "http://localhost:4004";

/**
 * Create new listing (sale or rent)
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
      listingType = "sale", // "sale" or "rent"
      pricePerDay, // for rental
      maxDurationDays, // for rental
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

    // Validate rental fields
    if (listingType === "rent") {
      if (!pricePerDay || !maxDurationDays) {
        return res.status(400).json({
          success: false,
          error: "Missing rental parameters",
          message:
            "pricePerDay and maxDurationDays are required for rental listings",
        });
      }
      if (maxDurationDays < 1 || maxDurationDays > 365) {
        return res.status(400).json({
          success: false,
          error: "Invalid rental duration",
          message: "maxDurationDays must be between 1 and 365",
        });
      }
    }

    // Verify NFT ownership from Blockchain Service
    let nftOwner;
    try {
      console.log(`🔍 Verifying NFT ownership - TokenId: ${tokenId}`);
      console.log(
        `🔗 Blockchain URL: ${BLOCKCHAIN_SERVICE_URL}/nft/${tokenId}`
      );

      const nftResponse = await axios.get(
        `${BLOCKCHAIN_SERVICE_URL}/nft/${tokenId}`
      );

      console.log(`📋 NFT Response:`, nftResponse.data);
      nftOwner = nftResponse.data.data.owner; // Fix: Add .data

      console.log(`👤 NFT Owner: ${nftOwner}`);
      console.log(`💼 User Wallet: ${walletAddress}`);

      if (nftOwner.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: "Not NFT owner",
          message: "You don't own this NFT",
        });
      }
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: "NFT not found",
        message: "Cannot verify NFT ownership",
      });
    }

    // Get property details from Admin Service
    let propertyData;
    try {
      const propertyResponse = await axios.get(
        `${ADMIN_SERVICE_URL}/properties/${propertyId}`
      );
      propertyData = propertyResponse.data.data || propertyResponse.data;
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
        message: "Property information not available",
      });
    }

    // ========================================================================
    // UPSERT LOGIC: Update or Insert Listing
    // ========================================================================

    // Find ANY existing listing for this tokenId (regardless of status)
    const existingListing = await Listing.findOne({
      tokenId,
    }).sort({ listedAt: -1 }); // Get most recent listing

    let listing;
    let isUpdate = false;

    if (existingListing) {
      // ===== UPDATE SCENARIO =====
      // Listing exists (any status) → Update and reactivate it

      console.log(`🔄 Updating existing listing for Token #${tokenId}`);
      console.log(`   Previous status: ${existingListing.status}`);
      console.log(`   Previous type: ${existingListing.listingType}`);

      // Check if owner is the same
      if (
        existingListing.seller.walletAddress.toLowerCase() !==
        walletAddress.toLowerCase()
      ) {
        return res.status(400).json({
          success: false,
          error: "NFT ownership changed",
          message:
            "This NFT is listed by a different owner. Please cancel the old listing first.",
        });
      } // Update listing information
      existingListing.propertyId = propertyId;
      existingListing.propertyName = propertyData.title || propertyData.name;
      existingListing.propertyType = propertyData.propertyType;
      existingListing.propertyAddress = {
        city: propertyData.address?.city,
        district: propertyData.address?.district,
        ward: propertyData.address?.ward,
      };
      existingListing.propertyArea = propertyData.area;
      existingListing.propertyImages = propertyData.images || [];
      existingListing.listingType = listingType;
      existingListing.description = description;
      existingListing.status = "active"; // Reset to active
      existingListing.listedAt = new Date(); // Update listing time

      if (expiresAt) {
        existingListing.expiresAt = expiresAt;
      }

      // Update pricing based on listing type
      if (listingType === "sale") {
        // Price already in wei from frontend
        existingListing.price = {
          amount: price, // Use price directly, already in wei
          currency: "ETH",
        };
        // Clear rental info if switching from rent to sale
        existingListing.rental = undefined;
      } else if (listingType === "rent") {
        existingListing.rental = {
          pricePerDay: pricePerDay || price, // Use pricePerDay if provided, fallback to price
          maxDurationDays: parseInt(maxDurationDays),
          currentRenter: null, // Clear current renter on re-listing
        };
        // For rental listings, price is optional
        if (price) {
          existingListing.price = {
            amount: price, // Use price directly, already in wei
            currency: "ETH",
          };
        }
      }

      await existingListing.save();
      listing = existingListing;
      isUpdate = true;

      console.log(`✅ Listing updated in database: Token #${tokenId}`);
      console.log(`   New status: ${listing.status}`);
      console.log(`   New type: ${listing.listingType}`);

      // For updates, also need to list on blockchain
      console.log(`🔗 Re-listing updated NFT #${tokenId} on blockchain...`);
    } else {
      // ===== INSERT SCENARIO =====
      // No active listing exists → Create new one

      console.log(`📝 Creating new listing for Token #${tokenId}`);

      // Create listing with rental support
      const listingData = {
        tokenId,
        contractAddress,
        propertyId,
        propertyName: propertyData.title || propertyData.name,
        propertyType: propertyData.propertyType,
        propertyAddress: {
          city: propertyData.address?.city,
          district: propertyData.address?.district,
          ward: propertyData.address?.ward,
        },
        propertyArea: propertyData.area,
        propertyImages: propertyData.images || [],
        seller: {
          userId,
          walletAddress,
          email: req.user.email,
          name: req.user.name || req.user.fullName,
        },
        listingType,
        description,
        expiresAt: expiresAt || undefined,
      };

      // Set pricing based on listing type
      if (listingType === "sale") {
        // Price already in wei from frontend
        listingData.price = {
          amount: price, // Use price directly, already in wei
          currency: "ETH",
        };
      } else if (listingType === "rent") {
        listingData.rental = {
          pricePerDay: pricePerDay || price, // Use pricePerDay if provided, fallback to price
          maxDurationDays: parseInt(maxDurationDays),
        };
        // For rental listings, price is optional (can be calculated)
        if (price) {
          listingData.price = {
            amount: price, // Use price directly, already in wei
            currency: "ETH",
          };
        }
      }

      listing = new Listing(listingData);
      await listing.save();

      console.log(`✅ New listing created in database: Token #${tokenId}`);
    }

    // ========================================================================
    // BLOCKCHAIN SYNC - List NFT on Marketplace smart contract
    // ========================================================================

    let blockchainListingId = null;
    let blockchainError = null;

    try {
      console.log(`🔗 Listing NFT #${tokenId} on Marketplace smart contract...`);
      
      let blockchainEndpoint;
      let blockchainPayload;

      if (listingType === "sale") {
        // Sale listing
        blockchainEndpoint = `${BLOCKCHAIN_SERVICE_URL}/marketplace/list`;
        blockchainPayload = {
          tokenId: listing.tokenId,
          priceInWei: listing.price.amount, // Already in wei
          sellerWallet: walletAddress,
        };
      } else if (listingType === "rent") {
        // Rental listing
        blockchainEndpoint = `${BLOCKCHAIN_SERVICE_URL}/marketplace/list-rent`;
        blockchainPayload = {
          tokenId: listing.tokenId,
          pricePerDayInWei: listing.rental.pricePerDay, // Already in wei
          maxDurationDays: listing.rental.maxDurationDays,
          sellerWallet: walletAddress,
        };
      }

      console.log("📤 Blockchain payload:", blockchainPayload);

      const blockchainResponse = await axios.post(
        blockchainEndpoint,
        blockchainPayload
      );

      if (blockchainResponse.data.success) {
        blockchainListingId = blockchainResponse.data.data.listingId;
        
        // Save blockchain listingId to database
        listing.blockchainListingId = blockchainListingId;
        await listing.save();

        console.log(`✅ NFT listed on blockchain - ListingId: ${blockchainListingId}`);
      }
    } catch (error) {
      console.error("❌ Blockchain listing failed:", error.response?.data || error.message);
      blockchainError = error.response?.data?.message || error.message;
      // Don't fail the entire request, listing exists in DB
    }

    // ========================================================================
    // RESPONSE - Listing created (with optional blockchain sync)
    // ========================================================================

    res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate
        ? `Listing updated successfully`
        : `${
            listingType === "sale" ? "Sale" : "Rental"
          } listing created successfully`,
      data: {
        _id: listing._id,
        tokenId: listing.tokenId,
        propertyName: listing.propertyName,
        listingType: listing.listingType,
        status: listing.status,
        price: listing.price,
        rental: listing.rental,
        listedAt: listing.listedAt,
        blockchainListingId,
      },
      isUpdate,
      blockchain: {
        synced: !!blockchainListingId,
        listingId: blockchainListingId,
        error: blockchainError,
      },
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
      listingType, // "sale", "rent", or undefined for all
      sortBy = "listedAt",
      sortOrder = "desc",
    } = req.query;

    const query = { status: "active" };

    if (propertyType) query.propertyType = propertyType;
    if (city) query["propertyAddress.city"] = city;
    if (listingType) query.listingType = listingType;

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
    if (price) {
      // Convert ETH to wei for storage
      const priceInWei = BigInt(
        Math.floor(parseFloat(price) * 1e18)
      ).toString();
      listing.price.amount = priceInWei;
    }
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

/**
 * ========================================================================
 * RENTAL SPECIFIC FUNCTIONS
 * ========================================================================
 */

/**
 * Create rental listing
 */
exports.createRentalListing = async (req, res) => {
  try {
    const {
      tokenId,
      contractAddress,
      propertyId,
      pricePerDay,
      maxDurationDays,
      description,
      expiresAt,
    } = req.body;

    // Set listingType to rent and call main create function
    req.body.listingType = "rent";
    req.body.pricePerDay = pricePerDay;
    req.body.maxDurationDays = maxDurationDays;

    return exports.createListing(req, res);
  } catch (error) {
    console.error("❌ Create rental listing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create rental listing",
      message: error.message,
    });
  }
};

/**
 * Rent an NFT
 */
exports.rentNFT = async (req, res) => {
  try {
    const { rentalDays } = req.body;
    const listingId = req.params.id;
    const userId = req.user.userId;
    const walletAddress = req.user.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Wallet not linked",
        message: "Please link your wallet first to rent NFT",
      });
    }

    if (!rentalDays || rentalDays < 1) {
      return res.status(400).json({
        success: false,
        error: "Invalid rental duration",
        message: "rentalDays must be at least 1",
      });
    }

    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found",
      });
    }

    // Validate rental listing
    if (listing.listingType !== "rent") {
      return res.status(400).json({
        success: false,
        error: "Not a rental listing",
        message: "This NFT is not available for rent",
      });
    }

    if (listing.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Listing not active",
        message: "This rental listing is no longer active",
      });
    }

    // Check if already rented and still active
    if (listing.isRentalActive) {
      return res.status(400).json({
        success: false,
        error: "Already rented",
        message: "This NFT is currently being rented by someone else",
      });
    }

    // Check rental duration
    if (rentalDays > listing.rental.maxDurationDays) {
      return res.status(400).json({
        success: false,
        error: "Rental duration too long",
        message: `Maximum rental duration is ${listing.rental.maxDurationDays} days`,
      });
    }

    // Calculate total cost
    const totalCost = BigInt(listing.rental.pricePerDay) * BigInt(rentalDays);
    const expiresAt = new Date(Date.now() + rentalDays * 24 * 60 * 60 * 1000);

    // TODO: Call blockchain service to execute rental transaction
    // This would interact with the smart contract's rentItem function

    // Update listing with rental info
    listing.rental.currentRenter = {
      userId,
      walletAddress,
      email: req.user.email,
      name: req.user.name || req.user.fullName,
      rentedAt: new Date(),
      expiresAt: expiresAt,
      rentalDays: rentalDays,
      // transactionHash: txHash, // TODO: Add when blockchain call is implemented
    };

    listing.status = "rented";
    await listing.save();

    console.log(
      `✅ NFT rented: Token #${listing.tokenId} for ${rentalDays} days`
    );

    res.json({
      success: true,
      message: "NFT rented successfully",
      data: {
        listingId: listing._id,
        tokenId: listing.tokenId,
        rentalDays,
        totalCost: totalCost.toString(),
        expiresAt,
        renter: listing.rental.currentRenter,
      },
    });
  } catch (error) {
    console.error("❌ Rent NFT error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to rent NFT",
      message: error.message,
    });
  }
};

/**
 * Get rental listings
 */
exports.getRentalListings = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      propertyType,
      city,
      minPricePerDay,
      maxPricePerDay,
      maxDuration,
      availability = "all", // "all", "available", "rented"
      sortBy = "listedAt",
      sortOrder = "desc",
    } = req.query;

    const query = {
      listingType: "rent",
      status: { $in: ["active", "rented"] },
    };

    if (propertyType) query.propertyType = propertyType;
    if (city) query["propertyAddress.city"] = city;

    if (minPricePerDay || maxPricePerDay) {
      query["rental.pricePerDay"] = {};
      if (minPricePerDay)
        query["rental.pricePerDay"].$gte = minPricePerDay.toString();
      if (maxPricePerDay)
        query["rental.pricePerDay"].$lte = maxPricePerDay.toString();
    }

    if (maxDuration) {
      query["rental.maxDurationDays"] = { $gte: parseInt(maxDuration) };
    }

    // Filter by availability
    if (availability === "available") {
      query.$or = [
        { status: "active" },
        {
          status: "rented",
          "rental.currentRenter.expiresAt": { $lt: new Date() },
        },
      ];
    } else if (availability === "rented") {
      query.status = "rented";
      query["rental.currentRenter.expiresAt"] = { $gte: new Date() };
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [listings, total] = await Promise.all([
      Listing.find(query).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Listing.countDocuments(query),
    ]);

    // Add rental status to each listing
    const enrichedListings = listings.map((listing) => ({
      ...listing,
      isCurrentlyRented:
        listing.rental?.currentRenter &&
        new Date() < new Date(listing.rental.currentRenter.expiresAt),
      rentalTimeLeft: listing.rental?.currentRenter
        ? Math.max(
            0,
            new Date(listing.rental.currentRenter.expiresAt) - new Date()
          )
        : 0,
    }));

    res.json({
      success: true,
      data: enrichedListings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Get rental listings error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get rental listings",
    });
  }
};

/**
 * Get my rental history (as renter)
 */
exports.getMyRentals = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status = "all" } = req.query;

    const query = {
      "rental.currentRenter.userId": userId,
      listingType: "rent",
    };

    // Filter by rental status
    if (status === "active") {
      query["rental.currentRenter.expiresAt"] = { $gte: new Date() };
    } else if (status === "expired") {
      query["rental.currentRenter.expiresAt"] = { $lt: new Date() };
    }

    const rentals = await Listing.find(query)
      .sort({ "rental.currentRenter.rentedAt": -1 })
      .lean();

    // Enrich with rental status
    const enrichedRentals = rentals.map((rental) => ({
      ...rental,
      isActive: new Date() < new Date(rental.rental.currentRenter.expiresAt),
      timeLeft: Math.max(
        0,
        new Date(rental.rental.currentRenter.expiresAt) - new Date()
      ),
    }));

    res.json({
      success: true,
      data: enrichedRentals,
    });
  } catch (error) {
    console.error("❌ Get my rentals error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get rental history",
    });
  }
};

/**
 * Check NFT rental status
 */
exports.getNFTRentalStatus = async (req, res) => {
  try {
    const { tokenId } = req.params;

    const listing = await Listing.findOne({
      tokenId,
      listingType: "rent",
      status: { $in: ["active", "rented"] },
    }).lean();

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Rental listing not found",
      });
    }

    const isCurrentlyRented =
      listing.rental?.currentRenter &&
      new Date() < new Date(listing.rental.currentRenter.expiresAt);

    res.json({
      success: true,
      data: {
        tokenId: listing.tokenId,
        listingId: listing._id,
        isAvailable: !isCurrentlyRented,
        isCurrentlyRented,
        pricePerDay: listing.rental.pricePerDay,
        maxDurationDays: listing.rental.maxDurationDays,
        currentRenter: isCurrentlyRented ? listing.rental.currentRenter : null,
        timeLeft: isCurrentlyRented
          ? Math.max(
              0,
              new Date(listing.rental.currentRenter.expiresAt) - new Date()
            )
          : 0,
      },
    });
  } catch (error) {
    console.error("❌ Get rental status error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get rental status",
    });
  }
};

/**
 * Update listing status to rented (called by blockchain service after setUser)
 */
exports.markAsRented = async (req, res) => {
  try {
    const {
      tokenId,
      renterAddress,
      expiresTimestamp,
      transactionHash,
      rentalDays,
    } = req.body;

    if (!tokenId || !renterAddress || !expiresTimestamp) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        message: "tokenId, renterAddress, and expiresTimestamp are required",
      });
    }

    // Find rental listing
    const listing = await Listing.findOne({
      tokenId: parseInt(tokenId),
      listingType: "rent",
      status: "active",
    }).sort({ listedAt: -1 });

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Active rental listing not found",
      });
    }

    // Get renter info from user service via wallet address
    let renterInfo = {};
    try {
      const userResponse = await axios.get(
        `${
          process.env.USER_SERVICE_URL || "http://localhost:4001"
        }/users/wallet/${renterAddress}`
      );
      if (userResponse.data.success) {
        renterInfo = {
          userId: userResponse.data.data._id,
          email: userResponse.data.data.email,
          name: userResponse.data.data.fullName || userResponse.data.data.email,
        };
      }
    } catch (err) {
      console.log("⚠️ Could not fetch renter info:", err.message);
    }

    // Calculate rental days if not provided
    const calculatedRentalDays =
      rentalDays ||
      Math.ceil((expiresTimestamp * 1000 - Date.now()) / (24 * 60 * 60 * 1000));

    // Update listing with renter info
    listing.rental.currentRenter = {
      ...renterInfo,
      walletAddress: renterAddress.toLowerCase(),
      rentedAt: new Date(),
      expiresAt: new Date(expiresTimestamp * 1000),
      rentalDays: calculatedRentalDays,
      transactionHash: transactionHash || null,
    };

    listing.status = "rented";
    await listing.save();

    console.log(
      `✅ Listing marked as rented: Token #${tokenId} to ${renterAddress}`
    );

    res.json({
      success: true,
      message: "Listing updated to rented status",
      data: {
        listingId: listing._id,
        tokenId: listing.tokenId,
        status: listing.status,
        currentRenter: listing.rental.currentRenter,
      },
    });
  } catch (error) {
    console.error("❌ Mark as rented error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update listing status",
      message: error.message,
    });
  }
};

/**
 * Buy NFT - Mark listing as sold
 */
exports.buyListing = async (req, res) => {
  try {
    const { id } = req.params;
    const { buyerAddress, transactionHash } = req.body;

    console.log(`🛒 Processing buy request for listing ${id}:`, {
      buyerAddress,
      transactionHash,
    });

    // Validate required fields
    if (!buyerAddress) {
      return res.status(400).json({
        success: false,
        error: "Buyer address is required",
      });
    }

    // Find and validate listing
    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found",
      });
    }

    // Check if listing is available for purchase
    if (listing.status !== "active") {
      return res.status(400).json({
        success: false,
        error: `Listing is not available for purchase. Current status: ${listing.status}`,
      });
    }

    // Check if listing type is sale (not rental)
    if (listing.listingType !== "sale") {
      return res.status(400).json({
        success: false,
        error: "This listing is not for sale",
      });
    }

    // Update listing status to sold
    const updatedListing = await Listing.findByIdAndUpdate(
      id,
      {
        status: "sold",
        buyer: buyerAddress,
        soldAt: new Date(),
        transactionHash: transactionHash || null,
        updatedAt: new Date(),
      },
      { new: true }
    );

    console.log(`✅ Listing ${id} marked as sold to ${buyerAddress}`);

    res.json({
      success: true,
      message: "NFT purchased successfully",
      data: {
        listing: updatedListing,
        transactionHash: transactionHash || null,
        buyer: buyerAddress,
        soldAt: updatedListing.soldAt,
      },
    });
  } catch (error) {
    console.error("❌ Buy listing error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process purchase",
      message: error.message,
    });
  }
};
