/**
 * ========================================================================
 * LIVE CHAT SOCKET HANDLERS
 * Xử lý real-time chat giữa User và Admin
 * ========================================================================
 */

const { Conversation, ChatMessage } = require("../../../../shared/models");

/**
 * Thiết lập Live Chat Socket Handlers
 */
function setupLiveChatHandlers(io, socket) {
  console.log(`✅ [LiveChat] Client connected: ${socket.id}`);

  /**
   * ====================================================================
   * USER: Tạo hoặc join conversation
   * ====================================================================
   */
  socket.on("user:joinChat", async (data, callback) => {
    try {
      const { userId, email, name } = data;

      // Tìm conversation đang pending hoặc active của user
      let conversation = await Conversation.findOne({
        "user.userId": userId,
        status: { $in: ["pending", "active"] },
      });

      // Nếu chưa có, tạo mới
      if (!conversation) {
        conversation = new Conversation({
          user: {
            userId,
            email,
            name,
            socketId: socket.id,
          },
          status: "pending",
          subject: "Hỗ trợ khách hàng",
          messageCount: 0,
          unreadCountUser: 0,
          unreadCountAdmin: 0,
        });
        await conversation.save();

        // Thông báo cho tất cả admin có khách hàng mới
        io.to("admin_room").emit("admin:newConversation", {
          conversationId: conversation._id,
          user: conversation.user,
          createdAt: conversation.createdAt,
        });

        console.log(
          `📩 [LiveChat] New conversation created: ${conversation._id}`
        );
      } else {
        // Cập nhật socketId mới
        conversation.user.socketId = socket.id;
        await conversation.save();
      }

      // Join room riêng của conversation
      const roomName = `conversation_${conversation._id}`;
      socket.join(roomName);
      socket.conversationId = conversation._id;
      socket.userRole = "user";

      console.log(`👤 [LiveChat] User joined room: ${roomName}`);

      callback({
        success: true,
        conversation: {
          _id: conversation._id,
          status: conversation.status,
          admin: conversation.admin,
        },
      });
    } catch (error) {
      console.error("❌ [LiveChat] Error joining chat:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * ====================================================================
   * ADMIN: Join vào admin_room để nhận thông báo
   * ====================================================================
   */
  socket.on("admin:joinRoom", async (data, callback) => {
    try {
      const { adminId, email, name } = data;

      socket.join("admin_room");
      socket.adminId = adminId;
      socket.userRole = "admin";

      console.log(`👨‍💼 [LiveChat] Admin ${name} joined admin_room`);

      // Lấy danh sách conversation đang pending
      const pendingConversations = await Conversation.find({
        status: "pending",
      })
        .sort({ createdAt: -1 })
        .limit(50);

      callback({
        success: true,
        pendingConversations,
      });
    } catch (error) {
      console.error("❌ [LiveChat] Error admin joining room:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * ====================================================================
   * ADMIN: Nhận conversation (chuyển từ pending -> active)
   * ====================================================================
   */
  socket.on("admin:acceptConversation", async (data, callback) => {
    try {
      const { conversationId, adminId, email, name } = data;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return callback({ success: false, error: "Conversation not found" });
      }

      if (conversation.status !== "pending") {
        return callback({
          success: false,
          error: "Conversation is not pending",
        });
      }

      // Cập nhật admin và status
      conversation.admin = {
        userId: adminId,
        email,
        name,
        socketId: socket.id,
      };
      conversation.status = "active";
      await conversation.save();

      // Join vào room của conversation
      const roomName = `conversation_${conversationId}`;
      socket.join(roomName);
      socket.conversationId = conversationId;

      // Tạo tin nhắn hệ thống
      const systemMessage = new ChatMessage({
        conversationId,
        sender: {
          userId: adminId,
          role: "admin",
          name,
        },
        messageType: "system",
        content: {
          text: `${name} đã tham gia hội thoại`,
        },
        isSystem: true,
        isRead: true,
      });
      await systemMessage.save();

      // Thông báo cho user rằng admin đã join
      io.to(roomName).emit("chat:systemMessage", {
        message: systemMessage,
        adminJoined: true,
      });

      // Thông báo cho các admin khác conversation đã được nhận
      io.to("admin_room").emit("admin:conversationAccepted", {
        conversationId,
        adminName: name,
      });

      console.log(
        `✅ [LiveChat] Admin ${name} accepted conversation ${conversationId}`
      );

      callback({ success: true, conversation });
    } catch (error) {
      console.error("❌ [LiveChat] Error accepting conversation:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * ====================================================================
   * GỬI TIN NHẮN
   * ====================================================================
   */
  socket.on("chat:sendMessage", async (data, callback) => {
    try {
      const {
        conversationId,
        senderId,
        senderRole,
        senderName,
        senderAvatar,
        messageType = "text",
        content,
      } = data;

      // Kiểm tra conversation
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return callback({ success: false, error: "Conversation not found" });
      }

      // Tạo tin nhắn mới
      const message = new ChatMessage({
        conversationId,
        sender: {
          userId: senderId,
          role: senderRole,
          name: senderName,
          avatar: senderAvatar,
        },
        messageType,
        content,
        isRead: false,
      });
      await message.save();

      // Cập nhật conversation
      conversation.lastMessageAt = new Date();
      conversation.messageCount += 1;

      // Tăng unread count
      if (senderRole === "user") {
        conversation.unreadCountAdmin += 1;
      } else {
        conversation.unreadCountUser += 1;
      }

      await conversation.save();

      // Gửi tin nhắn tới room
      const roomName = `conversation_${conversationId}`;
      io.to(roomName).emit("chat:newMessage", {
        message,
        conversationId,
      });

      // Nếu là tin nhắn từ user, thông báo cho admin room
      if (senderRole === "user" && conversation.status === "active") {
        io.to("admin_room").emit("admin:newMessageNotification", {
          conversationId,
          userName: senderName,
          messagePreview: content.text?.substring(0, 50),
          timestamp: message.createdAt,
        });
      }

      console.log(
        `💬 [LiveChat] Message sent in ${conversationId} by ${senderRole}`
      );

      callback({ success: true, message });
    } catch (error) {
      console.error("❌ [LiveChat] Error sending message:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * ====================================================================
   * ĐÁNH DẤU ĐÃ ĐỌC
   * ====================================================================
   */
  socket.on("chat:markAsRead", async (data, callback) => {
    try {
      const { conversationId, role } = data;

      // Đánh dấu tất cả tin nhắn chưa đọc
      await ChatMessage.updateMany(
        {
          conversationId,
          "sender.role": role === "user" ? "admin" : "user",
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
        }
      );

      // Reset unread count
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        if (role === "user") {
          conversation.unreadCountUser = 0;
        } else {
          conversation.unreadCountAdmin = 0;
        }
        await conversation.save();
      }

      // Thông báo cho phía bên kia
      const roomName = `conversation_${conversationId}`;
      io.to(roomName).emit("chat:messagesRead", {
        conversationId,
        readBy: role,
      });

      callback({ success: true });
    } catch (error) {
      console.error("❌ [LiveChat] Error marking as read:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * ====================================================================
   * ĐÓNG CONVERSATION
   * ====================================================================
   */
  socket.on("chat:closeConversation", async (data, callback) => {
    try {
      const { conversationId, closedBy, role } = data;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return callback({ success: false, error: "Conversation not found" });
      }

      conversation.status = "closed";
      conversation.closedAt = new Date();
      conversation.closedBy = closedBy;
      await conversation.save();

      // Tạo tin nhắn hệ thống
      const systemMessage = new ChatMessage({
        conversationId,
        sender: {
          userId: closedBy,
          role,
          name:
            role === "admin" ? conversation.admin.name : conversation.user.name,
        },
        messageType: "system",
        content: {
          text: `Cuộc hội thoại đã được đóng`,
        },
        isSystem: true,
        isRead: true,
      });
      await systemMessage.save();

      // Thông báo cho cả 2 bên
      const roomName = `conversation_${conversationId}`;
      io.to(roomName).emit("chat:conversationClosed", {
        conversationId,
        closedBy: role,
        message: systemMessage,
      });

      console.log(`🔒 [LiveChat] Conversation ${conversationId} closed`);

      callback({ success: true });
    } catch (error) {
      console.error("❌ [LiveChat] Error closing conversation:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * ====================================================================
   * USER ĐÁNH GIÁ
   * ====================================================================
   */
  socket.on("chat:rateConversation", async (data, callback) => {
    try {
      const { conversationId, rating, feedback } = data;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return callback({ success: false, error: "Conversation not found" });
      }

      conversation.rating = rating;
      conversation.feedback = feedback;
      await conversation.save();

      console.log(
        `⭐ [LiveChat] Conversation ${conversationId} rated: ${rating}/5`
      );

      callback({ success: true });
    } catch (error) {
      console.error("❌ [LiveChat] Error rating conversation:", error);
      callback({ success: false, error: error.message });
    }
  });

  /**
   * ====================================================================
   * TYPING INDICATOR
   * ====================================================================
   */
  socket.on("chat:typing", (data) => {
    const { conversationId, userName, isTyping } = data;
    const roomName = `conversation_${conversationId}`;

    socket.to(roomName).emit("chat:userTyping", {
      userName,
      isTyping,
    });
  });

  /**
   * ====================================================================
   * DISCONNECT
   * ====================================================================
   */
  socket.on("disconnect", async () => {
    console.log(`❌ [LiveChat] Client disconnected: ${socket.id}`);

    // Cập nhật socketId = null khi disconnect
    if (socket.conversationId) {
      const conversation = await Conversation.findById(socket.conversationId);
      if (conversation) {
        if (socket.userRole === "user") {
          conversation.user.socketId = null;
        } else if (socket.userRole === "admin") {
          conversation.admin.socketId = null;
        }
        await conversation.save();
      }
    }
  });
}

module.exports = setupLiveChatHandlers;
