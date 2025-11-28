const express = require("express");
const router = express.Router();
const adminMessageController = require("../controllers/adminMessageController");
const { verifyToken } = require("../middleware/auth");

// TODO: Add verifyAdmin middleware
router.use(verifyToken);

// Get all server-side chats
router.get("/chats", adminMessageController.getAllServerSideChats);

// Get messages from a server-side chat
router.get(
  "/chats/:chat_id/messages",
  adminMessageController.getServerSideChatMessages
);

// Assign chat to admin
router.put("/chats/:chat_id/assign", adminMessageController.assignChat);

// Update chat status
router.put("/chats/:chat_id/status", adminMessageController.updateChatStatus);

// Flag a message
router.post("/messages/:message_id/flag", adminMessageController.flagMessage);

// Get flagged messages
router.get("/flagged", adminMessageController.getFlaggedMessages);

// Search server-side messages
router.get("/search", adminMessageController.searchServerSideMessages);

// Get statistics
router.get("/stats", adminMessageController.getStatistics);

module.exports = router;
