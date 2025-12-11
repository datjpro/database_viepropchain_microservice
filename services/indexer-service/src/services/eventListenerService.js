/**
 * ========================================================================
 * EVENT LISTENER SERVICE - Listen to blockchain events
 * ========================================================================
 */

const {
  provider,
  contract,
  POLL_INTERVAL,
  marketplaceContract,
  nftContract,
} = require("../config/blockchain");
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
      const Transaction = require("../models/Transaction");

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

      // Query Marketplace events (ItemListed, ItemSold, ItemRented, ListingCancelled)
      try {
        const listedFilter = marketplaceContract.filters.ItemListed();
        const soldFilter = marketplaceContract.filters.ItemSold();
        const rentedFilter = marketplaceContract.filters.ItemRented();
        const cancelledFilter = marketplaceContract.filters.ListingCancelled();

        const listedEvents = await marketplaceContract.queryFilter(
          listedFilter,
          this.lastProcessedBlock + 1,
          currentBlock
        );

        if (listedEvents.length > 0) {
          console.log(`📦 Found ${listedEvents.length} ItemListed event(s)`);
          for (const ev of listedEvents) {
            await eventProcessorService.processItemListed(
              ev,
              marketplaceContract
            );
          }
        }

        const soldEvents = await marketplaceContract.queryFilter(
          soldFilter,
          this.lastProcessedBlock + 1,
          currentBlock
        );
        if (soldEvents.length > 0) {
          console.log(`📦 Found ${soldEvents.length} ItemSold event(s)`);
          for (const ev of soldEvents) {
            await eventProcessorService.processItemSold(
              ev,
              marketplaceContract
            );
          }
        }

        const rentedEvents = await marketplaceContract.queryFilter(
          rentedFilter,
          this.lastProcessedBlock + 1,
          currentBlock
        );
        if (rentedEvents.length > 0) {
          console.log(`📦 Found ${rentedEvents.length} ItemRented event(s)`);
          for (const ev of rentedEvents) {
            await eventProcessorService.processItemRented(
              ev,
              marketplaceContract
            );
          }
        }

        const cancelledEvents = await marketplaceContract.queryFilter(
          cancelledFilter,
          this.lastProcessedBlock + 1,
          currentBlock
        );
        if (cancelledEvents.length > 0) {
          console.log(
            `📦 Found ${cancelledEvents.length} ListingCancelled event(s)`
          );
          for (const ev of cancelledEvents) {
            await eventProcessorService.processListingCancelled(
              ev,
              marketplaceContract
            );
          }
        }
      } catch (err) {
        console.error(
          "❌ Error querying marketplace events:",
          err.message || err
        );
      }

      // Query ERC-4907 UpdateUser events from NFT contract
      try {
        const updateUserFilter = nftContract.filters.UpdateUser();
        const updateEvents = await nftContract.queryFilter(
          updateUserFilter,
          this.lastProcessedBlock + 1,
          currentBlock
        );
        if (updateEvents.length > 0) {
          console.log(`📦 Found ${updateEvents.length} UpdateUser event(s)`);
          for (const ev of updateEvents) {
            await eventProcessorService.processUpdateUserEvent(ev, nftContract);
          }
        }
      } catch (err) {
        console.error(
          "❌ Error querying UpdateUser events:",
          err.message || err
        );
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
