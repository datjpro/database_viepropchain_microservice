/**
 * ========================================================================
 * FRONTEND CONTROLLER - Fast Read APIs for Frontend
 * ========================================================================
 * Optimized endpoints for frontend marketplace:
 * - Fast listing queries from MongoDB
 * - Search and filter capabilities  
 * - Pagination and sorting
 * - Minimal data for listing cards
 * ========================================================================
 */

const { Listing } = require("../models");

/**
 * Get marketplace homepage data (fast)
 */
exports.getMarketplaceHome = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      propertyType,
      city,
      district,
      minPrice,
      maxPrice,
      search,
      sortBy = "listedAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = { status: "active" };

    // Filters
    if (propertyType && propertyType !== "all") {
      query.propertyType = propertyType;
    }
    
    if (city) {
      query["propertyAddress.city"] = { $regex: city, $options: "i" };
    }
    
    if (district) {
      query["propertyAddress.district"] = { $regex: district, $options: "i" };
    }

    // Price range filter (convert ETH to Wei for comparison)
    if (minPrice || maxPrice) {
      query["price.amount"] = {};
      if (minPrice) {
        const minWei = (parseFloat(minPrice) * 1e18).toString();
        query["price.amount"].$gte = minWei;
      }
      if (maxPrice) {
        const maxWei = (parseFloat(maxPrice) * 1e18).toString();
        query["price.amount"].$lte = maxWei;
      }
    }

    // Search in property name and description
    if (search) {
      query.$or = [
        { propertyName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "propertyAddress.city": { $regex: search, $options: "i" } },
        { "propertyAddress.district": { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Execute queries in parallel
    const [listings, total, stats] = await Promise.all([
      Listing.find(query)
        .select({
          tokenId: 1,
          propertyName: 1,
          propertyType: 1,
          propertyAddress: 1,
          propertyArea: 1,
          propertyImages: 1,
          price: 1,
          status: 1,
          views: 1,
          favorites: 1,
          listedAt: 1,
          expiresAt: 1,
          "seller.walletAddress": 1
        })
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      
      Listing.countDocuments(query),
      
      // Get marketplace stats
      Listing.aggregate([
        { $match: { status: "active" } },
        {
          $group: {
            _id: null,
            totalListings: { $sum: 1 },
            totalViews: { $sum: "$views" },
            averagePrice: { $avg: { $toDouble: "$price.amount" } },
            propertyTypes: { $addToSet: "$propertyType" },
            cities: { $addToSet: "$propertyAddress.city" }
          }
        }
      ])
    ]);

    // Format listings for frontend
    const formattedListings = listings.map(listing => ({
      id: listing._id,
      tokenId: listing.tokenId,
      propertyName: listing.propertyName,
      propertyType: listing.propertyType,
      address: {
        city: listing.propertyAddress?.city,
        district: listing.propertyAddress?.district,
        ward: listing.propertyAddress?.ward,
        full: `${listing.propertyAddress?.ward || ""}, ${listing.propertyAddress?.district || ""}, ${listing.propertyAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, "")
      },
      area: listing.propertyArea,
      image: listing.propertyImages?.[0] || "/placeholder-property.jpg",
      price: {
        wei: listing.price.amount,
        eth: (parseFloat(listing.price.amount) / 1e18).toFixed(4),
        formatted: `${(parseFloat(listing.price.amount) / 1e18).toFixed(2)} ETH`
      },
      seller: {
        address: listing.seller.walletAddress,
        shortAddress: `${listing.seller.walletAddress.slice(0, 6)}...${listing.seller.walletAddress.slice(-4)}`
      },
      stats: {
        views: listing.views,
        favorites: listing.favorites
      },
      timing: {
        listed: listing.listedAt,
        expires: listing.expiresAt,
        daysLeft: Math.ceil((new Date(listing.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
      }
    }));

    res.json({
      success: true,
      data: {
        listings: formattedListings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        stats: stats[0] || {
          totalListings: 0,
          totalViews: 0,
          averagePrice: 0,
          propertyTypes: [],
          cities: []
        },
        filters: {
          propertyTypes: ["apartment", "house", "villa", "townhouse", "condo"],
          cities: stats[0]?.cities || [],
          priceRanges: [
            { label: "< 10 ETH", min: 0, max: 10 },
            { label: "10 - 50 ETH", min: 10, max: 50 },
            { label: "50 - 100 ETH", min: 50, max: 100 },
            { label: "> 100 ETH", min: 100, max: null }
          ]
        }
      }
    });

  } catch (error) {
    console.error("❌ Get marketplace home error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load marketplace",
      message: error.message
    });
  }
};

/**
 * Get listing detail (fast)
 */
exports.getListingDetail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Increment view count and get listing
    const listing = await Listing.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: "Listing not found"
      });
    }

    if (listing.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Listing is not active"
      });
    }

    // Format for frontend
    const formattedListing = {
      id: listing._id,
      tokenId: listing.tokenId,
      contractAddress: listing.contractAddress,
      property: {
        id: listing.propertyId,
        name: listing.propertyName,
        type: listing.propertyType,
        address: listing.propertyAddress,
        area: listing.propertyArea,
        images: listing.propertyImages,
        description: listing.description
      },
      price: {
        wei: listing.price.amount,
        eth: (parseFloat(listing.price.amount) / 1e18).toFixed(4),
        formatted: `${(parseFloat(listing.price.amount) / 1e18).toFixed(2)} ETH`,
        usd: null // Có thể fetch từ price API
      },
      seller: {
        id: listing.seller.userId,
        walletAddress: listing.seller.walletAddress,
        email: listing.seller.email,
        name: listing.seller.name,
        shortAddress: `${listing.seller.walletAddress.slice(0, 6)}...${listing.seller.walletAddress.slice(-4)}`
      },
      stats: {
        views: listing.views,
        favorites: listing.favorites,
        offers: listing.offers?.length || 0
      },
      timing: {
        listed: listing.listedAt,
        expires: listing.expiresAt,
        daysLeft: Math.ceil((new Date(listing.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)),
        isExpired: new Date() > new Date(listing.expiresAt)
      },
      blockchain: {
        tokenId: listing.tokenId,
        contractAddress: listing.contractAddress,
        network: "Ganache Local"
      }
    };

    res.json({
      success: true,
      data: formattedListing
    });

  } catch (error) {
    console.error("❌ Get listing detail error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load listing detail",
      message: error.message
    });
  }
};

/**
 * Get popular/featured listings
 */
exports.getFeaturedListings = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    // Get most viewed listings in last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const featuredListings = await Listing.find({
      status: "active",
      listedAt: { $gte: weekAgo }
    })
    .select({
      tokenId: 1,
      propertyName: 1,
      propertyType: 1,
      propertyAddress: 1,
      propertyImages: 1,
      price: 1,
      views: 1,
      listedAt: 1
    })
    .sort({ views: -1, listedAt: -1 })
    .limit(Number(limit))
    .lean();

    const formatted = featuredListings.map(listing => ({
      id: listing._id,
      tokenId: listing.tokenId,
      propertyName: listing.propertyName,
      propertyType: listing.propertyType,
      address: `${listing.propertyAddress?.ward || ""}, ${listing.propertyAddress?.district || ""}, ${listing.propertyAddress?.city || ""}`.replace(/^,\s*|,\s*$/g, ""),
      image: listing.propertyImages?.[0] || "/placeholder-property.jpg",
      price: {
        eth: (parseFloat(listing.price.amount) / 1e18).toFixed(2),
        formatted: `${(parseFloat(listing.price.amount) / 1e18).toFixed(2)} ETH`
      },
      stats: {
        views: listing.views
      }
    }));

    res.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error("❌ Get featured listings error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to load featured listings"
    });
  }
};

/**
 * Search suggestions (autocomplete)
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    const suggestions = await Listing.aggregate([
      {
        $match: {
          status: "active",
          $or: [
            { propertyName: { $regex: q, $options: "i" } },
            { "propertyAddress.city": { $regex: q, $options: "i" } },
            { "propertyAddress.district": { $regex: q, $options: "i" } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          propertyNames: { $addToSet: "$propertyName" },
          cities: { $addToSet: "$propertyAddress.city" },
          districts: { $addToSet: "$propertyAddress.district" }
        }
      }
    ]);

    const result = suggestions[0] || { propertyNames: [], cities: [], districts: [] };
    
    const allSuggestions = [
      ...result.propertyNames.filter(name => name && name.toLowerCase().includes(q.toLowerCase())),
      ...result.cities.filter(city => city && city.toLowerCase().includes(q.toLowerCase())),
      ...result.districts.filter(district => district && district.toLowerCase().includes(q.toLowerCase()))
    ].slice(0, 10);

    res.json({
      success: true,
      data: {
        query: q,
        suggestions: allSuggestions
      }
    });

  } catch (error) {
    console.error("❌ Get search suggestions error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get suggestions"
    });
  }
};

module.exports = exports;