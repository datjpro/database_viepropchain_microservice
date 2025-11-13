/**
 * ========================================================================
 * CONTRACT SERVICE - Smart contract interactions
 * ========================================================================
 */

const { ethers } = require("ethers");
const { getSigner, NFT_CONTRACT_ADDRESS } = require("../config/blockchain");
const { CONTRACT_ABI } = require("../config/contract");

class ContractService {
  constructor() {
    this.contract = null;
  }

  /**
   * Initialize contract instance
   */
  initContract() {
    const signer = getSigner();
    this.contract = new ethers.Contract(
      NFT_CONTRACT_ADDRESS,
      CONTRACT_ABI,
      signer
    );
    return this.contract;
  }

  /**
   * Mint NFT
   */
  async mintNFT(recipient, tokenURI) {
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
          contractAddress: CONTRACT_ADDRESS,
          isDuplicate: true,
          message: "NFT with this metadata already exists",
        };
      }

      console.log(`🔄 Minting new NFT...`);

      // Call smart contract mint function
      const tx = await this.contract.mint(recipient, tokenURI);
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
        contractAddress: CONTRACT_ADDRESS,
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
        contractAddress: CONTRACT_ADDRESS,
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
          contractAddress: CONTRACT_ADDRESS,
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
        contractAddress: CONTRACT_ADDRESS,
      };
    } catch (error) {
      console.error(`❌ getNFTsByOwner error:`, error);
      throw new Error(`Failed to get NFTs: ${error.message}`);
    }
  }

  /**
   * Transfer NFT
   */
  async transferNFT(from, to, tokenId) {
    try {
      if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
        throw new Error("Invalid from or to address");
      }

      console.log(`🔄 Transferring NFT #${tokenId} from ${from} to ${to}`);

      const tx = await this.contract.transferFrom(from, to, tokenId);
      console.log(`   Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`   ✅ Transfer confirmed`);

      return {
        tokenId: Number(tokenId),
        from,
        to,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
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
          contractAddress: CONTRACT_ADDRESS,
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
        contractAddress: CONTRACT_ADDRESS,
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
        contractAddress: CONTRACT_ADDRESS,
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
        contractAddress: CONTRACT_ADDRESS,
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
}

module.exports = new ContractService();
