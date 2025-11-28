const Message = require("../models/Message");
const Chat = require("../models/Chat");

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> Set of socket IDs
  }

  handleConnection(socket) {
    const userId = socket.userId;

    console.log(`🔌 User connected: ${socket.userEmail} (${userId})`);

    // Track user's socket connections
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);

    // Join user's personal room
    socket.join(`user_${userId}`);

    // Send online status to user's contacts
    this.broadcastOnlineStatus(userId, true);

    // Handle send message
    socket.on("send_message", async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // Handle typing indicator
    socket.on("typing", (data) => {
      this.handleTyping(socket, data);
    });

    // Handle stop typing
    socket.on("stop_typing", (data) => {
      this.handleStopTyping(socket, data);
    });

    // Handle message seen
    socket.on("mark_seen", async (data) => {
      await this.handleMarkSeen(socket, data);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      this.handleDisconnect(socket);
    });
  }

  async handleSendMessage(socket, data) {
    try {
      const { receiver_id, message, attachments = [], metadata = {} } = data;
      const sender_id = socket.userId;

      console.log(`📤 Message from ${sender_id} to ${receiver_id}`);

      // Generate or get chat_id
      const chat_id = Chat.generateChatId(sender_id, receiver_id);

      // Create message
      const newMessage = new Message({
        chat_id,
        sender_id,
        receiver_id,
        message,
        attachments,
      });

      await newMessage.save();

      // Populate sender and receiver info
      await newMessage.populate("sender_id", "email profile");
      await newMessage.populate("receiver_id", "email profile");

      // Update or create chat
      let chat = await Chat.findOne({ chat_id });

      if (!chat) {
        chat = new Chat({
          chat_id,
          participants: [sender_id, receiver_id],
          last_message: message,
          last_message_at: new Date(),
          last_message_by: sender_id,
          metadata,
        });
      } else {
        chat.last_message = message;
        chat.last_message_at = new Date();
        chat.last_message_by = sender_id;

        // Increment unread count for receiver
        chat.incrementUnread(receiver_id);
      }

      await chat.save();

      // Send to sender (confirmation)
      socket.emit("message_sent", {
        success: true,
        data: newMessage,
      });

      // Send to receiver (if online)
      this.io.to(`user_${receiver_id}`).emit("new_message", {
        data: newMessage,
      });

      console.log(`✅ Message sent successfully`);
    } catch (error) {
      console.error("❌ Send message error:", error);
      socket.emit("message_error", {
        success: false,
        error: error.message,
      });
    }
  }

  handleTyping(socket, data) {
    const { receiver_id } = data;
    const sender_id = socket.userId;

    // Notify receiver that sender is typing
    this.io.to(`user_${receiver_id}`).emit("user_typing", {
      user_id: sender_id,
      email: socket.userEmail,
    });
  }

  handleStopTyping(socket, data) {
    const { receiver_id } = data;
    const sender_id = socket.userId;

    // Notify receiver that sender stopped typing
    this.io.to(`user_${receiver_id}`).emit("user_stop_typing", {
      user_id: sender_id,
    });
  }

  async handleMarkSeen(socket, data) {
    try {
      const { chat_id } = data;
      const userId = socket.userId;

      // Update messages
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

      // Update chat
      const chat = await Chat.findOne({ chat_id });
      if (chat) {
        chat.resetUnread(userId);
        await chat.save();

        // Notify sender that messages were seen
        const otherUserId = chat.participants.find(
          (p) => p.toString() !== userId.toString()
        );

        this.io.to(`user_${otherUserId}`).emit("messages_seen", {
          chat_id,
          seen_by: userId,
        });
      }

      socket.emit("mark_seen_success", {
        success: true,
        chat_id,
      });
    } catch (error) {
      console.error("❌ Mark seen error:", error);
      socket.emit("mark_seen_error", {
        success: false,
        error: error.message,
      });
    }
  }

  handleDisconnect(socket) {
    const userId = socket.userId;

    console.log(`🔌 User disconnected: ${socket.userEmail} (${userId})`);

    // Remove socket from tracking
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socket.id);

      // If no more sockets for this user, mark as offline
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
        this.broadcastOnlineStatus(userId, false);
      }
    }
  }

  broadcastOnlineStatus(userId, isOnline) {
    // This can be enhanced to notify specific contacts instead of broadcasting
    this.io.emit("user_status_change", {
      user_id: userId,
      online: isOnline,
    });
  }

  // Check if user is online
  isUserOnline(userId) {
    return (
      this.userSockets.has(userId) && this.userSockets.get(userId).size > 0
    );
  }

  // Get online users count
  getOnlineUsersCount() {
    return this.userSockets.size;
  }
}

module.exports = SocketHandler;
