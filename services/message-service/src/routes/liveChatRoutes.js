/**
 * ========================================================================
 * LIVE CHAT REST API ROUTES
 * ========================================================================
 */

const express = require("express");
const router = express.Router();
const { Conversation, ChatMessage } = require("../../../../shared/models");
const { verifyToken } = require("../middleware/auth");

/**
 * GET /api/livechat/conversations
 * Lấy danh sách conversations của user
 */
router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, limit = 50, page = 1 } = req.query;

    const query = {
      $or: [{ "user.userId": userId }, { "admin.userId": userId }],
    };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Conversation.countDocuments(query);

    res.json({
      success: true,
      data: conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching conversations:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/livechat/conversations/:id
 * Lấy chi tiết một conversation
 */
router.get("/conversations/:id", verifyToken, async (req, res) => {
  try {
    const conversationId = req.params.id;

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    res.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error("❌ Error fetching conversation:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/livechat/conversations/:id/messages
 * Lấy tin nhắn của conversation
 */
router.get("/conversations/:id/messages", verifyToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { limit = 50, before } = req.query;

    const query = { conversationId };

    // Pagination dựa trên timestamp (load more cũ hơn)
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // Reverse để hiển thị từ cũ -> mới
    const reversedMessages = messages.reverse();

    res.json({
      success: true,
      data: reversedMessages,
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/livechat/admin/pending
 * Admin: Lấy danh sách conversations đang chờ
 */
router.get("/admin/pending", verifyToken, async (req, res) => {
  try {
    // Kiểm tra quyền admin (có thể thêm middleware riêng)
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Unauthorized. Admin only.",
      });
    }

    const pendingConversations = await Conversation.find({
      status: "pending",
    })
      .sort({ createdAt: 1 }) // FIFO: Cái nào cũ nhất lên trước
      .limit(100);

    res.json({
      success: true,
      data: pendingConversations,
      count: pendingConversations.length,
    });
  } catch (error) {
    console.error("❌ Error fetching pending conversations:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/livechat/admin/active
 * Admin: Lấy danh sách conversations đang active
 */
router.get("/admin/active", verifyToken, async (req, res) => {
  try {
    const adminId = req.user.userId;

    // Lấy conversations active của admin này
    const activeConversations = await Conversation.find({
      "admin.userId": adminId,
      status: "active",
    })
      .sort({ lastMessageAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: activeConversations,
      count: activeConversations.length,
    });
  } catch (error) {
    console.error("❌ Error fetching active conversations:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/livechat/admin/stats
 * Admin: Thống kê
 */
router.get("/admin/stats", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Unauthorized. Admin only.",
      });
    }

    const stats = await Promise.all([
      Conversation.countDocuments({ status: "pending" }),
      Conversation.countDocuments({ status: "active" }),
      Conversation.countDocuments({ status: "closed" }),
      Conversation.aggregate([
        { $match: { rating: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            totalRatings: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        pending: stats[0],
        active: stats[1],
        closed: stats[2],
        rating: stats[3][0] || { avgRating: 0, totalRatings: 0 },
      },
    });
  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/livechat/conversations/:id/rate
 * User đánh giá conversation
 */
router.post("/conversations/:id/rate", verifyToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: "Rating must be between 1 and 5",
      });
    }

    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    // Chỉ user mới được đánh giá
    if (conversation.user.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: "Unauthorized",
      });
    }

    conversation.rating = rating;
    conversation.feedback = feedback;
    await conversation.save();

    res.json({
      success: true,
      message: "Rating saved successfully",
    });
  } catch (error) {
    console.error("❌ Error rating conversation:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
