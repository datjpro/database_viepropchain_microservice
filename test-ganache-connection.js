// test-ganache-connection.js
const { Web3 } = require("web3");
const contractData = require("./deployment-development.json");

async function testConnection() {
  try {
    console.log("🔍 Testing Ganache connection...\n");

    // Connect to Ganache
    const web3 = new Web3("http://localhost:8545");

    // Test 1: Check connection
    console.log("1️⃣ Checking if Ganache is running...");
    const isListening = await web3.eth.net.isListening();
    console.log("   ✅ Ganache is running:", isListening);

    // Test 2: Get network info
    const networkId = await web3.eth.net.getId();
    const blockNumber = await web3.eth.getBlockNumber();
    console.log("\n2️⃣ Network Information:");
    console.log("   Network ID:", networkId);
    console.log("   Current Block:", blockNumber);

    // Test 3: Get accounts
    const accounts = await web3.eth.getAccounts();
    console.log("\n3️⃣ Available Accounts:");
    accounts.slice(0, 3).forEach((acc, i) => {
      console.log(`   [${i}] ${acc}`);
    });

    // Test 4: Initialize contracts
    console.log("\n4️⃣ Contract Information:");
    console.log(
      "   NFT Contract:",
      contractData.contracts.ViePropChainNFT.address
    );
    console.log("   Marketplace:", contractData.contracts.Marketplace.address);
    console.log("   Offers:", contractData.contracts.Offers.address);

    // Test 5: Call contract
    const nftContract = new web3.eth.Contract(
      contractData.contracts.ViePropChainNFT.abi,
      contractData.contracts.ViePropChainNFT.address
    );

    console.log("\n5️⃣ Testing NFT Contract:");
    const name = await nftContract.methods.name().call();
    const symbol = await nftContract.methods.symbol().call();
    const tokenCounter = await nftContract.methods.tokenCounter().call();

    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Total Minted:", tokenCounter);

    console.log("\n✅ All tests passed! Ganache connection is working.");
    return true;
  } catch (error) {
    console.error("\n❌ Connection Failed:");
    if (error.message.includes("ECONNREFUSED")) {
      console.error("   Ganache is not running on http://localhost:8545");
      console.error("\n💡 Solution:");
      console.error("   1. Open Ganache GUI application");
      console.error("   2. Or run: ganache-cli -p 8545");
      console.error("   3. Make sure port 8545 is not blocked");
    } else {
      console.error("   Error:", error.message);
    }
    return false;
  }
}

testConnection()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
