// file: gen-signature.js
// Usage:
//   node gen-signature.js <PRIVATE_KEY> <CONTRACT_ADDRESS> <TOKEN_ID> <PRICE_ETH>
// Example:
//   node gen-signature.js 0xabc... 0xMarketAddr 1 10

const { ethers } = require("ethers");

async function main() {
  const args = process.argv.slice(2);

  const PRIVATE_KEY = args[0] || process.env.PRIVATE_KEY;
  const CONTRACT_ADDRESS = args[1] || process.env.CONTRACT_ADDRESS;
  const tokenId = Number(args[2] || process.env.TOKEN_ID || 1);
  const priceETH = args[3] || process.env.PRICE_ETH || "10";

  if (!PRIVATE_KEY || !CONTRACT_ADDRESS) {
    console.error(
      "Usage: node gen-signature.js <PRIVATE_KEY> <CONTRACT_ADDRESS> <TOKEN_ID> <PRICE_ETH>"
    );
    process.exit(1);
  }

  // --- BẮT ĐẦU KÝ ---
  const wallet = new ethers.Wallet(PRIVATE_KEY);
  const priceWei = ethers.parseEther(priceETH.toString());

  const messageHash = ethers.solidityPackedKeccak256(
    ["uint256", "uint256", "address"],
    [tokenId, priceWei, CONTRACT_ADDRESS]
  );
  const messageBytes = ethers.getBytes(messageHash);
  const signature = await wallet.signMessage(messageBytes);

  console.log(
    "\n================ KẾT QUẢ ĐỂ COPY VÀO POSTMAN ================"
  );
  console.log("Seller Address:", wallet.address);
  console.log("Signature:", signature);
  console.log("Price (Wei):", priceWei.toString());
  console.log("TokenId:", tokenId);
  console.log("ContractAddress:", CONTRACT_ADDRESS);
  console.log("\n-- POSTMAN BODY (copy/paste) --\n");
  const postmanBody = {
    tokenId: tokenId,
    contractAddress: CONTRACT_ADDRESS,
    propertyId: process.env.PROPERTY_ID || "<PUT_PROPERTY_ID_HERE>",
    price: priceWei.toString(),
    description: "Test off-chain listing",
    signature: signature,
    isOffchain: true,
  };
  console.log(JSON.stringify(postmanBody, null, 2));
  console.log(
    "\n============================================================="
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
