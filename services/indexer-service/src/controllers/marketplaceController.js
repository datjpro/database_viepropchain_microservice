const Listing = require("../models/Listing");
const SaleHistory = require("../models/SaleHistory");
const NFT = require("../models/NFT");
const Property = require("../models/Property");

const mongoose = require("mongoose");
/**
 * GET /api/v1/indexer/marketplace/listings
 * Query active listings with optional type and pagination
 */
exports.getListings = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const q = { status: "Active" };
    if (type === "sale") q.listingType = "sale";
    if (type === "rental") q.listingType = "rental";

    const skip = (Number(page) - 1) * Number(limit);

    const listings = await Listing.find(q)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Enrich with NFT and Property info
    const enriched = [];
    for (const l of listings) {
      const nft = await NFT.findOne({ tokenId: l.tokenId }).lean();
      let property = null;
      if (nft && nft.propertyId) {
        property = await Property.findById(nft.propertyId).lean();
      }

      enriched.push({ listing: l, nft, property });
    }

    const total = await Listing.countDocuments(q);

    res.json({
      data: enriched,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get listings" });
  }
};

/**
 * GET /api/v1/indexer/nft/:tokenId/history
 * Return listing + sale history for a token
 */
exports.getNftHistory = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const listings = await Listing.find({ tokenId: Number(tokenId) })
      .sort({ createdAt: -1 })
      .lean();
    const sales = await SaleHistory.find({ tokenId: Number(tokenId) })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ listings, sales });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get NFT history" });
  }
};

/**
 * GET /api/v1/indexer/nft/:tokenId/rental-status
 */
exports.getNftRentalStatus = async (req, res) => {
  try {
    const { tokenId } = req.params;
    const nft = await NFT.findOne({ tokenId: Number(tokenId) }).lean();
    if (!nft) return res.status(404).json({ error: "NFT not found" });

    const now = new Date();
    const isRented = nft.rentExpiresAt && new Date(nft.rentExpiresAt) > now;

    res.json({
      tokenId: Number(tokenId),
      renter: nft.renter,
      rentExpiresAt: nft.rentExpiresAt,
      isRented,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get rental status" });
  }
};

/**
 * GET /api/v1/indexer/my-nfts
 * Returns NFTs owned by a wallet with property details (using $lookup)
 * Query params: walletAddress (or header x-wallet-address), page, limit, includeInactive
 */
exports.getMyNfts = async (req, res) => {
  try {
    const { page = 1, limit = 20, includeInactive = "false" } = req.query;

    // Accept wallet address from several places (param, query, header, or forwarded user)
    const walletAddressRaw =
      req.query.walletAddress ||
      req.query.wallet ||
      req.query.address ||
      req.headers["x-wallet-address"] ||
      req.user?.walletAddress;

    if (!walletAddressRaw) {
      return res.status(400).json({
        error:
          "walletAddress required (query, x-wallet-address header, or authenticated user)",
      });
    }

    const wallet = walletAddressRaw.toLowerCase();
    const skip = (Number(page) - 1) * Number(limit);

    const walletRegex = new RegExp(`^${wallet}$`, "i");
    const ownerField = (req.query.ownerField || "currentOwner").toLowerCase();

    let matchFilter;
    if (ownerField === "any" || ownerField === "all") {
      const ownerOrCurrent = {
        $or: [
          { owner: walletRegex },
          { currentOwner: walletRegex },
          { mintedBy: walletRegex },
          { originalOwner: walletRegex },
        ],
      };
      matchFilter =
        includeInactive !== "true"
          ? { $and: [ownerOrCurrent, { isActive: true }] }
          : ownerOrCurrent;
    } else {
      const fld =
        ownerField === "owner"
          ? "owner"
          : ownerField === "mintedby"
          ? "mintedBy"
          : ownerField === "originalowner"
          ? "originalOwner"
          : "currentOwner";
      matchFilter =
        includeInactive !== "true"
          ? { [fld]: walletRegex, isActive: true }
          : { [fld]: walletRegex };
    }

    // Aggregation: match NFTs by owner, join Property collection, project useful fields
    const pipeline = [
      { $match: matchFilter },
      {
        $lookup: {
          from: "properties",
          localField: "propertyId",
          foreignField: "_id",
          as: "property",
        },
      },
      { $unwind: { path: "$property", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          tokenId: 1,
          contractAddress: 1,
          status: 1,
          mintedAt: 1,
          mintedBy: 1,
          metadataUri: 1,
          metadataCID: 1,
          metadataCache: 1,
          owner: 1,
          currentOwner: 1,
          originalOwner: 1,
          listing: 1,
          isListed: 1,
          listingType: 1,
          currentPrice: 1,
          lastSalePrice: 1,
          totalSales: 1,
          transferHistory: 1,
          saleHistory: 1,
          propertyId: 1,
          property: {
            _id: "$property._id",
            name: "$property.name",
            imageUrl: "$property.imageUrl",
            location: "$property.location",
            details: "$property.details",
          },
          views: 1,
          favorites: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
    ];

    console.log(
      "GET /my-nfts - walletRaw=%s wallet=%s includeInactive=%s",
      walletAddressRaw,
      wallet,
      includeInactive
    );
    console.log("Computed matchFilter:", JSON.stringify(matchFilter));

    const results = await NFT.aggregate(pipeline);

    // Count matching documents (respect includeInactive)
    const ownerCountQuery = {
      $or: [
        { owner: walletRegex },
        { currentOwner: walletRegex },
        { mintedBy: walletRegex },
        { originalOwner: walletRegex },
      ],
    };
    const countQuery =
      includeInactive !== "true"
        ? { $and: [ownerCountQuery, { isActive: true }] }
        : ownerCountQuery;
    const total = await NFT.countDocuments(countQuery);

    console.log(
      `GET /my-nfts -> wallet=${wallet} includeInactive=${includeInactive} returned ${results.length} rows (total ${total})`
    );

    res.json({
      data: results,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get my NFTs" });
  }
};

/**
 * GET /api/v1/indexer/debug/db-stats
 * Debug endpoint: returns mongoose connection state and counts for key collections
 */
exports.getDbStats = async (req, res) => {
  try {
    const state = mongoose.connection.readyState; // 0 disconnected, 1 connected

    const nftCount = await NFT.countDocuments();
    const listingCount = await Listing.countDocuments();
    const propertyCount = await Property.countDocuments();

    return res.json({
      connected: state === 1,
      mongooseState: state,
      envMongo: !!process.env.MONGODB_URI,
      counts: {
        nfts: nftCount,
        listings: listingCount,
        properties: propertyCount,
      },
    });
  } catch (err) {
    console.error("Debug db-stats error", err);
    return res.status(500).json({ error: "Failed to get db stats" });
  }
};
