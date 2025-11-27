const Message = require("../models/Message");
const Chat = require("../models/Chat");
const mongoose = require("mongoose");

class AdminMessageController {
  /**
   * Get all server-side chats (marketplace, support, dispute)
   * Admin can view these chats
   * GET /api/messages/admin/chats
   */
  async getAllServerSideChats(req, res) {
    try {
      const { page = 1, limit = 20, chat_type, status, priority } = req.query;

      const filter = {
        chat_type: { $in: ["marketplace", "support", "dispute"] },
      };

      if (chat_type) filter.chat_type = chat_type;
      if (status) filter.status = status;
      if (priority) filter.priority = priority;

      const chats = await Chat.find(filter)
        .sort({ last_message_at: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("participants", "email profile walletAddress")
        .populate("assigned_to", "email profile")
        .populate("last_message_by", "email profile");

      const total = await Chat.countDocuments(filter);

      res.json({
        success: true,
        data: chats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("❌ Get admin chats error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get messages from a server-side chat
   * Admin can read plaintext messages
   * GET /api/messages/admin/chats/:chat_id/messages
   */
  async getServerSideChatMessages(req, res) {
    try {
      const { chat_id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      // Verify chat is server-side
      const chat = await Chat.findOne({ chat_id });

      if (!chat) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      if (chat.encryption_enabled) {
        return res.status(403).json({
          success: false,
          error:
            "This is an E2EE chat. Admin cannot access encrypted messages.",
        });
      }

      // Get messages (plaintext)
      const messages = await Message.find({
        chat_id,
        "encryption.type": "server-side",
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("sender_id", "email profile walletAddress")
        .populate("receiver_id", "email profile walletAddress");

      const total = await Message.countDocuments({
        chat_id,
        "encryption.type": "server-side",
      });

      res.json({
        success: true,
        data: messages.reverse(),
        chat_info: {
          chat_type: chat.chat_type,
          status: chat.status,
          priority: chat.priority,
          assigned_to: chat.assigned_to,
          metadata: chat.metadata,
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("❌ Get admin chat messages error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Assign support chat to admin
   * PUT /api/messages/admin/chats/:chat_id/assign
   */
  async assignChat(req, res) {
    try {
      const { chat_id } = req.params;
      const { assigned_to, priority } = req.body;
      const adminId = req.userId;

      const chat = await Chat.findOne({ chat_id });

      if (!chat) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      if (chat.chat_type === "private") {
        return res.status(403).json({
          success: false,
          error: "Cannot assign private chats",
        });
      }

      chat.assigned_to = assigned_to || adminId;
      if (priority) chat.priority = priority;

      // Add admin to participants if not already
      if (!chat.admin_participants.includes(adminId)) {
        chat.admin_participants.push(adminId);
      }

      await chat.save();

      res.json({
        success: true,
        data: chat,
        message: "Chat assigned successfully",
      });
    } catch (error) {
      console.error("❌ Assign chat error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update chat status
   * PUT /api/messages/admin/chats/:chat_id/status
   */
  async updateChatStatus(req, res) {
    try {
      const { chat_id } = req.params;
      const { status } = req.body;

      if (!["active", "resolved", "closed", "escalated"].includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Invalid status",
        });
      }

      const chat = await Chat.findOneAndUpdate(
        { chat_id },
        { $set: { status } },
        { new: true }
      );

      if (!chat) {
        return res.status(404).json({
          success: false,
          error: "Chat not found",
        });
      }

      res.json({
        success: true,
        data: chat,
        message: "Chat status updated successfully",
      });
    } catch (error) {
      console.error("❌ Update chat status error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Flag a message for review
   * POST /api/messages/admin/messages/:message_id/flag
   */
  async flagMessage(req, res) {
    try {
      const { message_id } = req.params;
      const { reason } = req.body;
      const adminId = req.userId;

      const message = await Message.findById(message_id);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: "Message not found",
        });
      }

      if (message.encryption.type === "e2ee") {
        return res.status(403).json({
          success: false,
          error: "Cannot flag E2EE messages",
        });
      }

      message.flagged = true;
      message.flag_reason = reason;
      message.reviewed_by = adminId;
      message.reviewed_at = new Date();

      await message.save();

      res.json({
        success: true,
        data: message,
        message: "Message flagged successfully",
      });
    } catch (error) {
      console.error("❌ Flag message error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get flagged messages
   * GET /api/messages/admin/flagged
   */
  async getFlaggedMessages(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const messages = await Message.find({
        flagged: true,
        "encryption.type": "server-side",
      })
        .sort({ reviewed_at: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("sender_id", "email profile")
        .populate("receiver_id", "email profile")
        .populate("reviewed_by", "email profile");

      const total = await Message.countDocuments({
        flagged: true,
        "encryption.type": "server-side",
      });

      res.json({
        success: true,
        data: messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("❌ Get flagged messages error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Search server-side messages (admin only)
   * GET /api/messages/admin/search
   */
  async searchServerSideMessages(req, res) {
    try {
      const { query, chat_type, user_id } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Search query is required",
        });
      }

      const filter = {
        $text: { $search: query },
        "encryption.type": "server-side",
      };

      if (chat_type) filter.chat_type = chat_type;
      if (user_id) {
        filter.$or = [{ sender_id: user_id }, { receiver_id: user_id }];
      }

      const messages = await Message.find(filter)
        .sort({ score: { $meta: "textScore" }, createdAt: -1 })
        .limit(50)
        .populate("sender_id", "email profile")
        .populate("receiver_id", "email profile");

      res.json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (error) {
      console.error("❌ Search admin messages error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get statistics
   * GET /api/messages/admin/stats
   */
  async getStatistics(req, res) {
    try {
      const stats = await Promise.all([
        Chat.countDocuments({ chat_type: "marketplace", status: "active" }),
        Chat.countDocuments({ chat_type: "support", status: "active" }),
        Chat.countDocuments({ chat_type: "dispute", status: "active" }),
        Chat.countDocuments({ status: "escalated" }),
        Message.countDocuments({ flagged: true }),
        Chat.countDocuments({ priority: "urgent", status: "active" }),
      ]);

      res.json({
        success: true,
        data: {
          active_marketplace_chats: stats[0],
          active_support_chats: stats[1],
          active_dispute_chats: stats[2],
          escalated_chats: stats[3],
          flagged_messages: stats[4],
          urgent_chats: stats[5],
        },
      });
    } catch (error) {
      console.error("❌ Get stats error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new AdminMessageController();
