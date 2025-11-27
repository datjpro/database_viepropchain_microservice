const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    chat_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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
    },
  },
  {
    timestamps: true,
    collection: "chats",
  }
);

// Compound index for participant queries
chatSchema.index({ participants: 1, last_message_at: -1 });

// Method to generate chat_id from two user IDs
chatSchema.statics.generateChatId = function (userId1, userId2) {
  const sorted = [userId1.toString(), userId2.toString()].sort();
  return `chat_${sorted[0]}_${sorted[1]}`;
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
