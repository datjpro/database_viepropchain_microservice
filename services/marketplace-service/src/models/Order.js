/**
 * ========================================================================
 * ORDER MODEL - Hybrid Transaction Management (Web2 + Web3)
 * ========================================================================
 * Purpose: Handle real estate transactions with fiat payment first,
 * then sync to blockchain asynchronously
 */

const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    // Order Identification
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Transaction Parties
    buyer: {
      userId: {
        type: String,
        required: false,
        index: true,
      },
      email: String,
      name: String,
      walletAddress: {
        type: String,
        lowercase: true,
      },
    },

    // Property Reference
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    tokenId: {
      type: Number,
      required: false,
      index: true,
    },
    listingRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: false,
    },

    // Transaction Type
    type: {
      type: String,
      enum: ["rent", "buy"],
      required: true,
      index: true,
    },

    // Payment Information (Web2 Layer)
    payment: {
      method: {
        type: String,
        enum: ["fiat_transfer", "cash", "crypto", "stablecoin"],
        required: true,
        default: "fiat_transfer",
      },
      amount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: "VND",
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
        index: true,
      },
      proofImage: {
        type: String,
        description: "Image URL of payment receipt/bank transfer proof",
      },
      paidAt: Date,
      confirmedBy: {
        type: mongoose.Schema.Types.ObjectId,
        description: "Admin who confirmed the payment",
      },
    },

    // Rental Details (for type: 'rent')
    rentalDetails: {
      startDate: {
        type: Date,
        required: function () {
          return this.type === "rent";
        },
      },
      endDate: {
        type: Date,
        required: function () {
          return this.type === "rent";
        },
      },
      durationDays: {
        type: Number,
        required: function () {
          return this.type === "rent";
        },
      },
    },

    // Blockchain Synchronization (Web3 Layer)
    blockchainSync: {
      isSynced: {
        type: Boolean,
        default: false,
        index: true,
      },
      txHash: {
        type: String,
        description: "Blockchain transaction hash",
      },
      syncedAt: Date,
      errorLog: {
        type: String,
        description: "Error message if sync failed",
      },
      retryCount: {
        type: Number,
        default: 0,
      },
      lastRetryAt: Date,
    },

    // Order Status
    status: {
      type: String,
      enum: [
        "pending_payment",
        "payment_confirmed",
        "blockchain_syncing",
        "completed",
        "cancelled",
        "failed",
      ],
      default: "pending_payment",
      index: true,
    },

    // Additional Info
    notes: String,
    cancelReason: String,
    cancelledAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes for queries
orderSchema.index({ "buyer.userId": 1, status: 1 });
orderSchema.index({ propertyId: 1, type: 1 });
orderSchema.index({ "payment.status": 1, createdAt: -1 });
orderSchema.index({ "blockchainSync.isSynced": 1 });
orderSchema.index({ status: 1, createdAt: -1 });

// Pre-save hook to generate orderId
orderSchema.pre("save", function (next) {
  if (!this.orderId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    this.orderId = `ORD-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
