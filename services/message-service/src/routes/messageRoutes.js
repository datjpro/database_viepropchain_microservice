const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { verifyToken } = require("../middleware/auth");

// Apply auth middleware to all routes
router.use(verifyToken);

// Get all chats for current user
router.get("/chats", messageController.getAllChats);

// Get chat history with specific user
router.get("/chats/:receiver_id/messages", messageController.getChatHistory);

// Search messages
router.get("/search", messageController.searchMessages);

// Mark messages as seen
router.put("/chats/:chat_id/seen", messageController.markAsSeen);

// Delete message
router.delete("/messages/:message_id", messageController.deleteMessage);

// Get unread count
router.get("/unread-count", messageController.getUnreadCount);

module.exports = router;
