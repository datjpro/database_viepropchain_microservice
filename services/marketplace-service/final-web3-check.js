/**
 * =======================================================
 * CHECK WEB3 CONNECTION & BALANCE - Final verification
 * =======================================================
 */

const { Web3 } = require("web3");

const web3 = new Web3("http://127.0.0.1:8545");

async function checkConnection() {
  try {
    console.log("🔍 FINAL WEB3 CONNECTION CHECK");
    console.log("═════════════════════════════════");

    // Get current accounts
    const accounts = await web3.eth.getAccounts();
    console.log(`📋 Available accounts: ${accounts.length}`);

    // Check main user account
    const userAccount = "0xd1abb2a4bb9652f90e0944affdf53f0cfff54d13";
    const balance = await web3.eth.getBalance(userAccount);
    const balanceInETH = web3.utils.fromWei(balance, "ether");

    console.log(`\n💰 User Account: ${userAccount}`);
    console.log(`   Balance: ${balanceInETH} ETH`);
    console.log(`   Balance (Wei): ${balance}`);

    // Check if account exists in Ganache
    const isInAccounts = accounts
      .map((a) => a.toLowerCase())
      .includes(userAccount.toLowerCase());
    console.log(`   In Ganache accounts: ${isInAccounts ? "✅ YES" : "❌ NO"}`);

    console.log("\n🎯 Frontend should now display this balance!");
  } catch (error) {
    console.error("❌ Connection error:", error.message);
  }
}

checkConnection();
