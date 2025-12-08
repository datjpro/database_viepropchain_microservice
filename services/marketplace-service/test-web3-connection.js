/**
 * ========================================================================
 * TEST WEB3 CONNECTION & BALANCE - Debug vấn đề số dư ETH
 * ========================================================================
 */

const { Web3 } = require("web3");

async function testWeb3Connection() {
  try {
    console.log("🔍 TESTING WEB3 CONNECTION");
    console.log("═══════════════════════════");

    // Test connection đến Ganache
    console.log("⏳ Connecting to Ganache...");
    const web3 = new Web3("http://127.0.0.1:8545");

    // Test connection
    const isConnected = await web3.eth.net.isListening();
    console.log(`📡 Ganache connected: ${isConnected ? "✅" : "❌"}`);

    if (!isConnected) {
      console.log("❌ Ganache is not running on port 8545");
      return;
    }

    // Get network info
    const networkId = await web3.eth.net.getId();
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`🌐 Network ID: ${networkId}`);
    console.log(`📦 Latest block: ${blockNumber}`);

    // Test addresses từ Ganache default
    const testAddresses = [
      "0xd1ABb2a4Bb9652f90E0944AFfDf53F0cFFf54D13", // User 1
      "0xC6890b26A32d9d92aefbc8635C4588247529CdfE", // User 2
    ];

    console.log("\n💰 CHECKING BALANCES:");
    console.log("─────────────────────");

    for (const address of testAddresses) {
      try {
        const balance = await web3.eth.getBalance(address);
        const ethBalance = web3.utils.fromWei(balance, "ether");
        const formattedBalance = parseFloat(ethBalance).toFixed(4);

        console.log(`📍 ${address}:`);
        console.log(`   Balance: ${formattedBalance} ETH`);
        console.log(`   Wei: ${balance}`);
      } catch (error) {
        console.log(
          `❌ Error getting balance for ${address}: ${error.message}`
        );
      }
    }

    // Test contract connection
    console.log("\n⛓️ TESTING CONTRACT CONNECTION:");
    console.log("───────────────────────────────");

    const contractABI = [
      {
        inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
        name: "ownerOf",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "totalSupply",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ];

    const contractAddress = "0xEA4F5F49F396B13CA447FaA792A8702054019Cc8";
    const contract = new web3.eth.Contract(contractABI, contractAddress);

    try {
      const totalSupply = await contract.methods.totalSupply().call();
      console.log(`📊 Contract Total Supply: ${totalSupply}`);

      // Test ownerOf for each token
      for (let tokenId = 0; tokenId < totalSupply; tokenId++) {
        try {
          const owner = await contract.methods.ownerOf(tokenId).call();
          console.log(`🎨 Token #${tokenId}: ${owner}`);
        } catch (error) {
          console.log(
            `❌ Token #${tokenId}: ${
              error.message.includes("nonexistent")
                ? "Does not exist"
                : error.message
            }`
          );
        }
      }
    } catch (error) {
      console.log(`❌ Contract error: ${error.message}`);
    }
  } catch (error) {
    console.error("❌ Web3 connection error:", error.message);
  }

  console.log("\n✅ Web3 test completed");
  process.exit(0);
}

// Run với timeout
const timeout = setTimeout(() => {
  console.log("⏰ Test timeout - forcing exit");
  process.exit(1);
}, 15000);

testWeb3Connection().finally(() => {
  clearTimeout(timeout);
});
