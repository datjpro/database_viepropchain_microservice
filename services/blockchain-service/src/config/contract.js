/**
 * ========================================================================
 * SMART CONTRACT CONFIGURATION
 * ========================================================================
 */

// Smart Contract ABI (ERC721 NFT với ERC721Enumerable)
const CONTRACT_ABI = [
  "function mint(address recipient, string memory tokenURI) public returns (uint256)",
  "function transferFrom(address from, address to, uint256 tokenId) public",
  "function approve(address to, uint256 tokenId) public",
  "function ownerOf(uint256 tokenId) public view returns (address)",
  "function tokenURI(uint256 tokenId) public view returns (string memory)",
  "function tokenCounter() public view returns (uint256)",
  "function balanceOf(address owner) public view returns (uint256)",

  // ERC721Enumerable functions
  "function totalSupply() public view returns (uint256)",
  "function tokenByIndex(uint256 index) public view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) public view returns (uint256)",

  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

module.exports = {
  CONTRACT_ABI,
};
