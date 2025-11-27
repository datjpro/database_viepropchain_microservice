const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chat_id: {
      type: String,
      required: true,
      index: true,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    receiver_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    // Message content - encrypted for E2EE, plaintext for server-side
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // Encryption metadata
    encryption: {
      type: {
        type: String,
        enum: ["e2ee", "server-side", "none"],
        default: "server-side",
      },
      // For E2EE: encrypted message key for each participant
      encrypted_keys: {
        type: Map,
        of: String, // userId -> encrypted AES key
      },
      // Initialization vector for AES encryption
      iv: String,
      // Public key fingerprint used
      key_version: String,
    },
    // Chat type determines encryption
    chat_type: {
      type: String,
      enum: ["private", "marketplace", "support", "dispute"],
      default: "private",
      index: true,
    },
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "file", "video"],
        },
        url: String,
        filename: String,
        size: Number,
        // Encrypted file for E2EE
        encrypted: Boolean,
        encryption_key: String, // Encrypted AES key
      },
    ],
    seen: {
      type: Boolean,
      default: false,
      index: true,
    },
    seen_at: {
      type: Date,
      default: null,
    },
    deleted_by: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    edited: {
      type: Boolean,
      default: false,
    },
    edited_at: {
      type: Date,
      default: null,
    },
    // For admin moderation (only visible in server-side chats)
    flagged: {
      type: Boolean,
      default: false,
    },
    flag_reason: String,
    reviewed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewed_at: Date,
  },
  {
    timestamps: true,
    collection: "messages",
  }
);

// Compound indexes for efficient queries
messageSchema.index({ chat_id: 1, createdAt: -1 });
messageSchema.index({ sender_id: 1, receiver_id: 1 });
messageSchema.index({ receiver_id: 1, seen: 1 });
messageSchema.index({ chat_type: 1, createdAt: -1 });
messageSchema.index({ "encryption.type": 1 });
messageSchema.index({ flagged: 1, chat_type: 1 }); // For admin moderation

// Text index for message search (only works on server-side chats)
messageSchema.index({ message: "text" });

// Virtual for created_at (alias for createdAt)
messageSchema.virtual("created_at").get(function () {
  return this.createdAt;
});

messageSchema.set("toJSON", { virtuals: true });
messageSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Message", messageSchema);
