/**
 * ========================================================================
 * BLOCKCHAIN SERVICE - Port 4004
 * ========================================================================
 * Nhiệm vụ: Service DUY NHẤT tương tác với blockchain
 * - Quản lý Admin private key
 * - Mint NFT
 * - Transfer, Approve NFT
 * - Gửi signed transactions
 * ========================================================================
 */

const express = require("express");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4004;

// ============================================================================
// BLOCKCHAIN CONFIG
// ============================================================================
const GANACHE_URL = process.env.GANACHE_URL || "http://127.0.0.1:8545";
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Smart Contract ABI - Load from file
const CONTRACT_ABI = require("./contract-abi.json");

let provider;
let signer;
let contract;

// ============================================================================
// INIT BLOCKCHAIN CONNECTION
// ============================================================================
function initBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(GANACHE_URL);

    if (!ADMIN_PRIVATE_KEY) {
      throw new Error("ADMIN_PRIVATE_KEY not found in .env");
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error("CONTRACT_ADDRESS not found in .env");
    }

    signer = new ethers.Wallet(ADMIN_PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    console.log("✅ Blockchain initialized");
    console.log("   Provider:", GANACHE_URL);
    console.log("   Contract:", CONTRACT_ADDRESS);
    console.log("   Admin:", signer.address);
  } catch (error) {
    console.error("❌ Blockchain init error:", error.message);
    throw error;
  }
}

initBlockchain();

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", async (req, res) => {
  try {
    const blockNumber = await provider.getBlockNumber();
    const balance = await provider.getBalance(signer.address);

    res.json({
      success: true,
      service: "Blockchain Service",
      port: PORT,
      blockchain: {
        connected: true,
        blockNumber,
        adminAddress: signer.address,
        adminBalance: ethers.formatEther(balance),
        contractAddress: CONTRACT_ADDRESS,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Blockchain connection error",
      message: error.message,
    });
  }
});

// ============================================================================
// MINT NFT
// ============================================================================
app.post("/mint", async (req, res) => {
  try {
    const { recipient, tokenURI } = req.body;

    if (!recipient || !tokenURI) {
      return res.status(400).json({
        success: false,
        error: "Missing recipient or tokenURI",
      });
    }

    // Validate recipient address
    if (!ethers.isAddress(recipient)) {
      return res.status(400).json({
        success: false,
        error: "Invalid recipient address",
      });
    }

    console.log(`🔄 Minting NFT...`);
    console.log(`   Recipient: ${recipient}`);
    console.log(`   TokenURI: ${tokenURI}`);

    // Get recipient's NFT balance BEFORE minting
    const balanceBefore = await contract.balanceOf(recipient);
    console.log(`   📊 Recipient balance before: ${balanceBefore}`);

    // Call smart contract mint function
    const tx = await contract.mint(recipient, tokenURI);
    console.log(`   Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);

    // Get recipient's NFT balance AFTER minting
    const balanceAfter = await contract.balanceOf(recipient);
    console.log(`   📊 Recipient balance after: ${balanceAfter}`);

    // Debug: Print all logs
    console.log(`   📋 Transaction logs (${receipt.logs.length} total):`);
    receipt.logs.forEach((log, index) => {
      console.log(`      Log ${index}:`, {
        address: log.address,
        topics: log.topics,
        data: log.data,
      });
    });

    // Get tokenId from Transfer event
    let tokenId;
    const transferEvent = receipt.logs.find((log) => {
      try {
        const parsed = contract.interface.parseLog(log);
        console.log(`      ✅ Parsed log:`, parsed.name, parsed.args);
        if (parsed?.name === "Transfer") {
          tokenId = Number(parsed.args.tokenId);
          return true;
        }
        return false;
      } catch (error) {
        console.log(`      ⚠️ Failed to parse log:`, error.message);
        return false;
      }
    });

    if (!tokenId) {
      // Fallback 1: Try to get tokenCounter
      try {
        const counter = await contract.tokenCounter();
        tokenId = Number(counter);
        console.log(
          `   ✅ NFT minted with tokenId: ${tokenId} (from tokenCounter)`
        );
      } catch (counterError) {
        console.log("❌ Failed to get tokenCounter:", counterError.message);

        // Fallback 2: Estimate tokenId from balance difference
        if (balanceAfter > balanceBefore) {
          // This is a rough estimate - the actual tokenId might be different
          // But at least we know a new NFT was minted
          tokenId = Number(balanceAfter); // Use balance as estimate
          console.log(
            `   ⚠️ Estimated tokenId: ${tokenId} (from balance difference)`
          );
          console.log(
            `   💡 Note: This is an estimate. Check blockchain explorer for actual tokenId.`
          );
        } else {
          throw new Error(
            "Could not determine tokenId from transaction. Mint may have failed."
          );
        }
      }
    } else {
      console.log(
        `   ✅ NFT minted with tokenId: ${tokenId} (from Transfer event)`
      );
    }

    res.json({
      success: true,
      message: "NFT minted successfully",
      data: {
        tokenId,
        recipient,
        tokenURI,
        contractAddress: CONTRACT_ADDRESS,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        mintedBy: signer.address,
      },
    });
  } catch (error) {
    console.error("❌ Mint error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mint NFT",
      message: error.message,
    });
  }
});

// ============================================================================
// GET NFT INFO
// ============================================================================
app.get("/nft/:tokenId", async (req, res) => {
  try {
    const { tokenId } = req.params;

    // Get owner
    const owner = await contract.ownerOf(tokenId);

    // Get tokenURI
    const tokenURI = await contract.tokenURI(tokenId);

    res.json({
      success: true,
      data: {
        tokenId: Number(tokenId),
        owner,
        tokenURI,
        contractAddress: CONTRACT_ADDRESS,
      },
    });
  } catch (error) {
    console.error("❌ Get NFT error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get NFT info",
      message: error.message,
    });
  }
});

// ============================================================================
// GET NFTs BY OWNER
// ============================================================================
app.get("/nfts/:owner", async (req, res) => {
  try {
    const { owner } = req.params;

    if (!ethers.isAddress(owner)) {
      return res.status(400).json({
        success: false,
        error: "Invalid owner address",
      });
    }

    const balance = await contract.balanceOf(owner);

    res.json({
      success: true,
      data: {
        owner,
        balance: Number(balance),
        contractAddress: CONTRACT_ADDRESS,
      },
    });
  } catch (error) {
    console.error("❌ Get NFTs error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get NFTs",
      message: error.message,
    });
  }
});

// ============================================================================
// TRANSFER NFT
// ============================================================================
app.post("/transfer", async (req, res) => {
  try {
    const { from, to, tokenId } = req.body;

    if (!from || !to || tokenId === undefined) {
      return res.status(400).json({
        success: false,
        error: "Missing from, to, or tokenId",
      });
    }

    if (!ethers.isAddress(from) || !ethers.isAddress(to)) {
      return res.status(400).json({
        success: false,
        error: "Invalid from or to address",
      });
    }

    console.log(`🔄 Transferring NFT #${tokenId} from ${from} to ${to}`);

    const tx = await contract.transferFrom(from, to, tokenId);
    console.log(`   Transaction sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Transfer confirmed`);

    res.json({
      success: true,
      message: "NFT transferred successfully",
      data: {
        tokenId: Number(tokenId),
        from,
        to,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      },
    });
  } catch (error) {
    console.error("❌ Transfer error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to transfer NFT",
      message: error.message,
    });
  }
});

// ============================================================================
// GET TOKEN COUNTER
// ============================================================================
app.get("/token-counter", async (req, res) => {
  try {
    const counter = await contract.tokenCounter();

    res.json({
      success: true,
      data: {
        tokenCounter: Number(counter),
        totalMinted: Number(counter),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get token counter",
      message: error.message,
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  BLOCKCHAIN SERVICE                          ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  Ganache: ${GANACHE_URL}                          ║
║  Contract: ${CONTRACT_ADDRESS}  ║
║  Admin: ${signer.address}     ║
║                                                              ║
║  API Endpoints:                                              ║
║  ├─ POST /mint                - Mint NFT                     ║
║  ├─ GET  /nft/:tokenId        - Get NFT info                 ║
║  ├─ GET  /nfts/:owner         - Get NFTs by owner            ║
║  ├─ POST /transfer            - Transfer NFT                 ║
║  └─ GET  /token-counter       - Get total minted             ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = { provider, contract, signer };
