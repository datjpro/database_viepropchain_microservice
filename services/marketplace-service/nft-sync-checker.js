/**
 * ========================================================================
 * NFT SYNC CHECKER - Compare Blockchain vs Database
 * ========================================================================
 * Purpose: Check if NFT ownership in database matches blockchain reality
 */

const { Web3 } = require('web3');
const mongoose = require('mongoose');

// Configuration
const GANACHE_URL = 'http://localhost:8545';
const MONGODB_URI = 'mongodb+srv://db_dacn:123456%40ABC@dacn.swowsqw.mongodb.net/viepropchain';
const NFT_CONTRACT_ADDRESS = '0xEA4F5F49F396B13CA447FaA792A8702054019Cc8';

// Contract ABI (minimal for ownerOf)
const NFT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
    "name": "ownerOf",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  console.log('🔍 NFT SYNC CHECKER STARTED');
  console.log('═══════════════════════════════');
  
  // 1. Connect to Web3
  const web3 = new Web3(GANACHE_URL);
  const nftContract = new web3.eth.Contract(NFT_ABI, NFT_CONTRACT_ADDRESS);
  
  // 2. Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const nfts = db.collection('nfts');
  
  try {
    // 3. Get all NFTs from database
    const dbNFTs = await nfts.find({}).toArray();
    console.log(`📊 Database NFTs: ${dbNFTs.length}`);
    
    // 4. Check each NFT on blockchain
    console.log('\n🔍 CHECKING OWNERSHIP SYNC:');
    console.log('─────────────────────────────────');
    
    let syncIssues = 0;
    
    for (const nft of dbNFTs) {
      try {
        // Get blockchain owner
        const blockchainOwner = await nftContract.methods.ownerOf(nft.tokenId).call();
        
        // Compare with database
        const dbOwner = nft.owner || nft.currentOwner;
        const isSync = blockchainOwner.toLowerCase() === dbOwner.toLowerCase();
        
        console.log(`\nTokenId: ${nft.tokenId}`);
        console.log(`  🔗 Blockchain: ${blockchainOwner}`);
        console.log(`  🗄️  Database:   ${dbOwner}`);
        console.log(`  ✅ Status:     ${isSync ? 'SYNCED' : '❌ MISMATCH'}`);
        
        if (!isSync) {
          syncIssues++;
          console.log(`  🔧 Fix needed: Update DB owner to ${blockchainOwner}`);
        }
        
      } catch (error) {
        console.log(`\nTokenId: ${nft.tokenId}`);
        console.log(`  ❌ Error: ${error.message}`);
        if (error.message.includes('invalid token ID')) {
          console.log(`  🚫 Token doesn't exist on blockchain`);
        }
        syncIssues++;
      }
    }
    
    // 5. Summary
    console.log('\n📊 SYNC SUMMARY:');
    console.log('═══════════════════════════════');
    console.log(`Total NFTs in DB: ${dbNFTs.length}`);
    console.log(`Sync issues found: ${syncIssues}`);
    console.log(`Sync success rate: ${((dbNFTs.length - syncIssues) / dbNFTs.length * 100).toFixed(1)}%`);
    
    if (syncIssues > 0) {
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      console.log('1. Update database ownership fields');
      console.log('2. Run indexer service to auto-sync');
      console.log('3. Check smart contract events');
    } else {
      console.log('\n🎉 ALL NFTs ARE IN SYNC! ✅');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

main().catch(console.error);