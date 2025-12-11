const NFT = require("../models/NFT");
const Property = require("../models/Property");

/**
 * GET /api/v1/indexer/my-nfts/:walletAddress?
 * Returns NFTs owned by a wallet with joined property details
 * Accepts wallet from params, query, header `x-wallet-address`, or authenticated user (`req.user.walletAddress`).
 * Query: page, limit, includeInactive
 */
exports.getMyNFTs = async (req, res) => {
  try {
    const { page = 1, limit = 20, includeInactive = "false" } = req.query;

    // Wallet resolution order: route param -> query -> header -> authenticated user
    const walletAddressRaw =
      req.params.walletAddress ||
      req.query.walletAddress ||
      req.query.wallet ||
      req.query.address ||
      req.headers["x-wallet-address"] ||
      req.user?.walletAddress;

    if (!walletAddressRaw) {
      return res.status(400).json({
        error:
          "walletAddress required (param, query, x-wallet-address header, or authenticated user)",
      });
    }

    const wallet = walletAddressRaw.toLowerCase();
    const skip = (Number(page) - 1) * Number(limit);

    const walletRegex = new RegExp(`^${wallet}$`, "i");

    // ownerField controls which field to match: default = currentOwner
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

    const pipeline = [
      { $match: matchFilter },
      {
        $lookup: {
          from: "properties",
          localField: "propertyId",
          foreignField: "_id",
          as: "propertyDetail",
        },
      },
      {
        $unwind: { path: "$propertyDetail", preserveNullAndEmptyArrays: true },
      },
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
          isListed: {
            $cond: {
              if: { $eq: ["$status", "listed"] },
              then: true,
              else: false,
            },
          },
          listingType: 1,
          currentPrice: 1,
          lastSalePrice: 1,
          totalSales: 1,
          transferHistory: 1,
          saleHistory: 1,
          propertyId: 1,
          propertyName: "$propertyDetail.title",
          propertyImage: { $arrayElemAt: ["$propertyDetail.images", 0] },
          property: "$propertyDetail",
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
      "GET /my-nfts (nft.controller) - walletRaw=%s wallet=%s includeInactive=%s",
      walletAddressRaw,
      wallet,
      includeInactive
    );
    console.log("Computed matchFilter:", JSON.stringify(matchFilter));

    const results = await NFT.aggregate(pipeline);

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

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getMyNFTsByParam = (req, res) => exports.getMyNFTs(req, res);
