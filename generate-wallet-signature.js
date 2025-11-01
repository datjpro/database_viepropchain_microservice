/**
 * ========================================================================
 * WALLET SIGNATURE GENERATOR - FOR POSTMAN TESTING
 * ========================================================================
 *
 * Mục đích: Generate signature để test "Wallet Linking" trong Postman
 *
 * Vì Postman KHÔNG CÓ MetaMask, nên phải dùng script này để:
 * 1. Lấy message từ Step 1 trong Postman
 * 2. Sign message bằng private key từ Ganache
 * 3. Copy signature vào Step 2 trong Postman
 */

const { ethers } = require("ethers");

// ========================================================================
// CẤU HÌNH
// ========================================================================

/**
 * Ganache Accounts (from mnemonic):
 * "arm either chef prosper fish lonely rigid antique dawn stumble wife camera"
 *
 * Account 0:
 *   Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2
 *   Private Key: 0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d
 *
 * Account 1:
 *   Address: 0xd1ABb2a4Bb9652f90E0944AFfDf53F0cFFf54D13
 *   Private Key: 0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1
 *
 * Account 2:
 *   Address: 0x2546BcD3c84621e976D8185a91A922aE77ECEc30
 *   Private Key: 0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c
 */

// 👇 THAY ĐỔI PRIVATE KEY TẠI ĐÂY (từ Ganache)
// Wallet: 0xC6890b26A32d9d92aefbc8635C4588247529CdfE
// Copy private key từ Ganache cho wallet này!
const PRIVATE_KEY =
  "0x00e2d203b35ea4707782945850e8227f609af98cc0fa17f0a7ccf9ec9c678ac7"; // ← Paste private key của 0xC6890... từ Ganache

// 👇 PASTE MESSAGE TỪ POSTMAN TẠI ĐÂY (từ response ở trên)
const MESSAGE =
  "Link wallet 0x28125abecb7b1e1af3dde4f7397911f934e5a5b9 to ViePropChain account datto2207@gmail.com";

// ========================================================================
// GENERATE SIGNATURE
// ========================================================================

async function generateSignature() {
  try {
    console.log("🔐 WALLET SIGNATURE GENERATOR");
    console.log("=".repeat(60));
    console.log("");

    // Tạo wallet từ private key
    const wallet = new ethers.Wallet(PRIVATE_KEY);

    console.log("📋 THÔNG TIN:");
    console.log(`   Wallet Address: ${wallet.address}`);
    console.log(`   Message: "${MESSAGE}"`);
    console.log("");

    // Sign message
    const signature = await wallet.signMessage(MESSAGE);

    console.log("✅ SIGNATURE GENERATED!");
    console.log("=".repeat(60));
    console.log("");
    console.log("📤 COPY SIGNATURE NÀY VÀO POSTMAN:");
    console.log("");
    console.log(signature);
    console.log("");
    console.log("=".repeat(60));
    console.log("");
    console.log("🧪 HƯỚNG DẪN SỬ DỤNG:");
    console.log("   1. Copy signature ở trên");
    console.log("   2. Mở Postman");
    console.log("   3. Vào request: '4. Wallet Linking → Step 2'");
    console.log("   4. Paste signature vào field 'signature' trong Body");
    console.log("   5. Send request");
    console.log("");
    console.log("✅ Wallet sẽ được link với Gmail account của bạn!");
    console.log("");

    // Verify (optional - for debugging)
    const recoveredAddress = ethers.verifyMessage(MESSAGE, signature);
    console.log("🔍 VERIFICATION (for debugging):");
    console.log(`   Original Address:  ${wallet.address}`);
    console.log(`   Recovered Address: ${recoveredAddress}`);
    console.log(
      `   Match: ${
        recoveredAddress.toLowerCase() === wallet.address.toLowerCase()
          ? "✅ YES"
          : "❌ NO"
      }`
    );
    console.log("");
  } catch (error) {
    console.error("❌ ERROR:", error.message);
    console.log("");
    console.log("⚠️ KIỂM TRA:");
    console.log("   1. Đã cài ethers.js chưa? (npm install ethers)");
    console.log("   2. Private key đúng format? (phải bắt đầu bằng 0x)");
    console.log("   3. Message đã copy đúng từ Postman?");
  }
}

// ========================================================================
// RUN
// ========================================================================

generateSignature();

// ========================================================================
// QUICK REFERENCE - GANACHE ACCOUNTS
// ========================================================================

/*

ACCOUNT 0 (Admin):
  Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2
  Private Key: 0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d

ACCOUNT 1 (User):
  Address: 0xd1ABb2a4Bb9652f90E0944AFfDf53F0cFFf54D13
  Private Key: 0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1

ACCOUNT 2 (User):
  Address: 0x2546BcD3c84621e976D8185a91A922aE77ECEc30
  Private Key: 0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c

ACCOUNT 3 (User):
  Address: 0xbDA5747bFD65F08deb54cb465eB87D40e51B197E
  Private Key: 0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913

ACCOUNT 4 (User):
  Address: 0xdD2FD4581271e230360230F9337D5c0430Bf44C0
  Private Key: 0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743

*/
