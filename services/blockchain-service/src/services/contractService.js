/**
 * ========================================================================
 * CONTRACT SERVICE - Smart contract interactions
 * ========================================================================
 */

const { ethers } = require("ethers");
const {
  getSigner,
  getProvider,
  NFT_CONTRACT_ADDRESS,
} = require("../config/blockchain");
const {
  CONTRACT_ABI,
  MARKETPLACE_ABI,
  MARKETPLACE_CONTRACT_ADDRESS,
} = require("../config/contract");

class ContractService {
  constructor() {
    this.contract = null;
    this.marketplaceContract = null;
  }

  /**
   * Initialize contract instance
   */
  initContract() {
    try {
      const signer = getSigner();
      const provider = getProvider();

      if (!signer || !provider) {
        throw new Error(
          "Blockchain not initialized. Call initBlockchain() first."
        );
      }

      if (!NFT_CONTRACT_ADDRESS) {
        throw new Error("NFT_CONTRACT_ADDRESS not found");
      }

      // Create contract instance with signer
      this.contract = new ethers.Contract(
        NFT_CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      // Initialize marketplace contract
      this.marketplaceContract = new ethers.Contract(
        MARKETPLACE_CONTRACT_ADDRESS,
        MARKETPLACE_ABI,
        signer
      );

      console.log(`✅ NFT Contract initialized at ${NFT_CONTRACT_ADDRESS}`);
      console.log(
        `✅ Marketplace Contract initialized at ${MARKETPLACE_CONTRACT_ADDRESS}`
      );
      return this.contract;
    } catch (error) {
      console.error("❌ Contract init error:", error.message);
      throw error;
    }
  }

  /**
   * Mint NFT
   * @param {string} recipient - Wallet address to receive NFT
   * @param {string} tokenURI - Metadata URI (ipfs://...)
   * @param {boolean} isCustodial - True nếu mint vào ví Admin (khóa ngay), false nếu mint vào ví user
   */
  async mintNFT(recipient, tokenURI, isCustodial = false) {
    try {
      // Đảm bảo contract được khởi tạo
      if (!this.contract) {
        this.initContract();
      }

      if (!ethers.isAddress(recipient)) {
        throw new Error("Invalid recipient address");
      }

      console.log(`🔄 Checking for duplicate NFT...`);
      console.log(`   Recipient: ${recipient}`);
      console.log(`   TokenURI: ${tokenURI}`);
      console.log(
        `   Custodial Mode: ${
          isCustodial ? "🏦 YES (Will lock NFT)" : "❌ NO (Normal mint)"
        }`
      );

      // Check if tokenURI already exists
      const tokenURIExists = await this.contract.tokenURIExists(tokenURI);
      if (tokenURIExists) {
        const existingTokenId = await this.contract.getTokenIdByURI(tokenURI);
        console.log(
          `   ⚠️ NFT with this metadata already exists with tokenId: ${existingTokenId}`
        );

        // Return existing NFT info instead of minting new one
        return {
          tokenId: Number(existingTokenId),
          recipient,
          tokenURI,
          contractAddress: NFT_CONTRACT_ADDRESS,
          isDuplicate: true,
          message: "NFT with this metadata already exists",
        };
      }

      console.log(`🔄 Minting new NFT...`);

      // Call smart contract mint function
      let tx;
      if (isCustodial) {
        // Gọi mintCustodial (mint + lock)
        console.log(`   🏦 Calling mintCustodial() - NFT will be LOCKED`);
        tx = await this.contract.mintCustodial(recipient, tokenURI);
      } else {
        // Gọi mint thường (không lock)
        console.log(`   ✅ Calling mint() - NFT will be FREE to transfer`);
        tx = await this.contract.mint(recipient, tokenURI);
      }

      console.log(`   Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(
        `   ✅ Transaction confirmed in block ${receipt.blockNumber}`
      );

      // Get tokenId from Transfer event
      const transferEvent = receipt.logs.find((log) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === "Transfer";
        } catch {
          return false;
        }
      });

      let tokenId;
      if (transferEvent) {
        const parsed = this.contract.interface.parseLog(transferEvent);
        tokenId = Number(parsed.args.tokenId);
      } else {
        // Fallback: Get current token counter
        const counter = await this.contract.tokenCounter();
        tokenId = Number(counter) - 1;
      }

      console.log(`   ✅ NFT minted with tokenId: ${tokenId}`);

      return {
        tokenId,
        recipient,
        tokenURI,
        contractAddress: NFT_CONTRACT_ADDRESS,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        mintedBy: getSigner().address,
        isDuplicate: false,
        message: "NFT successfully minted",
      };
    } catch (error) {
      throw new Error(`Mint failed: ${error.message}`);
    }
  }

  /**
   * Get NFT info by tokenId
   */
  async getNFTInfo(tokenId) {
    try {
      // Đảm bảo contract được khởi tạo
      if (!this.contract) {
        this.initContract();
      }

      const owner = await this.contract.ownerOf(tokenId);
      const tokenURI = await this.contract.tokenURI(tokenId);

      return {
        tokenId: Number(tokenId),
        owner,
        tokenURI,
        contractAddress: NFT_CONTRACT_ADDRESS,
      };
    } catch (error) {
      throw new Error(`Failed to get NFT info: ${error.message}`);
    }
  }

  /**
   * Get NFTs by owner (sử dụng ERC721Enumerable)
   * Follow workflow: balanceOf -> tokenOfOwnerByIndex -> tokenURI
   */
  async getNFTsByOwner(owner) {
    try {
      // Đảm bảo contract được khởi tạo
      if (!this.contract) {
        this.initContract();
      }

      if (!ethers.isAddress(owner)) {
        throw new Error("Invalid owner address");
      }

      console.log(`🔍 Step 1: Getting balance for ${owner}`);

      // 🏁 Step 1: Lấy balance (số lượng NFT)
      const balanceBN = await this.contract.balanceOf(owner);
      const balance = balanceBN.toString(); // Giữ nguyên string để tránh lỗi BigNumber
      const balanceNum = Number(balance);

      console.log(`   ✅ Balance: ${balanceNum} NFTs`);

      if (balanceNum === 0) {
        return {
          owner,
          balance: balanceNum,
          nfts: [],
          contractAddress: NFT_CONTRACT_ADDRESS,
        };
      }

      console.log(`🔍 Step 2: Getting NFT details for ${balanceNum} NFTs`);

      // 🆔 Step 2: Lấy từng NFT qua tokenOfOwnerByIndex
      const nfts = [];
      for (let i = 0; i < balanceNum; i++) {
        try {
          console.log(`   🔍 Getting NFT at index ${i}...`);

          // Lấy tokenId của NFT ở vị trí index i
          const tokenIdBN = await this.contract.tokenOfOwnerByIndex(owner, i);
          const tokenId = Number(tokenIdBN.toString());

          console.log(`   📋 Token ID: ${tokenId}`);

          // ℹ️ Step 3: Lấy tokenURI (metadata)
          const tokenURI = await this.contract.tokenURI(tokenId);

          console.log(`   🔗 Token URI: ${tokenURI}`);

          nfts.push({
            tokenId,
            owner,
            tokenURI,
            index: i,
          });

          console.log(`   ✅ Successfully added NFT ${tokenId} to results`);
        } catch (error) {
          console.error(`❌ Failed to get NFT at index ${i}:`, error.message);
          console.error(`❌ Full error:`, error);
          // Continue với NFT tiếp theo thay vì dừng
        }
      }

      console.log(
        `   ✅ Successfully retrieved ${nfts.length}/${balanceNum} NFTs`
      );

      return {
        owner,
        balance: balanceNum,
        nfts,
        contractAddress: NFT_CONTRACT_ADDRESS,
      };
    } catch (error) {
      console.error(`❌ getNFTsByOwner error:`, error);
      throw new Error(`Failed to get NFTs: ${error.message}`);
    }
  }

  /**
   * Transfer NFT - Tự động phát hiện NFT bị khóa và dùng claimNFT
   */
  async transferNFT(from, to, tokenId) {
    try {
      if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
        throw new Error("Invalid from or to address");
      }

      console.log(`🔄 Transferring NFT #${tokenId} from ${from} to ${to}`);

      // Kiểm tra xem NFT có bị khóa không
      const isLocked = await this.contract.isLocked(tokenId);
      console.log(`   NFT locked status: ${isLocked}`);

      // Get the current owner to verify
      const currentOwner = await this.contract.ownerOf(tokenId);
      console.log(`   Current owner: ${currentOwner}`);
      console.log(`   Signer address: ${this.contract.runner.address}`);

      // Verify the signer is the owner
      if (
        currentOwner.toLowerCase() !==
        this.contract.runner.address.toLowerCase()
      ) {
        throw new Error(
          `Signer ${this.contract.runner.address} is not the owner of token ${tokenId}. Owner is ${currentOwner}`
        );
      }

      let tx;
      if (isLocked) {
        // NFT bị khóa - dùng claimNFT để mở khóa và chuyển trong 1 lần
        console.log(
          `   🔓 NFT is locked - using claimNFT() to unlock and transfer`
        );
        tx = await this.contract.claimNFT(from, to, tokenId);
      } else {
        // NFT không bị khóa - dùng safeTransferFrom bình thường
        console.log(`   ✅ NFT is unlocked - using safeTransferFrom()`);
        tx = await this.contract["safeTransferFrom(address,address,uint256)"](
          from,
          to,
          tokenId
        );
      }

      console.log(`   Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`   ✅ Transfer confirmed in block ${receipt.blockNumber}`);

      return {
        tokenId: Number(tokenId),
        from,
        to,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        wasLocked: isLocked,
      };
    } catch (error) {
      console.error(`❌ Transfer error details:`, error);
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  /**
   * Get token counter
   */
  async getTokenCounter() {
    try {
      const counter = await this.contract.tokenCounter();

      return {
        tokenCounter: Number(counter),
        totalMinted: Number(counter),
      };
    } catch (error) {
      throw new Error(`Failed to get token counter: ${error.message}`);
    }
  }

  /**
   * Get total supply (sử dụng ERC721Enumerable)
   */
  async getTotalSupply() {
    try {
      // Đảm bảo contract được khởi tạo
      if (!this.contract) {
        this.initContract();
      }

      const totalSupply = await this.contract.totalSupply();

      return {
        totalSupply: Number(totalSupply),
        totalMinted: Number(totalSupply),
      };
    } catch (error) {
      throw new Error(`Failed to get total supply: ${error.message}`);
    }
  }

  /**
   * Get all NFTs (sử dụng ERC721Enumerable)
   */
  async getAllNFTs() {
    try {
      // Đảm bảo contract được khởi tạo
      if (!this.contract) {
        this.initContract();
      }

      const totalSupply = await this.contract.totalSupply();
      const totalSupplyNum = Number(totalSupply);

      console.log(`🔍 Getting all NFTs, total supply: ${totalSupplyNum}`);

      if (totalSupplyNum === 0) {
        return {
          totalSupply: 0,
          nfts: [],
          contractAddress: NFT_CONTRACT_ADDRESS,
        };
      }

      const nfts = [];
      for (let i = 0; i < totalSupplyNum; i++) {
        try {
          const tokenId = await this.contract.tokenByIndex(i);
          const owner = await this.contract.ownerOf(tokenId);
          const tokenURI = await this.contract.tokenURI(tokenId);

          nfts.push({
            tokenId: Number(tokenId),
            owner,
            tokenURI,
            globalIndex: i,
          });
        } catch (error) {
          console.warn(
            `Failed to get NFT at global index ${i}:`,
            error.message
          );
        }
      }

      console.log(`   ✅ Found ${nfts.length} total NFTs`);

      return {
        totalSupply: totalSupplyNum,
        nfts,
        contractAddress: NFT_CONTRACT_ADDRESS,
      };
    } catch (error) {
      throw new Error(`Failed to get all NFTs: ${error.message}`);
    }
  }

  /**
   * Get NFT by global index (sử dụng ERC721Enumerable)
   */
  async getNFTByIndex(index) {
    try {
      // Đảm bảo contract được khởi tạo
      if (!this.contract) {
        this.initContract();
      }

      const tokenId = await this.contract.tokenByIndex(index);
      const owner = await this.contract.ownerOf(tokenId);
      const tokenURI = await this.contract.tokenURI(tokenId);

      return {
        tokenId: Number(tokenId),
        owner,
        tokenURI,
        globalIndex: Number(index),
        contractAddress: NFT_CONTRACT_ADDRESS,
      };
    } catch (error) {
      throw new Error(`Failed to get NFT by index: ${error.message}`);
    }
  }

  /**
   * ========================================================================
   * ERC4907 RENTAL FUNCTIONS
   * ========================================================================
   */

  /**
   * Set user for rental (ERC4907)
   */
  async setUser(tokenId, user, expires) {
    try {
      if (!this.contract) {
        this.initContract();
      }

      if (!ethers.isAddress(user)) {
        throw new Error("Invalid user address");
      }

      console.log(`🔄 Setting user for rental...`);
      console.log(`   TokenId: ${tokenId}`);
      console.log(`   User: ${user}`);
      console.log(`   Expires: ${expires}`);

      // Convert expires to Unix timestamp if it's a Date
      let expiresTimestamp = expires;
      if (expires instanceof Date) {
        expiresTimestamp = Math.floor(expires.getTime() / 1000);
      } else if (typeof expires === "string") {
        expiresTimestamp = Math.floor(new Date(expires).getTime() / 1000);
      }

      const tx = await this.contract.setUser(tokenId, user, expiresTimestamp);
      console.log(`   📝 Transaction hash: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(
        `   ✅ User set successfully at block ${receipt.blockNumber}`
      );

      return {
        tokenId: Number(tokenId),
        user,
        expires: Number(expiresTimestamp),
        expiresAt: new Date(Number(expiresTimestamp) * 1000),
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        contractAddress: NFT_CONTRACT_ADDRESS,
      };
    } catch (error) {
      throw new Error(`Failed to set user: ${error.message}`);
    }
  }

  /**
   * Get current user of NFT (ERC4907)
   */
  async getUser(tokenId) {
    try {
      if (!this.contract) {
        this.initContract();
      }

      console.log(`🔍 Getting user for tokenId: ${tokenId}`);

      const [user, expires] = await Promise.all([
        this.contract.userOf(tokenId),
        this.contract.userExpires(tokenId),
      ]);

      const now = Math.floor(Date.now() / 1000);
      const isRented = user !== ethers.ZeroAddress && Number(expires) > now;
      const timeLeft =
        Number(expires) > now ? (Number(expires) - now) * 1000 : 0;

      console.log(`   👤 User: ${user}`);
      console.log(
        `   ⏰ Expires: ${expires} (${new Date(Number(expires) * 1000)})`
      );
      console.log(`   🎯 Is Rented: ${isRented}`);

      return {
        user: user === ethers.ZeroAddress ? null : user,
        expires: Number(expires),
        expiresAt: new Date(Number(expires) * 1000),
        isRented,
        timeLeft,
      };
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Get rental expiry time (ERC4907)
   */
  async getUserExpires(tokenId) {
    try {
      if (!this.contract) {
        this.initContract();
      }

      console.log(`🔍 Getting expiry for tokenId: ${tokenId}`);

      const expires = await this.contract.userExpires(tokenId);
      const now = Math.floor(Date.now() / 1000);
      const isActive = Number(expires) > now;
      const timeLeft =
        Number(expires) > now ? (Number(expires) - now) * 1000 : 0;

      console.log(
        `   ⏰ Expires: ${expires} (${new Date(Number(expires) * 1000)})`
      );
      console.log(`   🎯 Is Active: ${isActive}`);

      return {
        expires: Number(expires),
        expiresAt: new Date(Number(expires) * 1000),
        isActive,
        timeLeft,
      };
    } catch (error) {
      throw new Error(`Failed to get user expires: ${error.message}`);
    }
  }

  /**
   * Check if NFT is currently rented
   */
  async isRented(tokenId) {
    try {
      if (!this.contract) {
        this.initContract();
      }

      console.log(`🔍 Checking rental status for tokenId: ${tokenId}`);

      const [user, expires] = await Promise.all([
        this.contract.userOf(tokenId),
        this.contract.userExpires(tokenId),
      ]);

      const now = Math.floor(Date.now() / 1000);
      const isRented = user !== ethers.ZeroAddress && Number(expires) > now;
      const timeLeft =
        Number(expires) > now ? (Number(expires) - now) * 1000 : 0;

      console.log(`   👤 Current User: ${user}`);
      console.log(`   ⏰ Expires: ${expires}`);
      console.log(`   🎯 Is Rented: ${isRented}`);

      return {
        isRented,
        currentUser: user === ethers.ZeroAddress ? null : user,
        expires: Number(expires),
        expiresAt: new Date(Number(expires) * 1000),
        timeLeft,
      };
    } catch (error) {
      throw new Error(`Failed to check rental status: ${error.message}`);
    }
  }

  /**
   * ========================================================================
   * MARKETPLACE FUNCTIONS
   * ========================================================================
   */

  /**
   * List NFT for sale on marketplace
   * @param {number} tokenId - NFT token ID
   * @param {string} priceInWei - Price in wei (string to handle large numbers)
   * @param {string} sellerWallet - Seller wallet address
   * @returns {Object} Transaction receipt
   */
  async listItem(tokenId, priceInWei, sellerWallet) {
    try {
      console.log(`📋 Listing NFT #${tokenId} for sale...`);
      console.log(`   Price: ${priceInWei} wei`);
      console.log(`   Seller: ${sellerWallet}`);

      if (!this.marketplaceContract) {
        throw new Error("Marketplace contract not initialized");
      }

      // Step 1: Approve Marketplace to transfer NFT
      console.log(`🔓 Approving Marketplace to transfer NFT #${tokenId}...`);
      const approveTx = await this.contract.approve(
        MARKETPLACE_CONTRACT_ADDRESS,
        tokenId
      );
      await approveTx.wait();
      console.log(`✅ NFT #${tokenId} approved for Marketplace`);

      // Step 2: Call listItem on marketplace contract
      const tx = await this.marketplaceContract.listItem(tokenId, priceInWei);
      console.log(`   Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(
        `✅ NFT #${tokenId} listed successfully in block ${receipt.blockNumber}`
      );

      // Step 3: Get listingId from event
      const listingId =
        receipt.logs.length > 0 ? receipt.logs[0].topics[1] : null;
      const listingIdDecimal = listingId ? parseInt(listingId, 16) : null;

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        listingId: listingIdDecimal,
      };
    } catch (error) {
      console.error(`❌ Failed to list NFT #${tokenId}:`, error.message);
      throw new Error(`Failed to list NFT: ${error.message}`);
    }
  }

  /**
   * List NFT for rent on marketplace
   * @param {number} tokenId - NFT token ID
   * @param {string} pricePerDayInWei - Price per day in wei
   * @param {number} maxDurationDays - Maximum rental duration in days
   * @param {string} sellerWallet - Seller wallet address
   * @returns {Object} Transaction receipt
   */
  async listForRent(tokenId, pricePerDayInWei, maxDurationDays, sellerWallet) {
    try {
      console.log(`🏠 Listing NFT #${tokenId} for rent...`);
      console.log(`   Price per day: ${pricePerDayInWei} wei`);
      console.log(`   Max duration: ${maxDurationDays} days`);
      console.log(`   Seller: ${sellerWallet}`);

      if (!this.marketplaceContract) {
        throw new Error("Marketplace contract not initialized");
      }

      // Step 1: Approve Marketplace to manage NFT (for setUser)
      console.log(`🔓 Approving Marketplace for NFT #${tokenId}...`);
      const approveTx = await this.contract.approve(
        MARKETPLACE_CONTRACT_ADDRESS,
        tokenId
      );
      await approveTx.wait();
      console.log(`✅ NFT #${tokenId} approved for Marketplace`);

      // Step 2: Call listForRent on marketplace contract
      const tx = await this.marketplaceContract.listForRent(
        tokenId,
        pricePerDayInWei,
        maxDurationDays
      );
      console.log(`   Transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(
        `✅ NFT #${tokenId} listed for rent successfully in block ${receipt.blockNumber}`
      );

      // Step 3: Get listingId from event
      const listingId =
        receipt.logs.length > 0 ? receipt.logs[0].topics[1] : null;
      const listingIdDecimal = listingId ? parseInt(listingId, 16) : null;

      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        listingId: listingIdDecimal,
      };
    } catch (error) {
      console.error(
        `❌ Failed to list NFT #${tokenId} for rent:`,
        error.message
      );
      throw new Error(`Failed to list NFT for rent: ${error.message}`);
    }
  }

  /**
   * Get listing count from marketplace
   * @returns {number} Total number of listings
   */
  async getListingCount() {
    try {
      if (!this.marketplaceContract) {
        throw new Error("Marketplace contract not initialized");
      }

      const count = await this.marketplaceContract.getListingCount();
      return Number(count);
    } catch (error) {
      throw new Error(`Failed to get listing count: ${error.message}`);
    }
  }

  /**
   * Get listing details by listing ID
   * @param {number} listingId - Listing ID
   * @returns {Object} Listing details
   */
  async getListing(listingId) {
    try {
      if (!this.marketplaceContract) {
        throw new Error("Marketplace contract not initialized");
      }

      const listing = await this.marketplaceContract.getListing(listingId);

      return {
        listingId: Number(listing.listingId),
        seller: listing.seller,
        tokenId: Number(listing.tokenId),
        price: listing.price.toString(),
        status: Number(listing.status), // 0=Active, 1=Sold, 2=Cancelled
        listingType: Number(listing.listingType), // 0=Sale, 1=Rental
        rentalDuration: listing.rentalDuration.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to get listing ${listingId}: ${error.message}`);
    }
  }
}

module.exports = new ContractService();
