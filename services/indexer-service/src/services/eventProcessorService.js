/**
 * ========================================================================
 * EVENT PROCESSOR SERVICE - Process blockchain events
 * ========================================================================
 */

const { ethers } = require("ethers");
const nftSyncService = require("./nftSyncService");
const transactionSyncService = require("./transactionSyncService");
const Listing = require("../models/Listing");
const SaleHistory = require("../models/SaleHistory");
const NFT = require("../models/NFT");

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

  /**
   * Process ItemListed event from Marketplace
   */
  async processItemListed(event, contract) {
    try {
      const { listingId, seller, tokenId, price, listingType } = event.args;
      console.log(
        `   🏷️ Processing ItemListed: listing ${Number(
          listingId
        )} token ${Number(tokenId)} by ${seller}`
      );

      // Upsert listing in indexer DB
      await Listing.updateOne(
        { listingId: Number(listingId) },
        {
          $set: {
            listingId: Number(listingId),
            contractAddress: contract.target || contract.address || null,
            tokenId: Number(tokenId),
            seller: seller.toLowerCase(),
            listingType: Number(listingType) === 0 ? "sale" : "rental",
            price: String(price),
            status: "Active",
            blockNumber: event.blockNumber,
          },
        },
        { upsert: true }
      );

      // Update NFT doc to reflect listed state
      await NFT.updateOne(
        { tokenId: Number(tokenId) },
        {
          $set: {
            isListed: true,
            listingType: Number(listingType) === 0 ? "sale" : "rental",
            currentPrice: String(price),
            activeListingId: Number(listingId),
          },
        }
      );
    } catch (err) {
      console.error("   ❌ Error processing ItemListed:", err);
    }
  }

  /**
   * Process ItemSold event from Marketplace
   */
  async processItemSold(event, contract) {
    try {
      const { listingId, buyer, tokenId } = event.args;
      console.log(
        `   💰 Processing ItemSold: listing ${Number(listingId)} token ${Number(
          tokenId
        )} to ${buyer}`
      );

      // Get transaction details
      const tx = await event.getTransaction();

      // Find the listing by listingId if available, otherwise by tokenId
      let listing = null;
      if (Number(listingId) !== 0) {
        listing = await Listing.findOne({ listingId: Number(listingId) });
      }
      if (!listing) {
        listing = await Listing.findOne({ tokenId: Number(tokenId) }).sort({
          createdAt: -1,
        });
      }

      // Update listing status
      if (listing) {
        listing.status = "sold";
        listing.buyer = { walletAddress: buyer.toLowerCase() };
        listing.transactionHash = tx.hash;
        listing.soldAt = new Date();
        listing.blockNumber = event.blockNumber;
        await listing.save();
      }

      // Update NFT record
      await NFT.updateOne(
        { tokenId: Number(tokenId) },
        {
          $set: {
            isListed: false,
            activeListingId: 0,
            lastSalePrice: listing
              ? listing.price?.amount || listing.price || null
              : null,
          },
          $inc: { totalSales: 1 },
        }
      );

      // Record sale history
      const sale = new SaleHistory({
        tokenId: Number(tokenId),
        listingId: Number(listingId),
        price: listing
          ? listing.price?.amount || listing.price || tx.value || "0"
          : "0",
        buyer: buyer.toLowerCase(),
        seller: listing ? listing.seller || null : null,
        txHash: tx.hash,
        blockNumber: event.blockNumber,
        type: listing && listing.listingType === "rental" ? "rental" : "sale",
      });
      await sale.save();

      // Save transaction entry
      await transactionSyncService.saveTransaction({
        transactionHash: tx.hash,
        type: "marketplace_buy",
        from: listing && listing.seller ? listing.seller : null,
        to: buyer.toLowerCase(),
        tokenId: Number(tokenId),
        blockNumber: event.blockNumber,
        gasUsed: 0,
      });
    } catch (err) {
      console.error("   ❌ Error processing ItemSold:", err);
    }
  }

  /**
   * Process ItemRented event from Marketplace
   */
  async processItemRented(event, contract) {
    try {
      const { listingId, renter, tokenId, expires } = event.args;
      console.log(
        `   🏠 Processing ItemRented: listing ${Number(
          listingId
        )} token ${Number(tokenId)} to ${renter}`
      );

      // Update listing
      let listing = await Listing.findOne({ listingId: Number(listingId) });
      if (!listing)
        listing = await Listing.findOne({ tokenId: Number(tokenId) }).sort({
          createdAt: -1,
        });
      if (listing) {
        listing.status = "rented";
        listing.rental = listing.rental || {};
        listing.rental.currentRenter = {
          walletAddress: renter.toLowerCase(),
          rentedAt: new Date(),
          expiresAt: new Date(Number(expires) * 1000),
          transactionHash: (await event.getTransaction()).hash,
        };
        await listing.save();
      }

      // Update NFT rental info
      await NFT.updateOne(
        { tokenId: Number(tokenId) },
        {
          $set: {
            renter: renter.toLowerCase(),
            rentExpiresAt: new Date(Number(expires) * 1000),
            isListed: false,
            activeListingId: 0,
          },
        }
      );
    } catch (err) {
      console.error("   ❌ Error processing ItemRented:", err);
    }
  }

  /**
   * Process ListingCancelled event from Marketplace
   */
  async processListingCancelled(event, contract) {
    try {
      const { listingId } = event.args;
      console.log(`   ❌ Processing ListingCancelled: ${Number(listingId)}`);

      const listing = await Listing.findOne({ listingId: Number(listingId) });
      if (listing) {
        listing.status = "cancelled";
        listing.cancelledAt = new Date();
        await listing.save();
      }

      // If there is a NFT pointing to that listing, unset isListed
      await NFT.updateMany(
        { activeListingId: Number(listingId) },
        { $set: { isListed: false, activeListingId: 0 } }
      );
    } catch (err) {
      console.error("   ❌ Error processing ListingCancelled:", err);
    }
  }

  /**
   * Process ERC-4907 UpdateUser event (setUser)
   */
  async processUpdateUserEvent(event, contract) {
    try {
      const { tokenId, user, expires } = event.args;
      console.log(
        `   🔁 Processing UpdateUser for token ${Number(tokenId)} user ${user}`
      );

      await NFT.updateOne(
        { tokenId: Number(tokenId) },
        {
          $set: {
            renter: user.toLowerCase(),
            rentExpiresAt:
              expires && Number(expires) > 0
                ? new Date(Number(expires) * 1000)
                : null,
          },
        }
      );
    } catch (err) {
      console.error("   ❌ Error processing UpdateUser event:", err);
    }
  }

  // Process marketplace ItemListed
  async processItemListed(event, contract) {
    try {
      const { listingId, seller, tokenId, price, listingType } = event.args;
      const tx = await event.getTransaction();

      console.log(
        `   🟢 Processing ItemListed: listing ${Number(
          listingId
        )} token ${Number(tokenId)} by ${seller}`
      );

      const doc = new Listing({
        listingId: Number(listingId),
        contractAddress: contract.target || contract.address,
        tokenId: Number(tokenId),
        seller: seller.toLowerCase(),
        listingType:
          listingType === 1 || listingType === "1" ? "rental" : "sale",
        price: price.toString(),
        status: "Active",
        txHash: tx.hash,
        blockNumber: event.blockNumber,
      });

      await doc.save();

      // Update NFT doc
      await NFT.updateOne(
        { tokenId: Number(tokenId) },
        {
          $set: {
            isListed: true,
            listingType: doc.listingType,
            currentPrice: doc.price,
            activeListingId: doc.listingId,
          },
        }
      );

      // Save transaction
      await transactionSyncService.saveTransaction({
        transactionHash: tx.hash,
        type: "item_listed",
        from: seller.toLowerCase(),
        to: contract.address || contract.target,
        tokenId: Number(tokenId),
        blockNumber: event.blockNumber,
        gasUsed: 0,
      });

      console.log(`   ✅ ItemListed recorded: listing ${doc.listingId}`);
    } catch (error) {
      console.error("   ❌ Error processing ItemListed:", error);
    }
  }

  // Process marketplace ItemSold
  async processItemSold(event, contract) {
    try {
      const { listingId, buyer, tokenId } = event.args;
      const tx = await event.getTransaction();

      console.log(
        `   🔴 Processing ItemSold: listing ${Number(listingId)} token ${Number(
          tokenId
        )} buyer ${buyer}`
      );

      const listing = await Listing.findOne({ listingId: Number(listingId) });
      const price = listing ? listing.price : null;

      if (listing) {
        listing.status = "Sold";
        await listing.save();
      }

      // Record sale history
      const sale = new SaleHistory({
        tokenId: Number(tokenId),
        listingId: Number(listingId),
        price: price || "0",
        buyer: buyer.toLowerCase(),
        seller: listing ? listing.seller : "",
        txHash: tx.hash,
        blockNumber: event.blockNumber,
        type: "sale",
      });

      await sale.save();

      // Update NFT
      await NFT.updateOne(
        { tokenId: Number(tokenId) },
        {
          $set: {
            isListed: false,
            currentPrice: null,
            activeListingId: 0,
            lastSalePrice: price,
          },
          $inc: { totalSales: 1 },
        }
      );

      // Save transaction
      await transactionSyncService.saveTransaction({
        transactionHash: tx.hash,
        type: "item_sold",
        from: listing ? listing.seller : null,
        to: buyer.toLowerCase(),
        tokenId: Number(tokenId),
        blockNumber: event.blockNumber,
        gasUsed: 0,
      });

      console.log(`   ✅ ItemSold processed for listing ${Number(listingId)}`);
    } catch (error) {
      console.error("   ❌ Error processing ItemSold:", error);
    }
  }

  // Process ItemRented
  async processItemRented(event, contract) {
    try {
      const { listingId, renter, tokenId, expires } = event.args;
      const tx = await event.getTransaction();

      console.log(
        `   🟡 Processing ItemRented: listing ${Number(
          listingId
        )} token ${Number(tokenId)} renter ${renter}`
      );

      const listing = await Listing.findOne({ listingId: Number(listingId) });
      const price = listing ? listing.price : null;

      if (listing) {
        listing.status = "Sold"; // mark as used
        await listing.save();
      }

      const sale = new SaleHistory({
        tokenId: Number(tokenId),
        listingId: Number(listingId),
        price: price || "0",
        buyer: renter.toLowerCase(),
        seller: listing ? listing.seller : "",
        txHash: tx.hash,
        blockNumber: event.blockNumber,
        type: "rental",
        expiresAt: new Date(Number(expires) * 1000),
      });

      await sale.save();

      // Update NFT renter fields
      await NFT.updateOne(
        { tokenId: Number(tokenId) },
        {
          $set: {
            isListed: false,
            currentPrice: null,
            activeListingId: 0,
            renter: renter.toLowerCase(),
            rentExpiresAt: new Date(Number(expires) * 1000),
          },
        }
      );

      // Save transaction
      await transactionSyncService.saveTransaction({
        transactionHash: tx.hash,
        type: "item_rented",
        from: listing ? listing.seller : null,
        to: renter.toLowerCase(),
        tokenId: Number(tokenId),
        blockNumber: event.blockNumber,
        gasUsed: 0,
      });

      console.log(
        `   ✅ ItemRented processed for listing ${Number(listingId)}`
      );
    } catch (error) {
      console.error("   ❌ Error processing ItemRented:", error);
    }
  }

  // Process ListingCancelled
  async processListingCancelled(event, contract) {
    try {
      const { listingId } = event.args;
      const tx = await event.getTransaction();

      console.log(`   ⚪ Processing ListingCancelled: ${Number(listingId)}`);

      const listing = await Listing.findOne({ listingId: Number(listingId) });
      if (listing) {
        listing.status = "Cancelled";
        await listing.save();

        // Update NFT
        await NFT.updateOne(
          { tokenId: listing.tokenId },
          { $set: { isListed: false, currentPrice: null, activeListingId: 0 } }
        );
      }

      await transactionSyncService.saveTransaction({
        transactionHash: tx.hash,
        type: "listing_cancelled",
        from: null,
        to: null,
        tokenId: listing ? listing.tokenId : null,
        blockNumber: event.blockNumber,
        gasUsed: 0,
      });

      console.log(`   ✅ ListingCancelled processed: ${Number(listingId)}`);
    } catch (error) {
      console.error("   ❌ Error processing ListingCancelled:", error);
    }
  }

  // Process ERC4907 UpdateUser event
  async processUpdateUserEvent(event, contract) {
    try {
      const { tokenId, user, expires } = event.args;
      const tx = await event.getTransaction();

      console.log(
        `   🔁 Processing UpdateUser: token ${Number(tokenId)} user ${user}`
      );

      await NFT.updateOne(
        { tokenId: Number(tokenId) },
        {
          $set: {
            renter: user === ethers.ZeroAddress ? null : user.toLowerCase(),
            rentExpiresAt:
              user === ethers.ZeroAddress
                ? null
                : new Date(Number(expires) * 1000),
          },
        }
      );

      await transactionSyncService.saveTransaction({
        transactionHash: tx.hash,
        type: "update_user",
        from: null,
        to: user.toLowerCase(),
        tokenId: Number(tokenId),
        blockNumber: event.blockNumber,
        gasUsed: 0,
      });

      console.log(`   ✅ UpdateUser processed for token ${Number(tokenId)}`);
    } catch (error) {
      console.error("   ❌ Error processing UpdateUser event:", error);
    }
  }
}

module.exports = new EventProcessorService();
