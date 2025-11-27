import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { API_GATEWAY_URL } from "../config/api";
import "./Chat.css";

const Chat = ({ receiverId, receiverName }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom when new message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem("viepropchain_token");

    if (!token || !receiverId) return;

    // Connect to WebSocket
    const newSocket = io("http://localhost:4008", {
      auth: { token },
    });

    newSocket.on("connect", () => {
      console.log("✅ Connected to chat server");
      setIsConnected(true);
      loadChatHistory();
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected from chat server");
      setIsConnected(false);
    });

    // Receive new message
    newSocket.on("new_message", (data) => {
      console.log("📩 New message received:", data);
      setMessages((prev) => [...prev, data.data]);
    });

    // Message sent confirmation
    newSocket.on("message_sent", (data) => {
      console.log("✅ Message sent:", data);
      // Message already added via optimistic update
    });

    // Typing indicator
    newSocket.on("user_typing", (data) => {
      console.log(`${data.email} is typing...`);
      setIsTyping(true);
    });

    newSocket.on("user_stop_typing", () => {
      setIsTyping(false);
    });

    // Messages seen
    newSocket.on("messages_seen", (data) => {
      console.log("Messages seen:", data);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.chat_id === data.chat_id ? { ...msg, seen: true } : msg
        )
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [receiverId]);

  // Load chat history from API
  const loadChatHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("viepropchain_token");

      const response = await fetch(
        `${API_GATEWAY_URL}/api/messages/chats/${receiverId}/messages?limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !socket) return;

    const messageData = {
      receiver_id: receiverId,
      message: newMessage.trim(),
    };

    // Optimistic update
    const tempMessage = {
      _id: Date.now(),
      message: newMessage.trim(),
      sender_id: { _id: "me" },
      receiver_id: { _id: receiverId },
      createdAt: new Date(),
      seen: false,
    };

    setMessages((prev) => [...prev, tempMessage]);

    // Send via socket
    socket.emit("send_message", messageData);

    // Clear input
    setNewMessage("");

    // Stop typing
    socket.emit("stop_typing", { receiver_id: receiverId });
  };

  // Handle typing
  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!socket) return;

    // Send typing indicator
    socket.emit("typing", { receiver_id: receiverId });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { receiver_id: receiverId });
    }, 2000);
  };

  // Mark as seen when user views chat
  useEffect(() => {
    if (messages.length > 0 && socket) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.receiver_id._id === "me" && !lastMessage.seen) {
        const chat_id = `chat_${[receiverId, "me"].sort().join("_")}`;
        socket.emit("mark_seen", { chat_id });
      }
    }
  }, [messages, socket, receiverId]);

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-user-info">
          <h3>{receiverName}</h3>
          <span className={`status ${isConnected ? "online" : "offline"}`}>
            {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.sender_id._id === "me";
            return (
              <div
                key={msg._id || index}
                className={`message ${
                  isMine ? "message-mine" : "message-theirs"
                }`}
              >
                <div className="message-content">
                  <p>{msg.message}</p>
                  <div className="message-meta">
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMine && (
                      <span className="message-status">
                        {msg.seen ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="message message-theirs">
            <div className="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-input" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Nhập tin nhắn..."
          disabled={!isConnected}
        />
        <button type="submit" disabled={!newMessage.trim() || !isConnected}>
          Gửi
        </button>
      </form>
    </div>
  );
};

export default Chat;
