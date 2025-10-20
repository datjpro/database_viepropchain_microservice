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

## 🗂️ CẤU TRÚC DATABASE

```javascript
{
  // Basic Info (cache từ IPFS)
  propertyType: 'apartment' | 'land' | 'house' | 'villa',
  name: String,
  description: String,

  // Blockchain/NFT Info
  nft: {
    isMinted: Boolean,
    tokenId: Number,
    contractAddress: String,
    owner: String,  // Tự động sync từ blockchain events
    tokenURI: String,
    transactionHash: String,
    ipfsHash: String,
    mintedAt: Date
  },

  // Price & Trading Info
  price: { amount: Number, currency: String },
  listingPrice: {
    amount: Number,
    currency: String,
    updatedAt: Date
  },
  status: 'draft' | 'published' | 'minted' | 'for_sale' | 'sold',

  // Auction Info (optional)
  auctionInfo: {
    isAuction: Boolean,
    startingBid: Number,
    currentBid: Number,
    highestBidder: String,
    startTime: Date,
    endTime: Date,
    minBidIncrement: Number
  },

  // Location
  location: {
    address: String,
    ward: String,
    district: String,
    city: String,
    coordinates: { latitude: Number, longitude: Number }
  },

  // Property Details
  details: {
    // Apartment
    projectName: String,
    apartmentCode: String,
    block: String,
    floor: Number,
    bedrooms: Number,
    bathrooms: Number,
    netArea: String,
    balconyDirection: String,
    legalStatus: String,

    // Land
    landNumber: String,
    frontWidth: Number,
    length: Number,
    landType: String,

    // House/Villa
    landArea: String,
    constructionArea: String,
    structure: String
  },

  // Media
  media: {
    images: [{ url: String, caption: String, isPrimary: Boolean }],
    documents: [{ name: String, url: String, type: String }],
    virtualTour: String
  },

  // Analytics
  analytics: {
    views: Number,
    favorites: Number,
    shares: Number,
    inquiries: Number
  },

  // Owner
  owner: {
    userId: String,
    walletAddress: String,
    name: String,
    email: String
  },

  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔄 FLOW HOẠT ĐỘNG

### 1. Tạo Property + Mint NFT

```
1. POST /properties → Tạo property trong MongoDB
2. POST /properties/:id/mint → Gọi minting-service
   ├─ Upload metadata lên IPFS (Pinata)
   ├─ Gọi smart contract mint NFT
   ├─ Trả về tokenId, transactionHash
   └─ Cập nhật thông tin NFT vào MongoDB
3. Event Listener → Tự động sync owner khi Transfer
```

### 2. Đồng bộ Owner từ Blockchain

```
Event Listener (minting-service) poll mỗi 3 giây:
├─ Lắng nghe Transfer events
├─ Cập nhật owner trong MongoDB
└─ Property Service query được owner mới nhất
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
