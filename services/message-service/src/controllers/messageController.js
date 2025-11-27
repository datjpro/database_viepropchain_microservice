const Message = require("../models/Message");
const Chat = require("../models/Chat");
const mongoose = require("mongoose");

class MessageController {
  // Get chat history between two users
  async getChatHistory(req, res) {
    try {
      const { receiver_id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const userId = req.userId;

      // Generate chat_id
      const chat_id = Chat.generateChatId(userId, receiver_id);

      // Get messages
      const messages = await Message.find({
        chat_id,
        deleted_by: { $ne: userId },
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("sender_id", "email profile")
        .populate("receiver_id", "email profile");

      const total = await Message.countDocuments({
        chat_id,
        deleted_by: { $ne: userId },
      });

      // Mark messages as seen
      await Message.updateMany(
        {
          chat_id,
          receiver_id: userId,
          seen: false,
        },
        {
          $set: { seen: true, seen_at: new Date() },
        }
      );

      // Update chat unread count
      const chat = await Chat.findOne({ chat_id });
      if (chat) {
        chat.resetUnread(userId);
        await chat.save();
      }

      res.json({
        success: true,
        data: messages.reverse(), // Reverse to show oldest first
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("❌ Get chat history error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get all chats for a user
  async getAllChats(req, res) {
    try {
      const userId = req.userId;
      const { page = 1, limit = 20 } = req.query;

      const chats = await Chat.find({
        participants: userId,
        archived_by: { $ne: userId },
      })
        .sort({ last_message_at: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("participants", "email profile walletAddress")
        .populate("last_message_by", "email profile");

      const total = await Chat.countDocuments({
        participants: userId,
        archived_by: { $ne: userId },
      });

      // Format response with unread counts
      const formattedChats = chats.map((chat) => {
        const otherUser = chat.participants.find(
          (p) => p._id.toString() !== userId.toString()
        );

        return {
          chat_id: chat.chat_id,
          other_user: otherUser,
          last_message: chat.last_message,
          last_message_at: chat.last_message_at,
          last_message_by: chat.last_message_by,
          unread_count: chat.unread_count.get(userId.toString()) || 0,
          metadata: chat.metadata,
          createdAt: chat.createdAt,
        };
      });

      res.json({
        success: true,
        data: formattedChats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("❌ Get all chats error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Search messages
  async searchMessages(req, res) {
    try {
      const { query, receiver_id } = req.query;
      const userId = req.userId;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "Search query is required",
        });
      }

      let searchFilter = {
        $text: { $search: query },
        deleted_by: { $ne: userId },
      };

      // If receiver_id is provided, search only in that chat
      if (receiver_id) {
        const chat_id = Chat.generateChatId(userId, receiver_id);
        searchFilter.chat_id = chat_id;
      } else {
        // Search in all chats where user is participant
        searchFilter.$or = [{ sender_id: userId }, { receiver_id: userId }];
      }

      const messages = await Message.find(searchFilter)
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
      console.error("❌ Search messages error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Mark messages as seen
  async markAsSeen(req, res) {
    try {
      const { chat_id } = req.params;
      const userId = req.userId;

      await Message.updateMany(
        {
          chat_id,
          receiver_id: userId,
          seen: false,
        },
        {
          $set: { seen: true, seen_at: new Date() },
        }
      );

      // Reset unread count in chat
      const chat = await Chat.findOne({ chat_id });
      if (chat) {
        chat.resetUnread(userId);
        await chat.save();
      }

      res.json({
        success: true,
        message: "Messages marked as seen",
      });
    } catch (error) {
      console.error("❌ Mark as seen error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Delete message (soft delete)
  async deleteMessage(req, res) {
    try {
      const { message_id } = req.params;
      const userId = req.userId;

      const message = await Message.findById(message_id);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: "Message not found",
        });
      }

      // Add user to deleted_by array
      if (!message.deleted_by.includes(userId)) {
        message.deleted_by.push(userId);
        await message.save();
      }

      res.json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      console.error("❌ Delete message error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // Get unread count
  async getUnreadCount(req, res) {
    try {
      const userId = req.userId;

      const chats = await Chat.find({
        participants: userId,
      });

      let totalUnread = 0;
      chats.forEach((chat) => {
        totalUnread += chat.unread_count.get(userId.toString()) || 0;
      });

      res.json({
        success: true,
        unread_count: totalUnread,
      });
    } catch (error) {
      console.error("❌ Get unread count error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new MessageController();
