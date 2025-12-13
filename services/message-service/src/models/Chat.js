const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    chat_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Chat type determines encryption and admin access
    chat_type: {
      type: String,
      enum: ["private", "marketplace", "support", "dispute"],
      default: "private",
      required: true,
      index: true,
    },
    // Encryption settings
    encryption_enabled: {
      type: Boolean,
      default: true, // true for private, false for marketplace/support/dispute
    },
    // Public keys of participants (for E2EE)
    participant_keys: {
      type: Map,
      of: String, // userId -> public key
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // For server-side chats, last_message is plaintext
    // For E2EE chats, last_message is "[Encrypted message]"
    last_message: {
      type: String,
      default: "",
    },
    last_message_at: {
      type: Date,
      default: Date.now,
    },
    last_message_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    unread_count: {
      type: Map,
      of: Number,
      default: {},
    },
    archived_by: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    blocked_by: {
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      blocked_at: Date,
    },
    // Admin access (only for server-side chats)
    admin_participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Dispute/Support tracking
    status: {
      type: String,
      enum: ["active", "resolved", "closed", "escalated"],
      default: "active",
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Admin/Support staff
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    metadata: {
      property_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
      nft_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NFT",
      },
      transaction_type: {
        type: String,
        enum: ["sale", "rental", "auction", "general"],
        default: "general",
      },
      // For disputes
      dispute_reason: String,
      evidence_urls: [String],
    },
  },
  {
    timestamps: true,
    collection: "chats",
  }
);

// Compound index for participant queries
chatSchema.index({ participants: 1, last_message_at: -1 });
chatSchema.index({ chat_type: 1, status: 1 });
chatSchema.index({ assigned_to: 1, status: 1 }); // For admin dashboard
chatSchema.index({ "metadata.property_id": 1 });

// Method to generate chat_id from two user IDs
chatSchema.statics.generateChatId = function (
  userId1,
  userId2,
  chatType = "private"
) {
  const sorted = [userId1.toString(), userId2.toString()].sort();
  return `${chatType}_${sorted[0]}_${sorted[1]}`;
};

// Method to increment unread count
chatSchema.methods.incrementUnread = function (userId) {
  const count = this.unread_count.get(userId.toString()) || 0;
  this.unread_count.set(userId.toString(), count + 1);
};

// Method to reset unread count
chatSchema.methods.resetUnread = function (userId) {
  this.unread_count.set(userId.toString(), 0);
};

module.exports = mongoose.model("Chat", chatSchema);
