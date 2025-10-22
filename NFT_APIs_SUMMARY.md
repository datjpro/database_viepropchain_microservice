# 📦 NFT MARKETPLACE APIs - SUMMARY

## 🎯 Overview

Hệ thống NFT Marketplace với **11 endpoints** để quản lý NFT properties:

- **Query APIs** (3) - Xem thông tin NFT
- **Marketplace APIs** (2) - List/unlist NFT for sale
- **Owner Update APIs** (3) - Owner thay đổi giá/status/metadata
- **Internal APIs** (2) - Record transactions (từ Indexer Service)
- **Statistics API** (1) - Marketplace stats

---

## 📡 API Endpoints

### 1️⃣ Query APIs (Public)

#### GET `/nfts/:tokenId`

**Mục đích:** Xem chi tiết NFT

**Request:**

```http
GET http://localhost:4003/nfts/8
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tokenId": 8,
    "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
    "propertyId": {
      "_id": "68f88b446dcb6241698a902c",
      "title": "Luxury Villa in District 2",
      "price": 15000000000
    },
    "currentOwner": "0xc6890b26a32d9d92aefbc8635c4588247529cdfe",
    "originalOwner": "0xc6890b26a32d9d92aefbc8635c4588247529cdfe",
    "status": "minted",
    "metadataUri": "ipfs://QmR6FtgPMLKkmHpAhhMBTH94Nocy62GeVynDMcsPrdFCxm",
    "listing": {
      "isListed": false,
      "price": null,
      "priceETH": null
    },
    "mintedAt": "2025-10-22T10:15:30Z",
    "mintTransactionHash": "0x638aee567d1d9aacfce0f96579a7047b6f2ff32d259c933b4d6825e8a2258670",
    "mintBlockNumber": 32,
    "transferHistory": [
      {
        "from": "0x0000000000000000000000000000000000000000",
        "to": "0xc6890b26a32d9d92aefbc8635c4588247529cdfe",
        "transferType": "mint",
        "transferredAt": "2025-10-22T10:15:30Z"
      }
    ],
    "saleHistory": [],
    "totalTransfers": 1,
    "totalSales": 0,
    "views": 0,
    "favorites": 0
  }
}
```

---

#### GET `/nfts/owner/:walletAddress`

**Mục đích:** Xem tất cả NFT của 1 owner

**Request:**

```http
GET http://localhost:4003/nfts/owner/0xC6890b26A32d9d92aefbc8635C4588247529CdfE
```

**Response:**

```json
{
  "success": true,
  "data": {
    "owner": "0xc6890b26a32d9d92aefbc8635c4588247529cdfe",
    "count": 3,
    "nfts": [
      {
        "tokenId": 8,
        "status": "listed",
        "listing": {
          "isListed": true,
          "priceETH": 1.5
        }
      },
      {
        "tokenId": 5,
        "status": "minted",
        "listing": {
          "isListed": false
        }
      }
    ]
  }
}
```

---

#### GET `/nfts/marketplace/listed`

**Mục đích:** Xem tất cả NFT đang bán (marketplace)

**Request:**

```http
GET http://localhost:4003/nfts/marketplace/listed?minPrice=0.5&maxPrice=10
```

**Query params:**

- `minPrice` - Giá tối thiểu (ETH)
- `maxPrice` - Giá tối đa (ETH)
- `sortBy` - Sắp xếp: `price_asc`, `price_desc`, `recent`

**Response:**

```json
{
  "success": true,
  "data": {
    "count": 5,
    "nfts": [
      {
        "tokenId": 8,
        "currentOwner": "0xc6890b26...",
        "property": {
          "title": "Luxury Villa",
          "area": 250,
          "bedrooms": 3
        },
        "listing": {
          "price": "1500000000000000000",
          "priceETH": 1.5,
          "listedAt": "2025-10-22T..."
        }
      }
    ]
  }
}
```

---

### 2️⃣ Marketplace APIs

#### POST `/nfts/:tokenId/list`

**Mục đích:** List NFT for sale

**Request:**

```json
POST http://localhost:4003/nfts/8/list
{
  "price": "1000000000000000000",
  "seller": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
  "listingId": 1
}
```

**Body:**

- `price` (required) - Giá bán (wei). 1 ETH = 10^18 wei
- `seller` (required) - Wallet address của seller
- `listingId` (optional) - ID của listing trên smart contract

**Response:**

```json
{
  "success": true,
  "message": "NFT listed for sale",
  "data": {
    "tokenId": 8,
    "status": "listed",
    "listing": {
      "isListed": true,
      "listingId": 1,
      "price": "1000000000000000000",
      "priceETH": 1,
      "listedAt": "2025-10-22T...",
      "seller": "0xc6890b26..."
    }
  }
}
```

**Security:**

- Verify seller là owner của NFT
- Return 403 nếu không phải owner

---

#### POST `/nfts/:tokenId/unlist`

**Mục đích:** Cancel sale (gỡ listing)

**Request:**

```http
POST http://localhost:4003/nfts/8/unlist
```

**Response:**

```json
{
  "success": true,
  "message": "NFT unlisted",
  "data": {
    "tokenId": 8,
    "status": "minted",
    "listing": {
      "isListed": false,
      "price": null,
      "priceETH": null
    }
  }
}
```

---

### 3️⃣ Owner Update APIs (Protected)

#### PUT `/nfts/:tokenId/price`

**Mục đích:** Owner update giá bán

**Request:**

```json
PUT http://localhost:4003/nfts/8/price
{
  "price": "2000000000000000000",
  "owner": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE"
}
```

**Body:**

- `price` (required) - Giá mới (wei)
- `owner` (required) - Wallet address để verify ownership

**Response:**

```json
{
  "success": true,
  "message": "Price updated successfully",
  "data": {
    "tokenId": 8,
    "oldPrice": "1000000000000000000",
    "oldPriceETH": 1,
    "newPrice": "2000000000000000000",
    "newPriceETH": 2
  }
}
```

**Security:**

- Verify `owner` === `nft.currentOwner`
- Return 403 nếu không phải owner
- Return 400 nếu NFT không listed

---

#### PUT `/nfts/:tokenId/status`

**Mục đích:** Owner update status NFT

**Request:**

```json
PUT http://localhost:4003/nfts/8/status
{
  "status": "transferred",
  "owner": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE"
}
```

**Body:**

- `status` (required) - Status mới
  - `minted` - Vừa mint xong
  - `listed` - Đang bán
  - `sold` - Đã bán
  - `transferred` - Đã chuyển nhượng
  - `burned` - Đã burn
- `owner` (required) - Wallet address để verify

**Response:**

```json
{
  "success": true,
  "message": "Status updated successfully",
  "data": {
    "tokenId": 8,
    "oldStatus": "listed",
    "newStatus": "transferred"
  }
}
```

---

#### PUT `/nfts/:tokenId/metadata`

**Mục đích:** Owner update metadata URI (rare use case)

**Request:**

```json
PUT http://localhost:4003/nfts/8/metadata
{
  "metadataUri": "ipfs://QmNewCID...",
  "owner": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE"
}
```

**Body:**

- `metadataUri` (required) - IPFS URI mới
- `owner` (required) - Wallet address để verify

**Response:**

```json
{
  "success": true,
  "message": "Metadata URI updated successfully",
  "data": {
    "tokenId": 8,
    "oldMetadataUri": "ipfs://QmOldCID...",
    "newMetadataUri": "ipfs://QmNewCID..."
  }
}
```

**⚠️ Note:** Metadata thường immutable, chỉ update trong trường hợp đặc biệt!

---

### 4️⃣ Internal APIs (For Indexer Service)

#### POST `/nfts/:tokenId/record-sale`

**Mục đích:** Record sale transaction (internal use)

**Request:**

```json
POST http://localhost:4003/nfts/8/record-sale
{
  "from": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
  "to": "0x1234567890123456789012345678901234567890",
  "price": "1500000000000000000",
  "transactionHash": "0xabc123...",
  "blockNumber": 45
}
```

**Body:**

- `from` - Seller address
- `to` - Buyer address
- `price` - Sale price (wei)
- `transactionHash` - Transaction hash
- `blockNumber` - Block number

**Response:**

```json
{
  "success": true,
  "message": "Sale recorded",
  "data": {
    "tokenId": 8,
    "currentOwner": "0x1234567890...",
    "status": "sold",
    "saleHistory": [
      {
        "from": "0xc6890b26...",
        "to": "0x1234567890...",
        "price": "1500000000000000000",
        "priceETH": 1.5,
        "transactionHash": "0xabc123...",
        "blockNumber": 45,
        "soldAt": "2025-10-22T..."
      }
    ],
    "totalSales": 1
  }
}
```

**⚠️ Chỉ dành cho Indexer Service!** Không expose public.

---

#### POST `/nfts/:tokenId/record-transfer`

**Mục đích:** Record transfer transaction (internal use)

**Request:**

```json
POST http://localhost:4003/nfts/8/record-transfer
{
  "from": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
  "to": "0x1234567890123456789012345678901234567890",
  "transactionHash": "0xdef456...",
  "blockNumber": 50,
  "transferType": "transfer"
}
```

**Body:**

- `from` - Previous owner
- `to` - New owner
- `transactionHash` - Transaction hash
- `blockNumber` - Block number
- `transferType` - Type: `mint`, `transfer`, `sale`, `burn`

**Response:**

```json
{
  "success": true,
  "message": "Transfer recorded",
  "data": {
    "tokenId": 8,
    "currentOwner": "0x1234567890...",
    "transferHistory": [
      {
        "from": "0xc6890b26...",
        "to": "0x1234567890...",
        "transferType": "transfer",
        "transactionHash": "0xdef456...",
        "blockNumber": 50,
        "transferredAt": "2025-10-22T..."
      }
    ],
    "totalTransfers": 2
  }
}
```

---

### 5️⃣ Statistics API

#### GET `/nfts/stats/overview`

**Mục đích:** Marketplace statistics

**Request:**

```http
GET http://localhost:4003/nfts/stats/overview
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalNFTs": 10,
    "totalMinted": 10,
    "totalListed": 5,
    "totalSold": 2,
    "totalTransferred": 3,
    "totalVolume": "12500000000000000000",
    "totalVolumeETH": 12.5,
    "averagePrice": "2500000000000000000",
    "averagePriceETH": 2.5,
    "floorPrice": "1000000000000000000",
    "floorPriceETH": 1,
    "ceilingPrice": "5000000000000000000",
    "ceilingPriceETH": 5
  }
}
```

---

## 🔒 Security

### Ownership Verification

Tất cả owner update APIs verify ownership:

```javascript
if (nft.currentOwner.toLowerCase() !== owner.toLowerCase()) {
  return res.status(403).json({
    success: false,
    error: "You are not the owner of this NFT",
  });
}
```

### Error Handling

```json
// Not Found
{
  "success": false,
  "error": "NFT not found"
}

// Unauthorized
{
  "success": false,
  "error": "You are not the owner of this NFT"
}

// Validation Error
{
  "success": false,
  "error": "Missing required fields: price, owner"
}
```

---

## 📦 Data Architecture

### IPFS (Immutable)

Upload **1 lần duy nhất** khi mint:

```json
{
  "name": "Luxury Villa in District 2",
  "description": "Beautiful 3-bedroom villa...",
  "image": "ipfs://QmImageCID...",
  "attributes": [
    { "trait_type": "Property Type", "value": "Villa" },
    { "trait_type": "Area", "value": "250 sqm" }
  ]
}
```

### MongoDB (Mutable)

Dynamic marketplace data:

```javascript
{
  tokenId: 8,
  currentOwner: "0xc6890b26...",
  status: "listed",
  listing: {
    isListed: true,
    price: "1500000000000000000",
    priceETH: 1.5
  },
  saleHistory: [...],
  transferHistory: [...]
}
```

**Frontend query từ cả 2:**

- Metadata (immutable) từ IPFS gateway
- Current price/status/owner từ API

---

## 🧪 Postman Collection

Đã update file `ViePropChain_Complete_Flow.postman_collection.json`:

- **Folder 7:** NFT Management (9 requests)
- Environment variables: `{{token_id}}`, `{{user1_wallet}}`

---

## 📚 Related Documentation

- **POSTMAN_TEST_GUIDE.md** - Updated with NFT workflow (BƯỚC 7)
- **API_GATEWAY_GUIDE.md** - API Gateway architecture
- **ViePropChain_Complete_Flow.postman_collection.json** - Updated collection

---

## ✅ Testing Checklist

- [ ] Get NFT details
- [ ] List NFT for sale
- [ ] Update price (owner only)
- [ ] Update status (owner only)
- [ ] Unlist NFT
- [ ] Get NFTs by owner
- [ ] Get listed NFTs (marketplace)
- [ ] Test ownership verification (403 error)
- [ ] Get statistics

---

Chúc bạn test thành công! 🎉
