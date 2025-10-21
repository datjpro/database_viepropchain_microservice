/**
 * ========================================================================
 * CONTRACT SERVICE - Smart contract interactions
 * ========================================================================
 */

const { ethers } = require("ethers");
const { getSigner, CONTRACT_ADDRESS } = require("../config/blockchain");
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
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    return this.contract;
  }

  /**
   * Mint NFT
   */
  async mintNFT(recipient, tokenURI) {
    try {
      if (!ethers.isAddress(recipient)) {
        throw new Error("Invalid recipient address");
      }

      console.log(`🔄 Minting NFT...`);
      console.log(`   Recipient: ${recipient}`);
      console.log(`   TokenURI: ${tokenURI}`);

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
   * Get NFTs balance by owner
   */
  async getNFTsByOwner(owner) {
    try {
      if (!ethers.isAddress(owner)) {
        throw new Error("Invalid owner address");
      }

      const balance = await this.contract.balanceOf(owner);

      return {
        owner,
        balance: Number(balance),
        contractAddress: CONTRACT_ADDRESS,
      };
    } catch (error) {
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
}

module.exports = new ContractService();
