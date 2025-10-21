/**
 * ========================================================================
 * TRANSACTION SYNC SERVICE - Save transaction history
 * ========================================================================
 */

const { Transaction } = require("../../../../shared/models");

class TransactionSyncService {
  /**
   * Save transaction to database
   */
  async saveTransaction(data) {
    try {
      const { transactionHash, type, from, to, tokenId, blockNumber, gasUsed } =
        data;

      const transaction = new Transaction({
        transactionHash,
        type,
        from,
        to,
        tokenId,
        blockNumber,
        gasUsed,
        status: "confirmed",
        timestamp: new Date(),
      });

      await transaction.save();

      return transaction;
    } catch (error) {
      // Ignore duplicate key errors (transaction already saved)
      if (error.code === 11000) {
        console.log(
          `   ⚠️  Transaction already exists: ${data.transactionHash}`
        );
        return null;
      }

      throw new Error(`Failed to save transaction: ${error.message}`);
    }
  }
}

module.exports = new TransactionSyncService();
