/**
 * ========================================================================
 * ORDER CONTROLLER - Handle hybrid transactions (Web2 + Web3)
 * ========================================================================
 * Purpose: Process real estate transactions with fiat payment first,
 * then sync to blockchain asynchronously
 */

const { Order } = require("../models");
const axios = require("axios");

const BLOCKCHAIN_SERVICE_URL =
  process.env.BLOCKCHAIN_SERVICE_URL || "http://localhost:4004";
const USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || "http://localhost:4002";

class OrderController {
  /**
   * Create rent order (Utility-First approach)
   */
  async createRentOrder(req, res) {
    try {
      const { propertyId, days, paymentMethod, buyerEmail } = req.body;

      console.log(`🔄 Creating rent order for property: ${propertyId}`);

      // Get buyer info
      const userResponse = await axios.get(
        `${USER_SERVICE_URL}/api/users/email/${buyerEmail}`
      );
      const buyer = userResponse.data.data;

      // Calculate rental details
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);

      // Create order
      const order = new Order({
        buyer: {
          userId: buyer._id,
          email: buyer.email,
          name: buyer.displayName,
          walletAddress: buyer.walletAddress || buyer.custodialWallet?.address,
        },
        propertyId,
        type: "rent",
        payment: {
          method: paymentMethod || "fiat_transfer",
          amount: req.body.amount,
          currency: "VND",
          status: "pending",
        },
        rentalDetails: {
          startDate,
          endDate,
          durationDays: days,
        },
        status: "pending_payment",
      });

      await order.save();

      console.log(`   ✅ Order created: ${order.orderId}`);

      res.json({
        success: true,
        message: "Rent order created. Please complete payment.",
        data: order,
      });
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
      const { propertyId, paymentMethod, buyerEmail } = req.body;

      console.log(`🔄 Creating buy order for property: ${propertyId}`);

      // Get buyer info
      const userResponse = await axios.get(
        `${USER_SERVICE_URL}/api/users/email/${buyerEmail}`
      );
      const buyer = userResponse.data.data;

      // Create order
      const order = new Order({
        buyer: {
          userId: buyer._id,
          email: buyer.email,
          name: buyer.displayName,
          walletAddress: buyer.walletAddress || buyer.custodialWallet?.address,
        },
        propertyId,
        type: "buy",
        payment: {
          method: paymentMethod || "fiat_transfer",
          amount: req.body.amount,
          currency: "VND",
          status: "pending",
        },
        status: "pending_payment",
      });

      await order.save();

      console.log(`   ✅ Order created: ${order.orderId}`);

      res.json({
        success: true,
        message: "Buy order created. Please complete payment.",
        data: order,
      });
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
      setTimeout(() => {
        this.syncToBlockchain(orderId);
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
        const response = await axios.post(
          `${BLOCKCHAIN_SERVICE_URL}/api/blockchain/set-user`,
          {
            propertyId: order.propertyId.toString(),
            userAddress: order.buyer.walletAddress,
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
            toAddress: order.buyer.walletAddress,
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
