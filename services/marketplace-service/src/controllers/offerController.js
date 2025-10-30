/**
 * ========================================================================
 * OFFER CONTROLLER - Handle offer operations
 * ========================================================================
 */

const { Listing, Offer } = require("../models");

/**
 * Create new offer
 */
exports.createOffer = async (req, res) => {
  try {
    const { listingId, price, message, expiresAt } = req.body;
    const userId = req.user.userId;
    const walletAddress = req.user.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: "Wallet not linked",
        message: "Please link your wallet first to make an offer",
      });
    }

    // Get listing
    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found",
      });
    }

    if (listing.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Listing is not active",
      });
    }

    // Check if buyer is not the seller
    if (listing.seller.userId.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: "Cannot make offer on your own listing",
      });
    }

    // Create offer
    const offer = new Offer({
      listingId,
      tokenId: listing.tokenId,
      buyer: {
        userId,
        walletAddress,
        email: req.user.email,
        name: req.user.name,
      },
      price: {
        amount: price.toString(),
        currency: "ETH",
      },
      message,
      expiresAt: expiresAt || undefined,
    });

    await offer.save();

    // Add offer to listing
    listing.offers.push(offer._id);
    await listing.save();

    console.log(`✅ Offer created on listing ${listingId}`);

    res.status(201).json({
      success: true,
      message: "Offer created successfully",
      data: offer,
    });
  } catch (error) {
    console.error("❌ Create offer error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create offer",
      message: error.message,
    });
  }
};

/**
 * Get offers for a listing
 */
exports.getOffersByListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const { status } = req.query;

    const query = { listingId };
    if (status) query.status = status;

    const offers = await Offer.find(query).sort({ offeredAt: -1 }).lean();

    res.json({
      success: true,
      data: offers,
    });
  } catch (error) {
    console.error("❌ Get offers error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get offers",
    });
  }
};

/**
 * Get my offers (as buyer)
 */
exports.getMyOffers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    const query = { "buyer.userId": userId };
    if (status) query.status = status;

    const offers = await Offer.find(query)
      .sort({ offeredAt: -1 })
      .populate("listingId")
      .lean();

    res.json({
      success: true,
      data: offers,
    });
  } catch (error) {
    console.error("❌ Get my offers error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get offers",
    });
  }
};

/**
 * Get offers on my listings (as seller)
 */
exports.getOffersOnMyListings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status } = req.query;

    // Find user's listings
    const listings = await Listing.find({
      "seller.userId": userId,
    }).select("_id");

    const listingIds = listings.map((l) => l._id);

    const query = { listingId: { $in: listingIds } };
    if (status) query.status = status;

    const offers = await Offer.find(query)
      .sort({ offeredAt: -1 })
      .populate("listingId")
      .lean();

    res.json({
      success: true,
      data: offers,
    });
  } catch (error) {
    console.error("❌ Get offers on my listings error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get offers",
    });
  }
};

/**
 * Accept offer (seller only)
 */
exports.acceptOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { transactionHash } = req.body;
    const userId = req.user.userId;

    const offer = await Offer.findById(offerId).populate("listingId");

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    const listing = offer.listingId;

    // Check if user is the seller
    if (listing.seller.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
        message: "Only the seller can accept offers",
      });
    }

    if (offer.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Offer is not pending",
      });
    }

    if (listing.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Listing is not active",
      });
    }

    // Accept offer
    offer.status = "accepted";
    offer.sellerResponse = {
      action: "accepted",
      respondedAt: new Date(),
    };
    offer.transactionHash = transactionHash;
    offer.completedAt = new Date();
    await offer.save();

    // Update listing to sold
    listing.status = "sold";
    listing.soldAt = new Date();
    listing.buyer = offer.buyer;
    listing.transactionHash = transactionHash;
    await listing.save();

    // Reject all other pending offers
    await Offer.updateMany(
      {
        listingId: listing._id,
        _id: { $ne: offerId },
        status: "pending",
      },
      {
        status: "rejected",
        "sellerResponse.action": "rejected",
        "sellerResponse.message": "Another offer was accepted",
        "sellerResponse.respondedAt": new Date(),
      }
    );

    console.log(`✅ Offer accepted: ${offerId}`);

    res.json({
      success: true,
      message: "Offer accepted successfully",
      data: {
        offer,
        listing,
      },
    });
  } catch (error) {
    console.error("❌ Accept offer error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to accept offer",
      message: error.message,
    });
  }
};

/**
 * Reject offer (seller only)
 */
exports.rejectOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { message } = req.body;
    const userId = req.user.userId;

    const offer = await Offer.findById(offerId).populate("listingId");

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    const listing = offer.listingId;

    // Check if user is the seller
    if (listing.seller.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
        message: "Only the seller can reject offers",
      });
    }

    if (offer.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Offer is not pending",
      });
    }

    // Reject offer
    offer.status = "rejected";
    offer.sellerResponse = {
      action: "rejected",
      message,
      respondedAt: new Date(),
    };
    await offer.save();

    console.log(`✅ Offer rejected: ${offerId}`);

    res.json({
      success: true,
      message: "Offer rejected successfully",
      data: offer,
    });
  } catch (error) {
    console.error("❌ Reject offer error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reject offer",
      message: error.message,
    });
  }
};

/**
 * Cancel offer (buyer only)
 */
exports.cancelOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user.userId;

    const offer = await Offer.findById(offerId);

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: "Offer not found",
      });
    }

    // Check if user is the buyer
    if (offer.buyer.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: "Not authorized",
        message: "You can only cancel your own offers",
      });
    }

    if (offer.status !== "pending") {
      return res.status(400).json({
        success: false,
        error: "Offer is not pending",
      });
    }

    // Cancel offer
    offer.status = "cancelled";
    await offer.save();

    console.log(`✅ Offer cancelled: ${offerId}`);

    res.json({
      success: true,
      message: "Offer cancelled successfully",
    });
  } catch (error) {
    console.error("❌ Cancel offer error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to cancel offer",
    });
  }
};
