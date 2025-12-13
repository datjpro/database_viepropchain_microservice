const mongoose = require("mongoose");

const userKeySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: "User",
      index: true,
    },
    public_key: {
      type: String,
      required: true,
    },
    key_version: {
      type: Number,
      default: 1,
    },
    key_fingerprint: {
      type: String,
      required: true,
      index: true,
    },
    device_info: {
      device_id: String,
      device_name: String,
      platform: String,
    },
    active: {
      type: Boolean,
      default: true,
    },
    last_used: {
      type: Date,
      default: Date.now,
    },
    revoked_at: Date,
    revoke_reason: String,
  },
  {
    timestamps: true,
    collection: "user_encryption_keys",
  }
);

// Index for active key lookup
userKeySchema.index({ user_id: 1, active: 1 });

module.exports = mongoose.model("UserKey", userKeySchema);
