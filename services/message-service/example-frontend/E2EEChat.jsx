import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import E2EECrypto from "./e2eeCrypto";

const API_BASE_URL = "http://localhost:4008";
const TOKEN = localStorage.getItem("token"); // JWT token

const E2EEChat = ({ currentUserId, recipientId, chatType = "private" }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState(null);
  const [crypto] = useState(new E2EECrypto());
  const [isInitialized, setIsInitialized] = useState(false);
  const [recipientPublicKey, setRecipientPublicKey] = useState(null);
  const messagesEndRef = useRef(null);

  // Initialize E2EE
  useEffect(() => {
    const initE2EE = async () => {
      try {
        // Load or generate keys
        let privateKey = await crypto.loadPrivateKey();
        if (!privateKey) {
          console.log("Generating new key pair...");
          const { publicKey } = await crypto.generateKeyPair();
          await crypto.storePrivateKey(crypto.privateKey);

          // Register public key with server
          await axios.post(
            `${API_BASE_URL}/api/messages/keys/register`,
            {
              public_key: publicKey,
              device_name: navigator.userAgent,
              platform: "web",
            },
            {
              headers: { Authorization: `Bearer ${TOKEN}` },
            }
          );
          console.log("Public key registered");
        }

        // Get recipient's public key
        if (chatType === "private") {
          const response = await axios.get(
            `${API_BASE_URL}/api/messages/keys/${recipientId}`,
            {
              headers: { Authorization: `Bearer ${TOKEN}` },
            }
          );

          if (response.data.public_key) {
            const importedKey = await crypto.importPublicKey(
              response.data.public_key
            );
            setRecipientPublicKey(importedKey);
            console.log("Recipient public key loaded");
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("E2EE initialization failed:", error);
      }
    };

    initE2EE();
  }, [recipientId, chatType]);

  // Initialize Socket.IO
  useEffect(() => {
    const newSocket = io(API_BASE_URL, {
      auth: { token: TOKEN },
    });

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    newSocket.on("new_message", async (data) => {
      console.log("Received message:", data);

      // Decrypt if E2EE message
      if (data.encryption && data.encryption.type === "e2ee") {
        try {
          // Decrypt AES key with our private key
          const encryptedKeyForMe =
            data.encryption.encrypted_keys[currentUserId];
          if (!encryptedKeyForMe) {
            console.error("No encrypted key for current user");
            return;
          }

          const aesKey = await crypto.decryptAESKey(encryptedKeyForMe);

          // Decrypt message content
          const plaintext = await crypto.decryptMessage(
            data.content,
            aesKey,
            data.encryption.iv
          );

          setMessages((prev) => [
            ...prev,
            { ...data, decryptedContent: plaintext },
          ]);
        } catch (error) {
          console.error("Failed to decrypt message:", error);
          setMessages((prev) => [
            ...prev,
            { ...data, decryptedContent: "[Decryption Failed]" },
          ]);
        }
      } else {
        // Plain text message
        setMessages((prev) => [...prev, data]);
      }
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [currentUserId]);

  // Load chat history
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/messages/chat/${recipientId}`,
          {
            headers: { Authorization: `Bearer ${TOKEN}` },
          }
        );

        // Decrypt messages
        const decryptedMessages = await Promise.all(
          response.data.messages.map(async (msg) => {
            if (msg.encryption && msg.encryption.type === "e2ee") {
              try {
                const encryptedKeyForMe =
                  msg.encryption.encrypted_keys[currentUserId];
                const aesKey = await crypto.decryptAESKey(encryptedKeyForMe);
                const plaintext = await crypto.decryptMessage(
                  msg.content,
                  aesKey,
                  msg.encryption.iv
                );
                return { ...msg, decryptedContent: plaintext };
              } catch (error) {
                console.error("Failed to decrypt message:", error);
                return { ...msg, decryptedContent: "[Decryption Failed]" };
              }
            }
            return msg;
          })
        );

        setMessages(decryptedMessages);
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
    };

    if (isInitialized) {
      loadMessages();
    }
  }, [recipientId, isInitialized]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isInitialized) return;

    try {
      let messageData;

      if (chatType === "private") {
        // E2EE encryption
        if (!recipientPublicKey) {
          alert("Recipient public key not available");
          return;
        }

        // Encrypt message with AES
        const { encrypted, aesKey, iv } = await crypto.encryptMessage(
          newMessage
        );

        // Encrypt AES key for both participants
        const encryptedKeys = {};

        // For current user (self)
        const myPublicKeyResponse = await axios.get(
          `${API_BASE_URL}/api/messages/keys/me`,
          {
            headers: { Authorization: `Bearer ${TOKEN}` },
          }
        );
        const myPublicKey = await crypto.importPublicKey(
          myPublicKeyResponse.data.public_key
        );
        encryptedKeys[currentUserId] = await crypto.encryptAESKey(
          aesKey,
          myPublicKey
        );

        // For recipient
        encryptedKeys[recipientId] = await crypto.encryptAESKey(
          aesKey,
          recipientPublicKey
        );

        messageData = {
          recipient_id: recipientId,
          content: encrypted,
          chat_type: "private",
          encryption: {
            type: "e2ee",
            encrypted_keys: encryptedKeys,
            iv: iv,
          },
        };
      } else {
        // Server-side (plain text)
        messageData = {
          recipient_id: recipientId,
          content: newMessage,
          chat_type: chatType,
        };
      }

      // Send via REST API
      const response = await axios.post(
        `${API_BASE_URL}/api/messages/send`,
        messageData,
        {
          headers: { Authorization: `Bearer ${TOKEN}` },
        }
      );

      // Add to local messages
      if (chatType === "private") {
        setMessages((prev) => [
          ...prev,
          { ...response.data.message, decryptedContent: newMessage },
        ]);
      } else {
        setMessages((prev) => [...prev, response.data.message]);
      }

      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message");
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "10px",
        }}
      >
        <div
          style={{
            background: chatType === "private" ? "#e8f5e9" : "#e3f2fd",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "10px",
          }}
        >
          <strong>
            {chatType === "private"
              ? "🔒 E2EE Private Chat"
              : "💬 Server-Side Chat"}
          </strong>
          <br />
          <small>
            {chatType === "private"
              ? "End-to-end encrypted. Admin cannot read."
              : "Plain text. Admin can view for moderation."}
          </small>
        </div>

        <div
          style={{
            height: "400px",
            overflowY: "auto",
            border: "1px solid #eee",
            padding: "10px",
            marginBottom: "10px",
            background: "#f9f9f9",
          }}
        >
          {messages.map((msg) => (
            <div
              key={msg._id}
              style={{
                marginBottom: "10px",
                textAlign: msg.sender_id === currentUserId ? "right" : "left",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  maxWidth: "70%",
                  padding: "8px 12px",
                  borderRadius: "12px",
                  background:
                    msg.sender_id === currentUserId ? "#007bff" : "#e0e0e0",
                  color: msg.sender_id === currentUserId ? "white" : "black",
                }}
              >
                <div>
                  {msg.encryption && msg.encryption.type === "e2ee"
                    ? msg.decryptedContent || "[Encrypted]"
                    : msg.content}
                </div>
                <small style={{ fontSize: "10px", opacity: 0.7 }}>
                  {new Date(msg.created_at).toLocaleTimeString()}
                </small>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage}>
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={
                isInitialized
                  ? "Type a message..."
                  : "Initializing encryption..."
              }
              disabled={!isInitialized}
              style={{
                flex: 1,
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <button
              type="submit"
              disabled={!isInitialized || !newMessage.trim()}
              style={{
                padding: "10px 20px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isInitialized ? "pointer" : "not-allowed",
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default E2EEChat;
