# 🧪 HƯỚNG DẪN TEST MICROSERVICES VỚI POSTMAN

## 📋 CHUẨN BỊ

### 1. Import Postman Collection

1. Mở Postman
2. Click **Import** → Chọn file `ViePropChain_Microservices_Tests.postman_collection.json`
3. Collection sẽ xuất hiện với 7 folders

### 2. Thiết lập Environment Variables

**Trong Postman:**

1. Click **Environments** → **Create Environment**
2. Tên: `ViePropChain Local`
3. Thêm biến `walletAddress`:
   - Variable: `walletAddress`
   - Initial Value: `0x...` (địa chỉ wallet của bạn từ Ganache)
   - Current Value: Giống Initial Value

**Lấy wallet address từ Ganache:**

- Mở Ganache UI
- Copy địa chỉ account đầu tiên (Account 0)
- Dạng: `0x1234567890abcdef...`

### 3. Đảm bảo services đang chạy

```powershell
# Start tất cả services
.\start-all-services.ps1
```

Hoặc chạy từng service riêng trong 7 terminal khác nhau.

---

## 🔄 TEST WORKFLOW HOÀN CHỈNH

### ⚡ QUICK TEST (Không cần authentication)

Thứ tự test NHANH để kiểm tra property → NFT:

1. **Folder 0: Health Checks** - Chạy tất cả 6 requests
2. **Folder 2: Create Property** → Chạy "Create Apartment (Vinhomes)"
3. **Folder 5: Mint Property as NFT** → Chạy "Mint Property to NFT"
4. **Folder 6: Query & Verify** → Chạy "Get Property Detail"

---

## 📝 WORKFLOW CHI TIẾT (Có Authentication)

### BƯỚC 0: Health Checks ✅

**Mục đích:** Kiểm tra tất cả services hoạt động

**Các requests:**

- API Gateway Health (4000)
- Auth Service Health (4001)
- IPFS Service Health (4002)
- Admin Service Health (4003)
- Blockchain Service Health (4004)
- Query Service Health (4005)

**Expected Response:**

```json
{
  "success": true,
  "service": "API Gateway",
  "port": 4000,
  "mongodb": "connected",
  "dependencies": {
    "ipfsService": "connected",
    "blockchainService": "connected"
  }
}
```

**Action:** Chạy tất cả 6 requests → Tất cả phải return `"success": true`

---

### BƯỚC 1: Authentication 🔐

#### 1.1. Get Nonce

**Request:** `POST /api/auth/get-nonce`

**Body:**

```json
{
  "walletAddress": "{{walletAddress}}"
}
```

**Response:**

```json
{
  "nonce": "abc123xyz..."
}
```

**Auto-save:** Nonce tự động lưu vào environment variable `{{nonce}}`

---

#### 1.2. Sign Message (MANUAL STEP)

**Không phải request Postman - làm trong MetaMask hoặc code:**

**Message cần ký:**

```
Sign this message to authenticate with ViePropChain. Nonce: abc123xyz...
```

**Cách 1: Dùng MetaMask**

1. Mở MetaMask
2. Connect với Ganache (Network: Localhost 8545)
3. Import private key từ Ganache Account 0
4. Sign message ở trên
5. Copy signature

**Cách 2: Dùng ethers.js script**

```javascript
const { ethers } = require("ethers");

const privateKey = "0x..."; // Từ Ganache
const nonce = "abc123xyz..."; // Từ response bước 1.1
const message = `Sign this message to authenticate with ViePropChain. Nonce: ${nonce}`;

const wallet = new ethers.Wallet(privateKey);
const signature = await wallet.signMessage(message);
console.log("Signature:", signature);
```

**Action:** Copy signature → Paste vào Postman environment variable `{{signature}}`

---

#### 1.3. Verify Signature

**Request:** `POST /api/auth/verify-signature`

**Body:**

```json
{
  "walletAddress": "{{walletAddress}}",
  "signature": "{{signature}}",
  "nonce": "{{nonce}}"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGci...",
  "user": {
    "_id": "...",
    "walletAddress": "0x...",
    "role": "user"
  }
}
```

**Auto-save:**

- `{{authToken}}` - JWT token
- `{{userId}}` - User ID

---

### BƯỚC 2: Create Property 🏠

#### 2.1. Create Apartment (Vinhomes)

**Request:** `POST /api/admin/properties`

**Body:** (đã có sẵn trong collection)

```json
{
  "name": "Căn hộ Vinhomes Central Park 2PN",
  "description": "Căn hộ cao cấp 2 phòng ngủ...",
  "propertyType": "apartment",
  "location": {
    "address": "208 Nguyễn Hữu Cảnh",
    "ward": "Phường 22",
    "district": "Bình Thạnh",
    "city": "Hồ Chí Minh",
    "coordinates": {
      "lat": 10.7967,
      "lng": 106.7218
    }
  },
  "price": {
    "amount": 5000000000,
    "currency": "VND",
    "pricePerM2": 58823529
  },
  "details": {
    "area": { "value": 85, "unit": "m2" },
    "bedrooms": 2,
    "bathrooms": 2,
    "floors": 1,
    "legalStatus": "Sổ hồng",
    "orientation": "Đông Nam",
    "furnishing": "Đầy đủ nội thất"
  },
  "creator": "{{walletAddress}}",
  "owner": "{{walletAddress}}"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Property created successfully",
  "data": {
    "_id": "676...",
    "name": "Căn hộ Vinhomes Central Park 2PN",
    "status": "draft",
    "nft": {
      "isMinted": false
    }
  }
}
```

**Auto-save:** `{{propertyId}}` - Property MongoDB ID

**Action:** Chạy request → Lưu propertyId

---

#### 2.2. Create More Properties (Optional)

Có thể test thêm:

- Create House (Thảo Điền) → Lưu `{{propertyId2}}`
- Create Land (Bình Dương) → Lưu `{{propertyId3}}`

---

### BƯỚC 3: Upload Media to IPFS 📦

#### 3.1. Upload Property Image

**Request:** `POST /api/ipfs/upload/image`

**Body:** (form-data)

- `file`: Chọn file ảnh từ máy tính (JPG, PNG)
- `propertyId`: `{{propertyId}}`

**Response:**

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "cid": "QmXyZ123...",
    "url": "https://gateway.pinata.cloud/ipfs/QmXyZ123...",
    "type": "image",
    "propertyId": "676..."
  }
}
```

**Auto-save:**

- `{{imageCID}}` - IPFS CID
- `{{imageURL}}` - Gateway URL

**Action:**

1. Click vào Body → form-data
2. Hover vào `file` row → Click "Select Files"
3. Chọn ảnh property
4. Send request

---

#### 3.2. Upload Legal Document (Optional)

**Request:** `POST /api/ipfs/upload/document`

**Body:** (form-data)

- `file`: File PDF (sổ hồng, giấy tờ)
- `propertyId`: `{{propertyId}}`
- `documentType`: `soHong`
- `documentName`: `Sổ hồng căn hộ Vinhomes`

**Auto-save:** `{{documentCID}}`

---

### BƯỚC 4: Update Property with Media 🖼️

**Request:** `PUT /api/admin/properties/{{propertyId}}`

**Body:**

```json
{
  "imageUrl": "{{imageURL}}",
  "media": {
    "images": [
      {
        "url": "{{imageURL}}",
        "cid": "{{imageCID}}",
        "isPrimary": true
      }
    ],
    "documents": [
      {
        "type": "soHong",
        "name": "Sổ hồng",
        "url": "https://gateway.pinata.cloud/ipfs/{{documentCID}}",
        "cid": "{{documentCID}}"
      }
    ]
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Property updated",
  "data": {
    "_id": "676...",
    "imageUrl": "https://gateway.pinata.cloud/ipfs/...",
    "media": {
      "images": [...],
      "documents": [...]
    }
  }
}
```

---

### BƯỚC 5: Mint Property as NFT ⛓️ (ĐIỀU PHỐI)

**ĐÂY LÀ BƯỚC QUAN TRỌNG NHẤT!**

**Request:** `POST /api/admin/properties/{{propertyId}}/mint`

**Body:**

```json
{
  "recipient": "{{walletAddress}}"
}
```

**Workflow trong Admin Service:**

```
1. Lấy property từ MongoDB
2. Build NFT metadata JSON
3. Gọi IPFS Service → Upload metadata lên Pinata
4. Gọi Blockchain Service → Mint NFT on Ganache
5. Update property với NFT info
6. Indexer Service tự động detect Transfer event
```

**Response:**

```json
{
  "success": true,
  "message": "Property minted as NFT successfully",
  "data": {
    "propertyId": "676...",
    "tokenId": 1,
    "contractAddress": "0x...",
    "owner": "0x...",
    "transactionHash": "0x...",
    "blockNumber": 123,
    "tokenURI": "https://gateway.pinata.cloud/ipfs/QmMetadata...",
    "metadataCID": "QmMetadata..."
  }
}
```

**Auto-save:**

- `{{tokenId}}` - NFT Token ID
- `{{contractAddress}}` - Smart Contract Address
- `{{transactionHash}}` - Blockchain TX Hash
- `{{metadataCID}}` - Metadata IPFS CID

**Action:** Chạy request → Check logs của 3 services:

- Admin Service: "🔄 Minting property..."
- IPFS Service: "📦 Uploading metadata..."
- Blockchain Service: "⛓️ Minting NFT..."
- Indexer Service: "📦 Found 1 Transfer event(s)"

---

### BƯỚC 6: Query & Verify ✅

#### 6.1. Get Property Detail

**Request:** `GET /api/query/properties/{{propertyId}}`

**Response:** Property với NFT info đầy đủ

```json
{
  "success": true,
  "data": {
    "_id": "676...",
    "name": "Căn hộ Vinhomes Central Park 2PN",
    "status": "minted",
    "nft": {
      "isMinted": true,
      "tokenId": 1,
      "contractAddress": "0x...",
      "currentOwner": "0x...",
      "metadataCID": "QmMetadata...",
      "mintedAt": "2025-10-20T...",
      "transactionHash": "0x..."
    },
    "imageUrl": "https://gateway.pinata.cloud/ipfs/..."
  }
}
```

**Verify:**

- `nft.isMinted` = `true`
- `nft.tokenId` có giá trị
- `status` = `"minted"`

---

#### 6.2. Search All Properties

**Request:** `GET /api/query/properties?page=1&limit=20`

**Response:** List tất cả properties

---

#### 6.3. Get NFT Info (On-chain)

**Request:** `GET /api/blockchain/nft/{{tokenId}}`

**Response:** Thông tin NFT từ blockchain

```json
{
  "success": true,
  "data": {
    "tokenId": 1,
    "owner": "0x...",
    "tokenURI": "https://gateway.pinata.cloud/ipfs/QmMetadata...",
    "contractAddress": "0x..."
  }
}
```

---

#### 6.4. Get NFT from Query Service

**Request:** `GET /api/query/nfts/{{tokenId}}`

**Response:** NFT info từ MongoDB + Property liên kết

```json
{
  "success": true,
  "data": {
    "nft": {
      "tokenId": 1,
      "owner": "0x...",
      "tokenURI": "...",
      "transferHistory": [...]
    },
    "property": {
      "name": "Căn hộ Vinhomes Central Park 2PN",
      ...
    }
  }
}
```

---

#### 6.5. Get IPFS Metadata Content

**Request:** `GET /api/ipfs/content/{{metadataCID}}`

**Response:** NFT metadata JSON

```json
{
  "success": true,
  "data": {
    "content": {
      "name": "Căn hộ Vinhomes Central Park 2PN",
      "description": "...",
      "image": "https://gateway.pinata.cloud/ipfs/...",
      "external_url": "https://viepropchain.com/properties/676...",
      "attributes": [
        {"trait_type": "Property Type", "value": "apartment"},
        {"trait_type": "City", "value": "Hồ Chí Minh"},
        {"trait_type": "Area", "value": "85 m2"},
        {"trait_type": "Bedrooms", "value": "2"},
        {"trait_type": "Legal Status", "value": "Sổ hồng"}
      ],
      "legal_documents": [...],
      "propertyId": "676..."
    }
  }
}
```

---

#### 6.6. Get Statistics

**Request:** `GET /api/query/stats/overview`

**Response:**

```json
{
  "success": true,
  "data": {
    "totalProperties": 3,
    "totalMinted": 1,
    "byType": [
      { "_id": "apartment", "count": 1 },
      { "_id": "house", "count": 1 },
      { "_id": "land", "count": 1 }
    ],
    "byStatus": [
      { "_id": "draft", "count": 2 },
      { "_id": "minted", "count": 1 }
    ]
  }
}
```

---

### BƯỚC 7: Blockchain Operations ⛓️

#### 7.1. Transfer NFT

**Request:** `POST /api/blockchain/transfer`

**Body:**

```json
{
  "from": "{{walletAddress}}",
  "to": "0x...",
  "tokenId": "{{tokenId}}"
}
```

**Note:** Thay `to` bằng địa chỉ khác từ Ganache

**Response:**

```json
{
  "success": true,
  "message": "NFT transferred successfully",
  "data": {
    "transactionHash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "tokenId": 1
  }
}
```

**Verify:** Sau ~3s, Indexer Service sẽ detect Transfer event và update MongoDB

---

#### 7.2. Get Token Counter

**Request:** `GET /api/blockchain/token-counter`

**Response:**

```json
{
  "success": true,
  "data": {
    "totalMinted": 1
  }
}
```

---

## 🎯 TEST CASES

### Test Case 1: Tạo và Mint 1 Property (Cơ bản)

**Steps:**

1. Health Checks (6 requests)
2. Create Apartment
3. Mint Property to NFT
4. Get Property Detail
5. Get NFT Info

**Expected:** Property có `nft.isMinted = true`, tokenId có giá trị

---

### Test Case 2: Tạo 3 Properties, Mint tất cả

**Steps:**

1. Create 3 properties (Apartment, House, Land)
2. Mint tất cả 3
3. Get Statistics → `totalMinted = 3`
4. Search by city

---

### Test Case 3: Upload Media rồi Mint

**Steps:**

1. Create Property
2. Upload Image
3. Upload Document
4. Update Property with Media URLs
5. Mint Property
6. Verify metadata có image URL

---

### Test Case 4: Transfer NFT

**Steps:**

1. Mint Property → Token ID 1
2. Transfer NFT to another address
3. Wait 5s (Indexer update)
4. Get NFT Info → Verify owner changed
5. Get Property Detail → Verify `nft.currentOwner` changed

---

## 🐛 TROUBLESHOOTING

### Lỗi "MongoDB connection error"

```
Solution: Đảm bảo MongoDB đang chạy
> net start MongoDB
```

### Lỗi "Ganache connection error"

```
Solution: Mở Ganache UI, start workspace
```

### Lỗi "Contract address not found"

```
Solution: Check file .env của blockchain-service
CONTRACT_ADDRESS=0x... (từ deployment-development.json)
```

### Lỗi "IPFS upload failed - 401"

```
Solution: Check PINATA_JWT trong .env của ipfs-service
Tạo API key mới tại: https://app.pinata.cloud/developers/api-keys
```

### Property mint nhưng `nft.isMinted = false`

```
Solution:
1. Check logs của admin-service
2. Verify IPFS service và Blockchain service đang chạy
3. Re-run mint request
```

### Indexer không update NFT owner

```
Solution:
1. Check logs của indexer-service
2. Verify CONTRACT_ADDRESS đúng
3. Restart indexer-service
```

---

## ✅ CHECKLIST TEST HOÀN CHỈNH

- [ ] All 6 services health check OK
- [ ] MongoDB connected
- [ ] Ganache connected
- [ ] Create property thành công
- [ ] Upload image to IPFS thành công
- [ ] Mint property to NFT thành công
- [ ] Property status = "minted"
- [ ] NFT có tokenId
- [ ] Query service trả về property với NFT info
- [ ] Blockchain service trả về NFT on-chain info
- [ ] IPFS service trả về metadata content
- [ ] Transfer NFT thành công
- [ ] Indexer service update owner sau transfer
- [ ] Statistics hiển thị đúng số lượng

---

## 📊 KẾT QUẢ MONG ĐỢI

Sau khi chạy workflow hoàn chỉnh:

**MongoDB:**

- `properties` collection: 1 document với `nft.isMinted = true`
- `nfts` collection: 1 document với tokenId = 1
- `transactions` collection: 1-2 documents (mint, transfer nếu có)
- `ipfs_metadata` collection: 2-3 documents (image, document, metadata)

**Blockchain (Ganache):**

- 1 NFT đã mint (Token ID = 1)
- Owner = wallet address của bạn
- TokenURI = IPFS gateway URL

**IPFS (Pinata):**

- 2-3 files đã upload
- Metadata JSON có đầy đủ attributes

---

**🎉 HOÀN THÀNH!** Microservices architecture đã test thành công!
