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
    message: {
      type: String,
      required: true,
      trim: true,
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

// Text index for message search
messageSchema.index({ message: "text" });

// Virtual for created_at (alias for createdAt)
messageSchema.virtual("created_at").get(function () {
  return this.createdAt;
});

messageSchema.set("toJSON", { virtuals: true });
messageSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Message", messageSchema);
