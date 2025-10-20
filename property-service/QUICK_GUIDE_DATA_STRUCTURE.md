# 🚀 QUICK START - CẤU TRÚC DỮ LIỆU IPFS & MONGODB

## ⚡ TÓM TẮT NHANH

### IPFS (Không đổi) vs MongoDB (Thay đổi)

```
┌─────────────────────────────────────────────────────────────┐
│                    IPFS (Immutable)                         │
├─────────────────────────────────────────────────────────────┤
│  ✅ name, description                                        │
│  ✅ image (IPFS link)                                        │
│  ✅ external_url                                             │
│  ✅ attributes (loại hình, vị trí, diện tích...)            │
│  ✅ legal_documents (sổ đỏ, giấy phép...)                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  MongoDB (Mutable)                          │
├─────────────────────────────────────────────────────────────┤
│  ✅ tokenId, contractAddress                                │
│  ✅ owner (đồng bộ từ Transfer event)                       │
│  ✅ status (draft, minted, for_sale, sold...)               │
│  ✅ price, listingPrice (đồng bộ từ event)                  │
│  ✅ auctionInfo (bid info)                                  │
│  ✅ viewCount, favoriteCount (analytics)                    │
│  ✅ name, imageUrl (cache từ IPFS)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 CODE EXAMPLES

### 1. Build IPFS Metadata

```javascript
const { buildNFTMetadata } = require('./ipfsService');

// Build metadata từ property
const metadata = buildNFTMetadata(property, 'https://viepropchain.com');

// Kết quả:
{
  name: "Villa Sài Gòn - Quận 2",
  description: "Biệt thự cao cấp...",
  image: "ipfs://QmYYY.../image.jpg",
  external_url: "https://viepropchain.com/properties/65abc...",
  attributes: [
    { trait_type: "Loại hình BĐS", value: "Biệt thự" },
    { trait_type: "Thành phố", value: "TP.HCM" },
    { trait_type: "Diện tích đất", value: "300m2" },
    // ...
  ],
  legal_documents: [
    {
      name: "Sổ đỏ",
      url: "ipfs://QmXXX.../so-do.pdf",
      type: "land_title"
    }
  ]
}
```

### 2. Upload lên IPFS

```javascript
const { uploadMetadataToIPFS } = require("./ipfsService");

// Upload metadata
const { ipfsHash, tokenURI } = await uploadMetadataToIPFS(metadata);

console.log(ipfsHash); // QmXXX...
console.log(tokenURI); // https://gateway.pinata.cloud/ipfs/QmXXX...

// Lưu vào property
property.ipfsMetadataCid = ipfsHash;
await property.save();
```

### 3. Mint NFT với tokenURI

```javascript
const { requestMinting } = require("./mintingClient");

// Gửi request mint
const result = await requestMinting(
  "0x1234...abcd", // recipient
  tokenURI // ipfs://QmXXX...
);

// Cập nhật property
await property.markAsMinted({
  tokenId: result.tokenId,
  contractAddress: result.contractAddress,
  owner: result.owner,
  tokenURI: result.tokenURI,
  transactionHash: result.transactionHash,
  ipfsHash: result.ipfsHash,
});
```

### 4. Cập nhật Owner (từ Transfer event)

```javascript
// Trong event listener (minting-service)
async function handleTransferEvent(from, to, tokenId, txHash) {
  // Cập nhật trong minting-service DB
  const nft = await NFT.findOne({ tokenId });
  nft.owner = to;
  await nft.save();

  // (Optional) Sync sang property-service
  const property = await Property.findOne({ "nft.tokenId": tokenId });
  if (property) {
    await property.updateOwner(to, txHash);
  }
}
```

### 5. Cập nhật Listing Price (từ event)

```javascript
// Trong marketplace event listener
async function handleListedEvent(tokenId, seller, price) {
  const property = await Property.findOne({ "nft.tokenId": tokenId });

  if (property) {
    await property.updateStatus("for_sale");
    await property.updateListingPrice(price, "VND");
  }
}
```

### 6. Query Properties

```javascript
// Lấy tất cả properties đang bán
const properties = await Property.find({
  status: "for_sale",
  "nft.isMinted": true,
})
  .sort({ "analytics.views": -1 })
  .limit(20);

// Lấy properties theo owner
const myProperties = await Property.find({
  "nft.owner": "0x1234...abcd",
});

// Lấy properties theo giá
const cheapProperties = await Property.find({
  "listingPrice.amount": { $lte: 5000000000 },
});
```

---

## 🔄 WORKFLOW ĐỒNG BỘ DỮ LIỆU

### Khi mint NFT mới:

```
1. Create property in MongoDB
   ↓
2. Build metadata từ property
   ↓
3. Upload metadata → IPFS
   ↓
4. Mint NFT với tokenURI
   ↓
5. Update property với NFT info
   ↓
6. Cache metadata trong MongoDB
```

### Khi NFT được transfer:

```
1. User transfer NFT on blockchain
   ↓
2. Blockchain emit Transfer(from, to, tokenId)
   ↓
3. Event Listener phát hiện
   ↓
4. Update owner trong MongoDB
   → property.updateOwner(to, txHash)
```

### Khi list for sale:

```
1. User list NFT trên marketplace
   ↓
2. Smart contract emit Listed(tokenId, price)
   ↓
3. Event Listener phát hiện
   ↓
4. Update status và price trong MongoDB
   → property.updateStatus('for_sale')
   → property.updateListingPrice(price)
```

---

## 📊 PROPERTY MODEL METHODS

### Instance Methods:

```javascript
// Increment analytics
await property.incrementViews();
await property.incrementFavorites();

// Update status
await property.updateStatus("for_sale");

// Mark as minted (sau khi mint)
await property.markAsMinted({
  tokenId: 1,
  contractAddress: "0x52B42...",
  owner: "0x1234...",
  tokenURI: "ipfs://QmXXX...",
  transactionHash: "0xabc...",
  ipfsHash: "QmXXX...",
});

// Update owner (từ Transfer event)
await property.updateOwner("0x5678...", "0xtxhash...");

// Update listing price (từ PriceUpdated event)
await property.updateListingPrice(15000000000, "VND");
```

---

## 🎯 CHECKLIST KHI IMPLEMENT

### ✅ Setup IPFS:

- [ ] Có Pinata account và JWT token
- [ ] Config trong `.env`: `PINATA_JWT`
- [ ] Test upload: `uploadMetadataToIPFS()`

### ✅ Setup MongoDB:

- [ ] Có MongoDB connection string
- [ ] Config trong `.env`: `MONGODB_URI`
- [ ] Indexes đã được tạo

### ✅ Setup Minting Service:

- [ ] Minting service đang chạy (port 3002)
- [ ] Có thể mint NFT: `POST /mint`
- [ ] Event listener đang chạy

### ✅ Setup Property Service:

- [ ] Property service đang chạy (port 3003)
- [ ] Connect được với minting service
- [ ] API endpoints hoạt động

### ✅ Test Flow:

- [ ] Create property mới
- [ ] Build và upload metadata lên IPFS
- [ ] Mint NFT thành công
- [ ] Owner được cập nhật khi transfer
- [ ] Price được cập nhật khi list

---

## 🐛 DEBUGGING TIPS

### IPFS upload failed:

```javascript
// Check Pinata JWT
console.log(process.env.PINATA_JWT);

// Test upload
const result = await uploadMetadataToIPFS({
  name: "Test",
  description: "Test",
});
```

### Owner không update:

```javascript
// Check event listener đang chạy
// Trong minting-service/eventListener.js

// Check polling interval
console.log("Last checked block:", lastCheckedBlock);

// Manually update
await property.updateOwner("0xnewowner...", "0xtxhash...");
```

### Query chậm:

```javascript
// Check indexes
db.properties.getIndexes();

// Add index
propertySchema.index({ "nft.owner": 1 });

// Use lean() cho read-only
const properties = await Property.find({}).lean();
```

---

## 📚 FILES QUAN TRỌNG

### Property Service:

1. **propertyModel.js** - Schema MongoDB
2. **ipfsService.js** - Upload IPFS, build metadata
3. **mintingClient.js** - Gọi minting service
4. **index.js** - API endpoints

### Minting Service:

1. **index.js** - API mint NFT
2. **blockchainService.js** - Mint trên blockchain
3. **eventListener.js** - Lắng nghe Transfer events
4. **nftModel.js** - NFT schema

---

## 🔗 API ENDPOINTS

### Property Service (Port 3003):

```bash
# Create và mint (all-in-one)
POST /properties/create-and-mint
Body: { recipient, ...propertyData }

# Create property only
POST /properties

# Get all properties
GET /properties?status=for_sale&minPrice=1000000

# Get property by ID
GET /properties/:id

# Mint property to NFT
POST /properties/:id/mint
Body: { recipient }

# Update property
PUT /properties/:id

# Delete property
DELETE /properties/:id

# Analytics
POST /properties/:id/favorite
POST /properties/:id/share

# Statistics
GET /properties/stats/overview
```

### Minting Service (Port 3002):

```bash
# Mint NFT
POST /mint
Body: { recipient, tokenURI }

# Get NFT info
GET /nft/:tokenId

# Get NFTs by owner
GET /nfts/:owner

# Get all NFTs
GET /nfts
```

---

## 💡 BEST PRACTICES

### ✅ DO:

1. **Cache metadata từ IPFS** → MongoDB để query nhanh
2. **Đồng bộ owner** từ Transfer events tự động
3. **Validate data** trước khi upload IPFS (không sửa được sau này!)
4. **Use indexes** cho query performance
5. **Log tất cả actions** để debug

### ❌ DON'T:

1. **Không lưu** price, owner, status lên IPFS
2. **Không query IPFS** mỗi lần hiển thị list
3. **Không update owner** manually (để event listener xử lý)
4. **Không skip validation** khi upload IPFS
5. **Không quên** add indexes cho query

---

**Đọc thêm:** `DATA_STRUCTURE_GUIDE.md` để hiểu chi tiết hơn!
