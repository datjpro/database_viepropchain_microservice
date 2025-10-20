# 🏢 Property Service - Hướng Dẫn Đầy Đủ

Service quản lý bất động sản và điều phối minting NFT cho ViePropChain.

---

## � SETUP NHANH

### 1. Cài đặt

```bash
cd property-service
npm install
```

### 2. Chạy service

```bash
npm start
```

→ Service chạy tại: `http://localhost:3003`

**Lưu ý:** Cần chạy Ganache + Minting Service trước!

---

## 🧪 TEST VỚI POSTMAN (KHÔNG CẦN ENVIRONMENT)

### Bước 1: Chạy các service (3 terminals)

**Terminal 1 - Ganache:**

```bash
cd d:\DACN\RE-Chain\viepropchain
ganache -m "arm either chef prosper fish lonely rigid antique dawn stumble wife camera" --database.dbPath "./ganache-data-dev" --chain.networkId 1337 --server.port 8545
```

**Terminal 2 - Minting Service:**

```bash
cd d:\DACN\RE-Chain\database_viepropchain_microservice\minting-service
npm start
```

**Terminal 3 - Property Service:**

```bash
cd d:\DACN\RE-Chain\database_viepropchain_microservice\property-service
npm start
```

---

### Bước 2: Test các API

#### ✅ TEST 1: Health Check

```
GET http://localhost:3003/health
```

---

#### ✅ TEST 2: Tạo Property

```
POST http://localhost:3003/properties
Content-Type: application/json

{
  "propertyType": "apartment",
  "name": "Căn hộ Vinhomes Central Park",
  "description": "Căn hộ 2PN view sông tuyệt đẹp",
  "price": {
    "amount": 5000000000,
    "currency": "VND"
  },
  "location": {
    "address": "208 Nguyễn Hữu Cảnh, P.22, Q.Bình Thạnh",
    "city": "TP. Hồ Chí Minh",
    "district": "Bình Thạnh"
  },
  "details": {
    "projectName": "Vinhomes Central Park",
    "apartmentCode": "L3-1205",
    "block": "Landmark 3",
    "floor": 12,
    "bedrooms": 2,
    "bathrooms": 2,
    "netArea": "80m2",
    "balconyDirection": "Đông Nam",
    "legalStatus": "Sổ hồng"
  },
  "media": {
    "images": [
      {
        "url": "https://example.com/image1.jpg",
        "isPrimary": true
      }
    ]
  },
  "owner": {
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4",
    "name": "Nguyễn Văn A"
  }
}
```

**→ Copy `_id` từ response để dùng cho test tiếp theo**

---

#### ✅ TEST 3: Get All Properties

```
GET http://localhost:3003/properties
```

---

#### ✅ TEST 4: Get Property By ID

```
GET http://localhost:3003/properties/{property_id}
```

**Thay `{property_id}` bằng ID từ TEST 2**

---

#### ✅ TEST 5: Mint Property to NFT (QUAN TRỌNG)

```
POST http://localhost:3003/properties/{property_id}/mint
Content-Type: application/json

{
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4"
}
```

**Thay `{property_id}` bằng ID từ TEST 2**

**Response sẽ có:**

- `tokenId`: Số thứ tự NFT
- `transactionHash`: Hash giao dịch trên blockchain
- `tokenURI`: Link IPFS metadata
- `contractAddress`: Địa chỉ smart contract

---

#### ✅ TEST 6: Update Property

```
PUT http://localhost:3003/properties/{property_id}
Content-Type: application/json

{
  "price": {
    "amount": 5500000000
  },
  "status": "for_sale",
  "details": {
    "interiorStatus": "Nội thất đầy đủ"
  }
}
```

---

#### ✅ TEST 7: Get Statistics

```
GET http://localhost:3003/properties/stats/overview
```

---

#### ✅ TEST 8: Search Properties

```
GET http://localhost:3003/properties?propertyType=apartment&city=TP. Hồ Chí Minh&minPrice=3000000000&maxPrice=6000000000
```

---

#### ✅ TEST 9: Increment View Count

```
POST http://localhost:3003/properties/{property_id}/view
```

---

#### ✅ TEST 10: Delete Property

```
DELETE http://localhost:3003/properties/{property_id}
```

---

## 📊 GIẢI THÍCH DỮ LIỆU

### IPFS (Không thay đổi - Immutable)

```json
{
  "name": "Căn hộ Vinhomes Central Park",
  "description": "Căn hộ 2PN view sông",
  "image": "https://example.com/image1.jpg",
  "external_url": "https://viepropchain.com/properties/123",
  "attributes": [
    { "trait_type": "Property Type", "value": "apartment" },
    { "trait_type": "Bedrooms", "value": "2" },
    { "trait_type": "Location", "value": "TP. Hồ Chí Minh" }
  ],
  "legal_documents": [{ "name": "Sổ hồng", "url": "ipfs://..." }]
}
```

### MongoDB (Có thể thay đổi - Mutable)

```json
{
  "tokenId": 1,
  "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
  "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4",
  "status": "for_sale",
  "price": { "amount": 5000000000, "currency": "VND" },
  "listingPrice": { "amount": 5500000000, "updatedAt": "..." },
  "auctionInfo": {
    "isAuction": true,
    "startingBid": 5000000000,
    "currentBid": 5200000000,
    "endTime": "2024-12-31T23:59:59Z"
  },
  "analytics": {
    "views": 100,
    "favorites": 10,
    "shares": 5
  }
}
```

**Cache từ IPFS trong MongoDB:**

- `name`, `imageUrl`, `attributes` → Để query nhanh không cần gọi IPFS

---

## 🏗️ KIẾN TRÚC MICROSERVICES

### 📐 Sơ đồ tổng quan

```
Frontend (React) → API Gateway → Microservices → MongoDB/Blockchain
```

### 🎯 Các Services

#### 1. API Gateway

- **Port:** 3000
- **Nhiệm vụ:** Cổng vào duy nhất, định tuyến requests đến các microservices
- **Công nghệ:** Express.js/NestJS
- **Routes:** `/api/auth/*`, `/api/properties/*`, `/api/admin/*`, `/api/blockchain/*`

#### 2. Auth Service

- **Port:** 3001
- **Nhiệm vụ:** "Sign-in with Ethereum" - Xác thực chữ ký ví, tạo JWT token
- **Flow:**
  1. User connect wallet
  2. Generate message để user ký
  3. Verify signature
  4. Tạo session token (JWT)

#### 3. IPFS Service

- **Port:** 3002
- **Nhiệm vụ:** Upload files (images, documents, JSON) lên IPFS, trả về CID
- **Pinning:** Sử dụng Pinata
- **API:**
  - `POST /ipfs/upload` - Upload file
  - `POST /ipfs/metadata` - Upload metadata JSON
  - `GET /ipfs/:cid` - Get file by CID

#### 4. Admin Service (Property Management)

- **Port:** 3003
- **Nhiệm vụ:**
  - Quản lý CRUD bất động sản
  - Tạo metadata NFT
  - Gọi Blockchain Service để mint NFT
- **Database:** MongoDB - Collection `properties`
- **Tương tác:** IPFS Service + Blockchain Service

#### 5. Blockchain Service

- **Port:** 3004
- **Nhiệm vụ:**
  - Service DUY NHẤT tương tác blockchain
  - Quản lý private key của Admin
  - Gửi signed transactions
- **API:**
  - `POST /blockchain/mint` - Mint NFT
  - `POST /blockchain/list` - List NFT for sale
  - `POST /blockchain/buy` - Buy NFT
  - `GET /blockchain/nft/:tokenId` - Get NFT info

#### 6. Indexer Service (Worker)

- **Port:** N/A (Background worker)
- **Nhiệm vụ:**
  - Lắng nghe events từ Smart Contract 24/7
  - Events: `Transfer`, `ItemListed`, `ItemSold`, `ItemCanceled`
  - Cập nhật MongoDB real-time
- **Poll Interval:** 3 seconds
- **Database:** MongoDB - Collection `properties`

#### 7. Query Service (Read-Only)

- **Port:** 3005
- **Nhiệm vụ:**
  - API chỉ đọc cho Frontend
  - Queries phức tạp: search, filter, sort, pagination
  - Optimized for performance
- **Database:** MongoDB (Read Replicas nếu scale)
- **API:**
  - `GET /query/properties` - List with filters
  - `GET /query/properties/:id` - Get detail
  - `GET /query/stats` - Statistics
  - `GET /query/search` - Full-text search

---

## 🗂️ CẤU TRÚC DATABASE (MongoDB)

### Collection: `properties`

```javascript
{
  // ==================== SECTION 1: BASIC INFO ====================
  // Cache từ IPFS để query nhanh, không cần gọi IPFS mỗi lần
  propertyType: 'apartment' | 'land' | 'house' | 'villa',
  name: String,              // Cache từ IPFS metadata
  description: String,       // Cache từ IPFS metadata
  imageUrl: String,          // Primary image, cache từ IPFS

  // ==================== SECTION 2: BLOCKCHAIN/NFT INFO ====================
  // Được cập nhật bởi Blockchain Service và Indexer Service
  nft: {
    isMinted: Boolean,       // Đã mint NFT chưa?
    tokenId: Number,         // Token ID on-chain
    contractAddress: String, // Smart contract address
    owner: String,           // Current owner address (sync bởi Indexer)
    tokenURI: String,        // IPFS URI của metadata
    transactionHash: String, // Mint transaction hash
    ipfsHash: String,        // IPFS CID của metadata
    mintedAt: Date,          // Thời điểm mint
    mintedBy: String         // Admin address đã mint
  },

  // ==================== SECTION 3: MARKETPLACE INFO ====================
  // Được cập nhật bởi Indexer Service khi lắng nghe events
  marketplace: {
    isListed: Boolean,           // Đang listing không?
    price: Number,               // Giá listing hiện tại (Wei)
    seller: String,              // Địa chỉ seller
    listedAt: Date,              // Thời điểm list
    listingId: Number,           // ID listing on-chain
    lastSoldPrice: Number,       // Giá bán lần cuối
    lastSoldAt: Date,            // Thời điểm bán lần cuối
    salesHistory: [{             // Lịch sử giao dịch
      seller: String,
      buyer: String,
      price: Number,
      soldAt: Date,
      transactionHash: String
    }]
  },

  // ==================== SECTION 4: AUCTION INFO ====================
  // Optional - Nếu có tính năng đấu giá
  auctionInfo: {
    isAuction: Boolean,
    startingBid: Number,
    currentBid: Number,
    highestBidder: String,
    startTime: Date,
    endTime: Date,
    minBidIncrement: Number,
    bids: [{
      bidder: String,
      amount: Number,
      bidAt: Date
    }]
  },

  // ==================== SECTION 5: PROPERTY DETAILS ====================
  // Chi tiết bất động sản, được lưu vào IPFS attributes
  location: {
    address: String,
    ward: String,
    district: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  details: {
    // Apartment
    projectName: String,
    apartmentCode: String,
    block: String,
    floor: Number,
    bedrooms: Number,
    bathrooms: Number,
    netArea: String,
    grossArea: String,
    balconyDirection: String,
    interiorStatus: String,
    legalStatus: String,

    // Land
    landNumber: String,
    mapSheetNumber: String,
    frontWidth: Number,
    length: Number,
    landType: String,
    zoning: String,

    // House/Villa
    landArea: String,
    constructionArea: String,
    usableArea: String,
    structure: String,
    constructionYear: Number,
    houseDirection: String
  },

  // ==================== SECTION 6: MEDIA ====================
  media: {
    images: [{
      url: String,           // IPFS URL
      caption: String,
      isPrimary: Boolean
    }],
    documents: [{
      name: String,          // "Sổ hồng", "Giấy phép xây dựng"
      url: String,           // IPFS URL
      type: String           // "legal", "certificate"
    }],
    videos: [String],        // IPFS URLs
    virtualTour: String      // 360 tour URL
  },

  // ==================== SECTION 7: ANALYTICS ====================
  // Được cập nhật bởi Query Service
  analytics: {
    views: Number,           // Số lượt xem
    favorites: Number,       // Số lượt yêu thích
    shares: Number,          // Số lượt chia sẻ
    inquiries: Number,       // Số lượt hỏi
    lastViewedAt: Date       // Lần xem gần nhất
  },

  // ==================== SECTION 8: OWNER & AGENT ====================
  owner: {
    userId: String,          // User ID trong hệ thống
    walletAddress: String,   // Ethereum address
    name: String,
    email: String,
    phone: String
  },

  agent: {
    userId: String,
    name: String,
    phone: String,
    email: String,
    commission: Number       // % hoa hồng
  },

  // ==================== SECTION 9: STATUS & METADATA ====================
  status: String,            // 'draft' | 'published' | 'minted' |
                             // 'listed' | 'sold' | 'archived'

  isPublic: Boolean,         // Hiển thị công khai không?
  isFeatured: Boolean,       // Bất động sản nổi bật
  tags: [String],            // Tags để search
  category: String,          // 'residential' | 'commercial' | 'industrial'

  // ==================== SECTION 10: TIMESTAMPS ====================
  createdAt: Date,           // Thời điểm tạo
  updatedAt: Date,           // Thời điểm update cuối
  publishedAt: Date,         // Thời điểm publish
  archivedAt: Date           // Thời điểm archive
}
```

### Collection: `users`

```javascript
{
  walletAddress: String,     // Primary key, lowercase
  nonce: String,             // Để verify signature
  sessionToken: String,      // JWT token
  role: String,              // 'user' | 'admin' | 'agent'
  profile: {
    name: String,
    email: String,
    phone: String,
    avatar: String
  },
  favorites: [ObjectId],     // Array property IDs
  createdAt: Date,
  lastLoginAt: Date
}
```

### Collection: `transactions`

```javascript
{
  transactionHash: String,   // On-chain transaction hash
  type: String,              // 'mint' | 'list' | 'buy' | 'cancel'
  propertyId: ObjectId,
  tokenId: Number,
  from: String,              // Address
  to: String,                // Address
  price: Number,             // Wei
  blockNumber: Number,
  timestamp: Date,
  status: String,            // 'pending' | 'confirmed' | 'failed'
  gasUsed: Number,
  gasPrice: Number
}
```

---

## 🔄 FLOW HOẠT ĐỘNG

### 1. Authentication Flow (Sign-in with Ethereum)

```
Frontend → API Gateway → Auth Service
├─ 1. User click "Connect Wallet"
├─ 2. Frontend request nonce từ Auth Service
├─ 3. Auth Service generate random nonce, lưu vào DB
├─ 4. Frontend show message: "Sign this message to login: {nonce}"
├─ 5. User ký message bằng wallet (MetaMask)
├─ 6. Frontend gửi signature + walletAddress lên Auth Service
├─ 7. Auth Service verify signature
├─ 8. Nếu hợp lệ → Tạo JWT token, trả về Frontend
└─ 9. Frontend lưu token, gửi kèm mọi request tiếp theo
```

### 2. Admin Create Property + Mint NFT Flow

```
Admin Frontend → API Gateway → Admin Service → IPFS Service → Blockchain Service
├─ STEP 1: Admin tạo property
│   ├─ POST /api/admin/properties
│   ├─ Admin Service validate data
│   ├─ Lưu vào MongoDB với status='draft'
│   └─ Trả về propertyId
│
├─ STEP 2: Admin upload media
│   ├─ POST /api/admin/properties/:id/upload-images
│   ├─ Admin Service gọi IPFS Service
│   ├─ IPFS Service upload lên Pinata
│   ├─ Trả về IPFS CIDs
│   └─ Admin Service cập nhật media.images trong MongoDB
│
├─ STEP 3: Admin request mint NFT
│   ├─ POST /api/admin/properties/:id/mint
│   ├─ Admin Service build metadata JSON:
│   │   {
│   │     "name": "...",
│   │     "description": "...",
│   │     "image": "ipfs://...",
│   │     "attributes": [...],
│   │     "legal_documents": [...]
│   │   }
│   │
│   ├─ Admin Service gọi IPFS Service upload metadata
│   ├─ IPFS Service trả về metadataURI (ipfs://...)
│   │
│   ├─ Admin Service gọi Blockchain Service:
│   │   POST /blockchain/mint
│   │   {
│   │     "recipient": "0x...",
│   │     "tokenURI": "ipfs://..."
│   │   }
│   │
│   ├─ Blockchain Service:
│   │   ├─ Lấy private key của Admin wallet (từ .env)
│   │   ├─ Kết nối Ethereum node (Ganache/Infura)
│   │   ├─ Gọi contract.mint(recipient, tokenURI)
│   │   ├─ Ký transaction bằng Admin private key
│   │   ├─ Gửi transaction lên blockchain
│   │   ├─ Đợi confirmation
│   │   └─ Trả về: { tokenId, transactionHash, contractAddress }
│   │
│   └─ Admin Service cập nhật MongoDB:
│       ├─ nft.isMinted = true
│       ├─ nft.tokenId = tokenId
│       ├─ nft.transactionHash = transactionHash
│       ├─ status = 'minted'
│       └─ Trả về response cho Admin
```

### 3. Indexer Service - Real-time Event Sync

```
Indexer Service (Background Worker chạy 24/7)
├─ Poll blockchain mỗi 3 giây
├─ Lắng nghe Smart Contract Events:
│
├─ EVENT: Transfer(from, to, tokenId)
│   ├─ Query MongoDB tìm property có tokenId
│   ├─ Cập nhật nft.owner = to
│   ├─ Nếu from != 0x0 → Đây là transfer (không phải mint)
│   └─ Log: "Property #{tokenId} transferred to {to}"
│
├─ EVENT: ItemListed(tokenId, seller, price)
│   ├─ Query MongoDB tìm property có tokenId
│   ├─ Cập nhật:
│   │   ├─ marketplace.isListed = true
│   │   ├─ marketplace.price = price
│   │   ├─ marketplace.seller = seller
│   │   ├─ marketplace.listedAt = now
│   │   └─ status = 'listed'
│   └─ Log: "Property #{tokenId} listed for {price} Wei"
│
├─ EVENT: ItemSold(tokenId, seller, buyer, price)
│   ├─ Query MongoDB tìm property có tokenId
│   ├─ Cập nhật:
│   │   ├─ marketplace.isListed = false
│   │   ├─ marketplace.lastSoldPrice = price
│   │   ├─ marketplace.lastSoldAt = now
│   │   ├─ marketplace.salesHistory.push({seller, buyer, price, ...})
│   │   ├─ nft.owner = buyer (nếu chưa có Transfer event)
│   │   └─ status = 'sold'
│   └─ Log: "Property #{tokenId} sold to {buyer} for {price} Wei"
│
└─ EVENT: ItemCanceled(tokenId, seller)
    ├─ Query MongoDB tìm property có tokenId
    ├─ Cập nhật:
    │   ├─ marketplace.isListed = false
    │   └─ status = 'minted'
    └─ Log: "Listing #{tokenId} canceled by {seller}"
```

### 4. User Browse & Buy NFT Flow

```
User Frontend → API Gateway → Query Service → Blockchain Service
├─ STEP 1: User browse properties
│   ├─ GET /api/query/properties?status=listed&propertyType=apartment
│   ├─ Query Service query MongoDB (with filters, pagination)
│   ├─ Return danh sách properties (đã được sync bởi Indexer)
│   └─ Frontend display properties
│
├─ STEP 2: User xem chi tiết
│   ├─ GET /api/query/properties/:id
│   ├─ Query Service:
│   │   ├─ Get property từ MongoDB
│   │   ├─ Increment analytics.views
│   │   └─ Return property details
│   └─ Frontend display: images, price, owner, metadata...
│
├─ STEP 3: User click "Buy Now"
│   ├─ Frontend show MetaMask confirm dialog
│   ├─ User confirm transaction trong MetaMask
│   ├─ Frontend gửi:
│   │   POST /api/blockchain/buy
│   │   {
│   │     "tokenId": 1,
│   │     "buyer": "0x...",
│   │     "value": "1000000000000000000" (Wei)
│   │   }
│   │
│   ├─ Blockchain Service:
│   │   ├─ Gọi contract.buyItem(tokenId) với value=price
│   │   ├─ Transaction được gửi từ buyer's wallet
│   │   └─ Return transactionHash
│   │
│   ├─ Frontend show "Transaction pending..."
│   │
│   └─ Sau vài giây:
│       ├─ Indexer Service catch ItemSold event
│       ├─ Cập nhật MongoDB: owner mới, status='sold'
│       └─ Frontend refresh → Thấy owner đã đổi
```

### 5. Data Consistency & Caching

```
┌─────────────────────────────────────────────────────┐
│ IPFS (Source of Truth - Immutable)                  │
│ - name, description, image                          │
│ - attributes (bedrooms, location...)                │
│ - legal_documents                                   │
└─────────────────────────────────────────────────────┘
                    ↓ Cache vào MongoDB
┌─────────────────────────────────────────────────────┐
│ MongoDB (Cache + Mutable Data)                      │
│ Cache từ IPFS:                                      │
│   - name, imageUrl, attributes                      │
│   → Để Query Service query nhanh                    │
│                                                     │
│ Mutable Data (sync từ Blockchain):                 │
│   - nft.owner (sync bởi Indexer)                   │
│   - marketplace.price, isListed                     │
│   - salesHistory                                    │
│   - analytics (views, favorites...)                 │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│ Query Service (Read từ MongoDB)                     │
│ - Fast queries                                      │
│ - Không cần gọi IPFS mỗi lần                       │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ API ENDPOINTS CHÍNH

| Method   | Endpoint                     | Mô tả                                 |
| -------- | ---------------------------- | ------------------------------------- |
| `GET`    | `/health`                    | Kiểm tra service                      |
| `POST`   | `/properties`                | Tạo property mới                      |
| `GET`    | `/properties`                | Lấy danh sách (có filter, pagination) |
| `GET`    | `/properties/:id`            | Lấy chi tiết 1 property               |
| `PUT`    | `/properties/:id`            | Cập nhật property                     |
| `DELETE` | `/properties/:id`            | Xóa property (soft delete)            |
| `POST`   | `/properties/:id/mint`       | Mint property thành NFT               |
| `POST`   | `/properties/:id/view`       | Tăng view count                       |
| `POST`   | `/properties/:id/favorite`   | Tăng favorite count                   |
| `GET`    | `/properties/stats/overview` | Thống kê tổng quan                    |

---

## ⚠️ LƯU Ý QUAN TRỌNG

### ✅ DO:

1. **Chạy Ganache trước** → Minting Service → Property Service
2. **Dùng địa chỉ wallet từ Ganache** làm recipient
3. **Lưu property_id** sau khi tạo để mint
4. **Check logs** khi gặp lỗi

### ❌ DON'T:

1. **Không lưu price, owner, status lên IPFS** (dữ liệu thay đổi)
2. **Không update NFT info trực tiếp** (chỉ qua minting)
3. **Không hardcode recipient address** (lấy từ Ganache)

---

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

### Lỗi: "Cannot connect to MongoDB"

→ Check MongoDB Atlas connection string trong `.env`

### Lỗi: "Minting service not available"

→ Chạy minting-service trước: `cd minting-service && npm start`

### Lỗi: "Insufficient funds"

→ Dùng địa chỉ wallet có ETH trong Ganache

### Lỗi: "Property not found"

→ Check property_id có đúng không

### Owner không tự động sync

→ Check event listener đang chạy trong minting-service

---

## 📝 CHECKLIST TEST HOÀN CHỈNH

- [ ] Ganache đang chạy (port 8545)
- [ ] Minting Service đang chạy (port 3002)
- [ ] Property Service đang chạy (port 3003)
- [ ] Test GET /health → 200 OK
- [ ] Test POST /properties → Tạo thành công
- [ ] Test POST /properties/:id/mint → Mint thành công
- [ ] Test GET /properties/:id → Thấy tokenId
- [ ] Test PUT /properties/:id → Update thành công
- [ ] Test GET /properties/stats/overview → Có data

---

**✅ XONG! Bây giờ bạn có thể test API mà không cần setup environment variables phức tạp!**
