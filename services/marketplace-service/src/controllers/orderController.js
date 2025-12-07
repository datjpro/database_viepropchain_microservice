/**
 * ========================================================================
 * ORDER CONTROLLER - Handle hybrid transactions (Web2 + Web3)
 * ========================================================================
 * Purpose: Process real estate transactions with fiat payment first,
 * then sync to blockchain asynchronously
 */

const { Order, Listing } = require("../models");
const axios = require("axios");

const BLOCKCHAIN_SERVICE_URL =
  process.env.BLOCKCHAIN_SERVICE_URL || "http://localhost:4004";
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:4006";
const ADMIN_SERVICE_URL =
  process.env.ADMIN_SERVICE_URL || "http://localhost:4003";

class OrderController {
  /**
   * Create rent order (Utility-First approach)
   */
  async createRentOrder(req, res) {
    try {
      const { propertyId, tokenId, days, paymentMethod, buyerEmail, amount } =
        req.body;

      console.log(
        `🔄 Creating rent order for property: ${propertyId}, tokenId: ${tokenId}`
      );

      // Validate tokenId
      if (tokenId === undefined || tokenId === null) {
        return res.status(400).json({
          success: false,
          error: "tokenId is required for NFT rental",
        });
      }

      // Generate orderId
      const orderId = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Calculate rental details
      const startDate = new Date();
      const endDate = new Date(
        startDate.getTime() + days * 24 * 60 * 60 * 1000
      );

      // Create order directly without user service
      const order = new Order({
        orderId: orderId,
        buyer: {
          userId: "temp_user_id",
          email: buyerEmail,
          name: "User",
          walletAddress: "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13",
        },
        propertyId,
        tokenId: tokenId,
        type: "rent",
        payment: {
          method: paymentMethod || "crypto",
          amount: amount,
          currency: "VND",
          status: "paid",
        },
        rentalDetails: {
          startDate,
          endDate,
          durationDays: days,
        },
        status: "payment_confirmed",
      });

      await order.save();

      console.log(
        `   ✅ Rent order created: ${order.orderId} with tokenId: ${order.tokenId}`
      );

      // Send response first
      res.json({
        success: true,
        message: "Rent order created successfully!",
        data: order,
      });

      // Auto trigger blockchain sync (non-blocking)
      console.log(
        `🔗 Scheduling blockchain rental sync for ${order.orderId}...`
      );
      const savedOrderId = order.orderId;
      setTimeout(async () => {
        console.log(
          `⏳ Starting blockchain rental sync for ${savedOrderId}...`
        );
        try {
          const order = await Order.findOne({ orderId: savedOrderId });
          if (!order) {
            console.error(`❌ Order ${savedOrderId} not found`);
            return;
          }

          console.log(`📡 Calling blockchain service for rental setUser...`);
          console.log(`   TokenId: ${order.tokenId}`);
          console.log(`   Renter: ${order.buyer.walletAddress}`);
          console.log(`   Expires: ${order.rentalDetails.endDate}`);

          const response = await axios.post(
            `${BLOCKCHAIN_SERVICE_URL}/set-user`,
            {
              tokenId: order.tokenId,
              user: order.buyer.walletAddress,
              expires: Math.floor(order.rentalDetails.endDate.getTime() / 1000),
            }
          );

          if (response.data.success) {
            console.log(
              `✅ Blockchain rental sync completed for ${savedOrderId}`
            );
            console.log(`   TX Hash: ${response.data.data.transactionHash}`);
          } else {
            console.error(
              `❌ Blockchain rental sync failed: ${response.data.error}`
            );
          }
        } catch (syncError) {
          console.error(
            `❌ Blockchain rental sync failed for ${savedOrderId}:`,
            syncError.message
          );
          console.error("Full error:", syncError);
        }
      }, 500);
    } catch (error) {
      console.error("❌ Create rent order error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to create rent order",
        message: error.message,
      });
    }
  }

  /**
   * Create buy order
   */
  async createBuyOrder(req, res) {
    try {
      const { propertyId, tokenId, buyerEmail, amount, paymentMethod } =
        req.body;

      console.log(
        `🔄 Creating buy order for property: ${propertyId}, tokenId: ${tokenId}`
      );

      // Validate tokenId
      if (tokenId === undefined || tokenId === null) {
        return res.status(400).json({
          success: false,
          error: "tokenId is required for NFT purchase",
        });
      }

      // Generate orderId
      const orderId = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Create order directly without user service check
      const order = new Order({
        orderId: orderId,
        buyer: {
          userId: "temp_user_id",
          email: buyerEmail,
          name: "User",
          walletAddress: "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13",
        },
        propertyId,
        tokenId: tokenId, // Add tokenId to order
        type: "buy",
        payment: {
          method: paymentMethod || "crypto",
          amount: amount,
          currency: "VND",
          status: "paid", // Auto-paid for crypto
        },
        status: "payment_confirmed",
      });

      await order.save();

      console.log(
        `   ✅ Order created: ${order.orderId} with tokenId: ${order.tokenId}`
      );

      // Send response first
      res.json({
        success: true,
        message: "Buy order created successfully!",
        data: order,
      });

      // Auto trigger blockchain sync (non-blocking)
      console.log(`🔗 Scheduling blockchain sync for ${order.orderId}...`);
      const savedOrderId = order.orderId;
      setTimeout(async () => {
        console.log(`⏳ Starting blockchain sync for ${savedOrderId}...`);
        try {
          // Call blockchain service directly
          const order = await Order.findOne({ orderId: savedOrderId });
          if (!order) {
            console.error(`❌ Order ${savedOrderId} not found`);
            return;
          }

          console.log(`📡 Calling blockchain service for NFT transfer...`);

          // Get current owner from blockchain
          const ownerResponse = await axios.get(
            `${BLOCKCHAIN_SERVICE_URL}/nft/${order.tokenId}`
          );

          const currentOwner = ownerResponse.data.data.owner;
          console.log(`   Current owner: ${currentOwner}`);
          console.log(`   Transfer to: ${order.buyer.walletAddress}`);

          const response = await axios.post(
            `${BLOCKCHAIN_SERVICE_URL}/transfer`,
            {
              from: currentOwner,
              to: order.buyer.walletAddress,
              tokenId: order.tokenId,
            }
          );

          if (response.data.success) {
            order.blockchainStatus = "synced";
            order.transactionHash = response.data.data.transactionHash;
            await order.save();

            // ✅ Update listing status to SOLD
            console.log(
              `📝 Updating listing status to SOLD for tokenId: ${order.tokenId}...`
            );
            const listing = await Listing.findOne({
              tokenId: order.tokenId,
              status: "active",
            });
            if (listing) {
              listing.status = "sold";
              listing.soldAt = new Date();
              listing.soldTo = {
                address: order.buyer.walletAddress,
                email: order.buyer.email,
                name: order.buyer.name,
              };
              listing.salePrice = order.payment.amount;
              listing.saleTransactionHash = response.data.data.transactionHash;
              await listing.save();
              console.log(`   ✅ Listing ${listing._id} marked as SOLD`);
            } else {
              console.warn(
                `   ⚠️ No active listing found for tokenId: ${order.tokenId}`
              );
            }

            console.log(`✅ Blockchain sync completed for ${savedOrderId}`);
            console.log(`   TX Hash: ${response.data.data.transactionHash}`);
            console.log(`   Block: ${response.data.data.blockNumber}`);
          } else {
            console.error(
              `❌ Blockchain transfer failed: ${response.data.error}`
            );
          }
        } catch (syncError) {
          console.error(
            `❌ Blockchain sync failed for ${savedOrderId}:`,
            syncError.message
          );
          console.error("Full error:", syncError);
        }
      }, 500);
    } catch (error) {
      console.error("❌ Create buy order error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to create buy order",
        message: error.message,
      });
    }
  }

  /**
   * Confirm payment (Admin action)
   */
  async confirmPayment(req, res) {
    try {
      const { orderId } = req.params;
      const { proofImage, adminId } = req.body;

      console.log(`🔄 Confirming payment for order: ${orderId}`);

      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      // Update payment status
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
      order.payment.proofImage = proofImage;
      order.payment.confirmedBy = adminId;
      order.status = "payment_confirmed";

      await order.save();

      console.log(`   ✅ Payment confirmed for order: ${orderId}`);

      // Trigger blockchain sync in background
      const controller = this;
      setTimeout(() => {
        controller.syncToBlockchain(orderId);
      }, 1000);

      res.json({
        success: true,
        message: "Payment confirmed. Syncing to blockchain...",
        data: order,
      });
    } catch (error) {
      console.error("❌ Confirm payment error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to confirm payment",
        message: error.message,
      });
    }
  }

  /**
   * Sync transaction to blockchain (Background job)
   */
  async syncToBlockchain(orderId) {
    try {
      console.log(`🔗 Syncing order to blockchain: ${orderId}`);

      const order = await Order.findOne({ orderId });
      if (!order) {
        console.error(`Order not found: ${orderId}`);
        return;
      }

      order.status = "blockchain_syncing";
      order.blockchainSync.lastRetryAt = new Date();
      await order.save();

      if (order.type === "rent") {
        // Call blockchain service to set user (ERC4907)
        console.log(
          `   🏠 Syncing rent to blockchain for tokenId: ${order.tokenId}`
        );

        const response = await axios.post(
          `${BLOCKCHAIN_SERVICE_URL}/set-user`,
          {
            tokenId: order.tokenId,
            user:
              order.buyer.walletAddress ||
              "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13",
            expires: Math.floor(order.rentalDetails.endDate.getTime() / 1000),
          }
        );

        // Update order with blockchain data
        order.blockchainSync.isSynced = true;
        order.blockchainSync.txHash = response.data.transactionHash;
        order.blockchainSync.syncedAt = new Date();
        order.status = "completed";
        order.completedAt = new Date();

        await order.save();

        console.log(`   ✅ Rent synced to blockchain: ${order.orderId}`);
      } else if (order.type === "buy") {
        // Call blockchain service to transfer NFT
        const response = await axios.post(
          `${BLOCKCHAIN_SERVICE_URL}/api/blockchain/transfer-nft`,
          {
            propertyId: order.propertyId.toString(),
            toAddress:
              order.buyer.walletAddress ||
              "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13",
          }
        );

        // Update order with blockchain data
        order.blockchainSync.isSynced = true;
        order.blockchainSync.txHash = response.data.transactionHash;
        order.blockchainSync.syncedAt = new Date();
        order.status = "completed";
        order.completedAt = new Date();

        await order.save();

        console.log(`   ✅ Sale synced to blockchain: ${order.orderId}`);
      }
    } catch (error) {
      console.error(`❌ Blockchain sync failed for ${orderId}:`, error.message);

      // Update order with error
      const order = await Order.findOne({ orderId });
      if (order) {
        order.blockchainSync.errorLog = error.message;
        order.blockchainSync.retryCount += 1;
        order.status = "failed";
        await order.save();
      }
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(req, res) {
    try {
      const { orderId } = req.params;

      const order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("❌ Get order error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get order",
        message: error.message,
      });
    }
  }

  /**
   * Get orders by buyer
   */
  async getOrdersByBuyer(req, res) {
    try {
      const { userId } = req.params;

      const orders = await Order.find({ "buyer.userId": userId }).sort({
        createdAt: -1,
      });

      res.json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      console.error("❌ Get buyer orders error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get orders",
        message: error.message,
      });
    }
  }

  /**
   * Get pending orders (for admin)
   */
  async getPendingOrders(req, res) {
    try {
      const orders = await Order.find({
        "payment.status": "pending",
      }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      console.error("❌ Get pending orders error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get pending orders",
        message: error.message,
      });
    }
  }

  /**
   * Retry blockchain sync
   */
  async retrySync(req, res) {
    try {
      const { orderId } = req.params;

      console.log(`🔄 Retrying blockchain sync for: ${orderId}`);

      // Trigger sync
      this.syncToBlockchain(orderId);

      res.json({
        success: true,
        message: "Blockchain sync retry initiated",
      });
    } catch (error) {
      console.error("❌ Retry sync error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to retry sync",
        message: error.message,
      });
    }
  }
}

module.exports = new OrderController();
