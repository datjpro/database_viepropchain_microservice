/**
 * ========================================================================
 * EVENT LISTENER SERVICE - Listen to blockchain events
 * ========================================================================
 */

const { provider, contract, POLL_INTERVAL } = require("../config/blockchain");
const eventProcessorService = require("./eventProcessorService");

class EventListenerService {
  constructor() {
    this.lastProcessedBlock = 0;
    this.isProcessing = false;
    this.pollInterval = null;
  }

  /**
   * Initialize last processed block from database
   */
  async initializeLastBlock() {
    try {
      const { Transaction } = require("../../../../shared/models");

      const latestTransaction = await Transaction.findOne()
        .sort({ blockNumber: -1 })
        .select("blockNumber");

      if (latestTransaction) {
        this.lastProcessedBlock = latestTransaction.blockNumber;
        console.log(`📌 Resuming from block ${this.lastProcessedBlock}`);
      } else {
        const currentBlock = await provider.getBlockNumber();
        this.lastProcessedBlock = currentBlock;
        console.log(`📌 Starting from current block ${currentBlock}`);
      }
    } catch (error) {
      console.error("❌ Error initializing last block:", error);
      const currentBlock = await provider.getBlockNumber();
      this.lastProcessedBlock = currentBlock;
    }
  }

  /**
   * Poll for new events
   */
  async pollEvents() {
    if (this.isProcessing) {
      console.log("⏭️  Skipping poll - previous poll still processing");
      return;
    }

    this.isProcessing = true;

    try {
      const currentBlock = await provider.getBlockNumber();

      if (currentBlock <= this.lastProcessedBlock) {
        this.isProcessing = false;
        return;
      }

      console.log(
        `\n🔍 Polling blocks ${
          this.lastProcessedBlock + 1
        } to ${currentBlock}...`
      );

      // Query Transfer events
      const transferFilter = contract.filters.Transfer();
      const events = await contract.queryFilter(
        transferFilter,
        this.lastProcessedBlock + 1,
        currentBlock
      );

      if (events.length > 0) {
        console.log(`📦 Found ${events.length} Transfer event(s)`);

        for (const event of events) {
          await eventProcessorService.processTransferEvent(event, contract);
        }
      }

      // Update last processed block
      this.lastProcessedBlock = currentBlock;
    } catch (error) {
      console.error("❌ Error polling events:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start listening
   */
  async start() {
    try {
      // Initialize last processed block
      await this.initializeLastBlock();

      // Start polling
      console.log(
        `\n✅ Indexer service started - polling every ${POLL_INTERVAL}ms\n`
      );

      this.pollInterval = setInterval(() => this.pollEvents(), POLL_INTERVAL);

      // Initial poll
      await this.pollEvents();
    } catch (error) {
      console.error("❌ Error starting listener:", error);
      throw error;
    }
  }

  /**
   * Stop listening
   */
  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      console.log("🛑 Event listener stopped");
    }
  }
}

module.exports = new EventListenerService();
