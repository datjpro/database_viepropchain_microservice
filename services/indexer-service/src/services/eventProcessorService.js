/**
 * ========================================================================
 * EVENT PROCESSOR SERVICE - Process blockchain events
 * ========================================================================
 */

const { ethers } = require("ethers");
const nftSyncService = require("./nftSyncService");
const transactionSyncService = require("./transactionSyncService");

class EventProcessorService {
  /**
   * Process Transfer event
   */
  async processTransferEvent(event, contract) {
    try {
      const { from, to, tokenId } = event.args;
      const tokenIdNumber = Number(tokenId);

      console.log(
        `   🔄 Processing Transfer: Token ${tokenIdNumber} from ${from} to ${to}`
      );

      // Get transaction details
      const tx = await event.getTransaction();
      const receipt = await event.getTransactionReceipt();

      // Sync NFT
      const isMint = from === ethers.ZeroAddress;
      await nftSyncService.syncNFT({
        tokenId: tokenIdNumber,
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        transactionHash: tx.hash,
        blockNumber: event.blockNumber,
        contract,
        isMint,
      });

      // Save transaction
      await transactionSyncService.saveTransaction({
        transactionHash: tx.hash,
        type: isMint ? "mint" : "transfer",
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        tokenId: tokenIdNumber,
        blockNumber: event.blockNumber,
        gasUsed: receipt ? Number(receipt.gasUsed) : 0,
      });

      console.log(`   ✅ Transaction saved: ${tx.hash}`);
    } catch (error) {
      console.error("   ❌ Error processing Transfer event:", error);
    }
  }
}

module.exports = new EventProcessorService();
