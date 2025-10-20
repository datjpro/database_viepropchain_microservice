# 🚀 HƯỚNG DẪN TEST VỚI POSTMAN

## 📋 MỤC LỤC

1. [Chuẩn bị](#chuẩn-bị)
2. [Import Collection](#import-collection)
3. [Cấu hình Environment](#cấu-hình-environment)
4. [Test từng bước](#test-từng-bước)
5. [Troubleshooting](#troubleshooting)

---

## 🔧 CHUẨN BỊ

### 1. Khởi động các services

#### Bước 1: Chạy Ganache

```bash
# Terminal 1
cd d:\DACN\RE-Chain\viepropchain
ganache -m "arm either chef prosper fish lonely rigid antique dawn stumble wife camera" --database.dbPath "./ganache-data-dev" --chain.networkId 1337 --server.port 8545 --server.host 0.0.0.0
```

#### Bước 2: Chạy Minting Service

```bash
# Terminal 2
cd d:\DACN\RE-Chain\database_viepropchain_microservice\minting-service
npm start
```

**Expected output:**

```
✅ Connected to MongoDB
✅ Blockchain service initialized successfully
🎧 Bắt đầu lắng nghe sự kiện Transfer từ blockchain...
✅ Minting Service API đang chạy tại http://localhost:3002
```

#### Bước 3: Chạy Property Service

```bash
# Terminal 3
cd d:\DACN\RE-Chain\database_viepropchain_microservice\property-service
npm start
```

**Expected output:**

```
✅ Connected to MongoDB (Property Service)
==================================================
🏢 PROPERTY SERVICE
==================================================
✅ Server running on port 3003
```

### 2. Kiểm tra services đang chạy

**Test Minting Service:**

```bash
curl http://localhost:3002/nfts
```

**Test Property Service:**

```bash
curl http://localhost:3003/health
```

---

## 📥 IMPORT COLLECTION

### Cách 1: Import file có sẵn

1. Mở Postman
2. Click **Import** ở góc trên bên trái
3. Chọn file: `ViePropChain_Property_Service.postman_collection.json`
4. Click **Import**

### Cách 2: Import từ link (nếu có)

1. Mở Postman
2. Click **Import** > **Link**
3. Paste link và import

---

## ⚙️ CẤU HÌNH ENVIRONMENT

### Tạo Environment mới

1. Click biểu tượng **Environments** (icon hình mắt ở góc phải)
2. Click **Create Environment**
3. Đặt tên: **ViePropChain Local**

### Thêm các Variables:

| Variable      | Type    | Initial Value           | Current Value           |
| ------------- | ------- | ----------------------- | ----------------------- |
| `base_url`    | default | `http://localhost:3003` | `http://localhost:3003` |
| `minting_url` | default | `http://localhost:3002` | `http://localhost:3002` |
| `recipient`   | default | `0x123456...`           | (Địa chỉ ví của bạn)    |
| `property_id` | default |                         | (Sẽ tự động set)        |
| `token_id`    | default |                         | (Sẽ tự động set)        |

### Lấy địa chỉ ví (recipient):

**Từ Ganache:**

1. Mở Ganache UI hoặc check terminal
2. Copy địa chỉ ví đầu tiên (Account 0)
3. VD: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4`
4. Paste vào variable `recipient`

---

## 🧪 TEST TỪNG BƯỚC

### TEST 1: Health Check ✅

**Mục đích:** Kiểm tra service đang chạy

**Request:**

```
GET {{base_url}}/health
```

**Expected Response:**

```json
{
  "success": true,
  "service": "Property Service",
  "status": "running",
  "database": "connected",
  "mintingService": "available",
  "timestamp": "2025-10-20T..."
}
```

**✅ Pass nếu:**

- Status code: `200`
- `database`: "connected"
- `mintingService`: "available"

---

### TEST 2: Tạo Property Mới (Không mint) ✅

**Mục đích:** Tạo property trong MongoDB (chưa mint NFT)

**Request:**

```
POST {{base_url}}/properties
Content-Type: application/json
```

**Body (Villa example):**

```json
{
  "propertyType": "villa",
  "name": "Villa Sài Gòn - Quận 2",
  "description": "Biệt thự cao cấp 3 tầng, view sông Sài Gòn, full nội thất",
  "price": {
    "amount": 15000000000,
    "currency": "VND"
  },
  "location": {
    "address": "123 Đường Trần Não",
    "ward": "Phường Bình An",
    "district": "Quận 2",
    "city": "Thành phố Hồ Chí Minh",
    "coordinates": {
      "latitude": 10.7869,
      "longitude": 106.7412
    }
  },
  "details": {
    "area": {
      "value": 300,
      "unit": "m2"
    },
    "landArea": "300m2",
    "constructionArea": "250m2",
    "usableArea": "280m2",
    "bedrooms": 5,
    "bathrooms": 4,
    "houseDirection": "Đông Nam",
    "structure": "3 tầng + 1 tầng áp mái",
    "constructionYear": 2020,
    "legalStatus": "Sổ đỏ chính chủ"
  },
  "media": {
    "images": [
      {
        "url": "https://example.com/villa1.jpg",
        "caption": "Mặt tiền",
        "isPrimary": true
      }
    ]
  },
  "status": "published"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Property created successfully",
  "data": {
    "_id": "65abc123...",
    "propertyType": "villa",
    "name": "Villa Sài Gòn - Quận 2",
    "status": "published",
    ...
  }
}
```

**Actions sau khi test:**

1. Copy `_id` từ response
2. Set vào Environment variable `property_id`

**✅ Pass nếu:**

- Status code: `201`
- `success`: true
- Response có `_id`

---

### TEST 3: Get All Properties ✅

**Mục đích:** Lấy danh sách properties

**Request:**

```
GET {{base_url}}/properties
```

**Expected Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "65abc123...",
      "name": "Villa Sài Gòn - Quận 2",
      "propertyType": "villa",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

**✅ Pass nếu:**

- Status code: `200`
- `data` là array
- Có property vừa tạo

---

### TEST 4: Get Property By ID ✅

**Mục đích:** Lấy chi tiết 1 property

**Request:**

```
GET {{base_url}}/properties/{{property_id}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "_id": "65abc123...",
    "name": "Villa Sài Gòn - Quận 2",
    "propertyType": "villa",
    "details": { ... },
    "location": { ... },
    "nft": {
      "isMinted": false
    }
  }
}
```

**✅ Pass nếu:**

- Status code: `200`
- `data._id` khớp với `property_id`
- `nft.isMinted`: false

---

### TEST 5: Create AND Mint (All-in-One) 🔥

**Mục đích:** Tạo property và mint NFT trong 1 request

**Request:**

```
POST {{base_url}}/properties/create-and-mint
Content-Type: application/json
```

**Body:**

```json
{
  "recipient": "{{recipient}}",
  "propertyType": "apartment",
  "name": "Căn hộ Vinhomes Central Park",
  "description": "Căn hộ 2 phòng ngủ, view Landmark 81",
  "price": {
    "amount": 5000000000,
    "currency": "VND"
  },
  "location": {
    "address": "208 Nguyễn Hữu Cảnh",
    "ward": "Phường 22",
    "district": "Quận Bình Thạnh",
    "city": "Thành phố Hồ Chí Minh"
  },
  "details": {
    "projectName": "Vinhomes Central Park",
    "apartmentCode": "L3-1203",
    "block": "Landmark 3",
    "floor": 12,
    "grossArea": "75m2",
    "netArea": "68m2",
    "bedrooms": 2,
    "bathrooms": 2,
    "balconyDirection": "Đông Nam",
    "interiorStatus": "Full nội thất cao cấp",
    "legalStatus": "Sổ hồng lâu dài"
  },
  "media": {
    "images": [
      {
        "url": "https://example.com/apartment1.jpg",
        "caption": "Phòng khách",
        "isPrimary": true
      }
    ]
  }
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Property created and minted as NFT successfully",
  "data": {
    "property": {
      "_id": "65abc456...",
      "name": "Căn hộ Vinhomes Central Park",
      "status": "minted",
      "nft": {
        "isMinted": true,
        "tokenId": 1,
        "owner": "0x123456...",
        "tokenURI": "ipfs://QmXXX..."
      }
    },
    "nft": {
      "tokenId": 1,
      "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
      "owner": "0x123456...",
      "transactionHash": "0xabc...",
      "tokenURI": "ipfs://QmXXX...",
      "ipfsHash": "QmXXX..."
    }
  }
}
```

**Actions sau khi test:**

1. Copy `tokenId` từ response
2. Set vào Environment variable `token_id`
3. Copy `property._id`
4. Set vào Environment variable `property_id` (nếu muốn test property này)

**✅ Pass nếu:**

- Status code: `201`
- `success`: true
- `property.nft.isMinted`: true
- Có `tokenId` và `transactionHash`

**⏱️ Lưu ý:** Request này mất ~10-30 giây vì phải:

1. Upload metadata lên IPFS
2. Mint NFT trên blockchain
3. Chờ transaction confirm

---

### TEST 6: Mint Property Đã Tạo ✅

**Mục đích:** Mint NFT cho property đã có (từ TEST 2)

**Request:**

```
POST {{base_url}}/properties/{{property_id}}/mint
Content-Type: application/json
```

**Body:**

```json
{
  "recipient": "{{recipient}}"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Property minted as NFT successfully",
  "data": {
    "propertyId": "65abc123...",
    "tokenId": 2,
    "contractAddress": "0x52B42...",
    "owner": "0x123456...",
    "transactionHash": "0xdef...",
    "tokenURI": "ipfs://QmYYY...",
    "ipfsHash": "QmYYY..."
  }
}
```

**✅ Pass nếu:**

- Status code: `200`
- `success`: true
- `tokenId` được tạo mới
- Có `transactionHash`

---

### TEST 7: Get NFT Info từ Minting Service ✅

**Mục đích:** Verify NFT đã được lưu trong minting-service

**Request:**

```
GET {{minting_url}}/nft/{{token_id}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "tokenId": "1",
    "contractAddress": "0x52B42...",
    "owner": "0x123456...",
    "tokenURI": "ipfs://QmXXX...",
    "transactionHash": "0xabc...",
    "metadata": {
      "name": "Căn hộ Vinhomes Central Park",
      "description": "...",
      "image": "...",
      "attributes": [...]
    }
  }
}
```

**✅ Pass nếu:**

- Status code: `200`
- `tokenId` khớp với token vừa mint
- `owner` khớp với `recipient`

---

### TEST 8: Update Property ✅

**Mục đích:** Cập nhật thông tin property

**Request:**

```
PUT {{base_url}}/properties/{{property_id}}
Content-Type: application/json
```

**Body:**

```json
{
  "description": "Biệt thự cao cấp 3 tầng - ĐÃ CẬP NHẬT",
  "price": {
    "amount": 16000000000,
    "currency": "VND"
  },
  "isFeatured": true
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Property updated successfully",
  "data": {
    "_id": "65abc123...",
    "description": "Biệt thự cao cấp 3 tầng - ĐÃ CẬP NHẬT",
    "price": {
      "amount": 16000000000
    },
    "isFeatured": true,
    "updatedAt": "2025-10-20T..."
  }
}
```

**✅ Pass nếu:**

- Status code: `200`
- Fields được update đúng
- `updatedAt` thay đổi

---

### TEST 9: Query với Filters ✅

**Mục đích:** Test query/filter properties

**Request 1 - Filter by property type:**

```
GET {{base_url}}/properties?propertyType=villa
```

**Request 2 - Filter by status:**

```
GET {{base_url}}/properties?status=minted
```

**Request 3 - Filter by price range:**

```
GET {{base_url}}/properties?minPrice=5000000000&maxPrice=20000000000
```

**Request 4 - Search by text:**

```
GET {{base_url}}/properties?search=Vinhomes
```

**Request 5 - Sort by price:**

```
GET {{base_url}}/properties?sortBy=price.amount&sortOrder=desc
```

**✅ Pass nếu:**

- Status code: `200`
- Results match filters
- Pagination info correct

---

### TEST 10: Increment Analytics ✅

**Mục đích:** Test analytics (views, favorites)

**Request 1 - Increment Views:**

```
GET {{base_url}}/properties/{{property_id}}?incrementView=true
```

**Request 2 - Increment Favorites:**

```
POST {{base_url}}/properties/{{property_id}}/favorite
```

**Request 3 - Increment Shares:**

```
POST {{base_url}}/properties/{{property_id}}/share
```

**Verify:**

```
GET {{base_url}}/properties/{{property_id}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "analytics": {
      "views": 1,
      "favorites": 1,
      "shares": 1
    }
  }
}
```

**✅ Pass nếu:**

- Views, favorites, shares tăng lên

---

### TEST 11: Get Statistics ✅

**Mục đích:** Lấy thống kê tổng quan

**Request:**

```
GET {{base_url}}/properties/stats/overview
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "totalProperties": 2,
    "totalMinted": 2,
    "totalForSale": 0,
    "totalSold": 0,
    "totalViews": 1,
    "byType": [
      { "_id": "villa", "count": 1 },
      { "_id": "apartment", "count": 1 }
    ],
    "byStatus": [{ "_id": "minted", "count": 2 }]
  }
}
```

**✅ Pass nếu:**

- Status code: `200`
- Numbers match your data

---

### TEST 12: Delete Property (Soft Delete) ✅

**Mục đích:** Archive property (không xóa hẳn)

**Request:**

```
DELETE {{base_url}}/properties/{{property_id}}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Property archived",
  "data": {
    "_id": "65abc123...",
    "status": "archived"
  }
}
```

**Verify:**

```
GET {{base_url}}/properties/{{property_id}}
```

**✅ Pass nếu:**

- Status code: `200`
- `status`: "archived"

---

## 📊 TEST SCENARIOS (End-to-End)

### Scenario 1: Full Property Lifecycle

```
1. Create property (TEST 2)
   → Status: published

2. Mint NFT (TEST 6)
   → Status: minted
   → Has tokenId

3. User views property
   → Analytics.views++

4. User favorites property
   → Analytics.favorites++

5. Archive property
   → Status: archived
```

### Scenario 2: Quick Mint Flow

```
1. Create and Mint (TEST 5)
   → One request
   → Property created + NFT minted

2. Verify in Minting Service (TEST 7)
   → NFT exists
   → Owner correct

3. Get property details (TEST 4)
   → nft.isMinted: true
```

---

## 🐛 TROUBLESHOOTING

### Lỗi 1: "Failed to mint NFT"

**Nguyên nhân:**

- Minting service không chạy
- Ganache không chạy
- Contract address sai

**Giải pháp:**

```bash
# Check minting service
curl http://localhost:3002/nfts

# Check Ganache
curl http://localhost:8545

# Restart services
```

---

### Lỗi 2: "MongoDB connection error"

**Nguyên nhân:**

- MongoDB không chạy
- Connection string sai

**Giải pháp:**

```bash
# Check MongoDB
# Kiểm tra .env file
cat .env | grep MONGO

# Test connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK'))"
```

---

### Lỗi 3: "IPFS upload failed"

**Nguyên nhân:**

- Pinata JWT không hợp lệ
- Internet connection

**Giải pháp:**

- Kiểm tra `.env` → `PINATA_JWT`
- Service vẫn chạy với mock IPFS hash (development mode)

---

### Lỗi 4: "Property not found"

**Nguyên nhân:**

- `property_id` sai
- Property đã bị xóa

**Giải pháp:**

```bash
# Get all properties
GET {{base_url}}/properties

# Copy đúng _id
```

---

## 📝 POSTMAN SCRIPTS (Advanced)

### Pre-request Script - Auto set recipient

```javascript
// Get recipient from environment
const recipient = pm.environment.get("recipient");

// If not set, use default from Ganache
if (!recipient) {
  pm.environment.set("recipient", "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4");
}
```

### Test Script - Auto save property_id

```javascript
// Save property_id to environment
const response = pm.response.json();

if (response.success && response.data._id) {
  pm.environment.set("property_id", response.data._id);
  console.log("Property ID saved:", response.data._id);
}

// Save token_id
if (response.data.nft && response.data.nft.tokenId) {
  pm.environment.set("token_id", response.data.nft.tokenId);
  console.log("Token ID saved:", response.data.nft.tokenId);
}

// Tests
pm.test("Status code is 200 or 201", function () {
  pm.expect(pm.response.code).to.be.oneOf([200, 201]);
});

pm.test("Response has success field", function () {
  pm.expect(response).to.have.property("success");
  pm.expect(response.success).to.be.true;
});
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Basic Tests:

- [ ] Health Check (TEST 1)
- [ ] Create Property (TEST 2)
- [ ] Get All Properties (TEST 3)
- [ ] Get Property By ID (TEST 4)

### Minting Tests:

- [ ] Create and Mint (TEST 5)
- [ ] Mint Existing Property (TEST 6)
- [ ] Verify NFT (TEST 7)

### Update Tests:

- [ ] Update Property (TEST 8)
- [ ] Query with Filters (TEST 9)

### Analytics Tests:

- [ ] Increment Views/Favorites (TEST 10)
- [ ] Get Statistics (TEST 11)

### Delete Tests:

- [ ] Soft Delete (TEST 12)

---

## 🎉 DONE!

Bạn đã hoàn thành testing với Postman!

**Next Steps:**

1. Save collection
2. Export environment
3. Share với team

**Tips:**

- Sử dụng Postman Environments cho dev/staging/production
- Save requests vào folders
- Add descriptions cho mỗi request
- Use variables (`{{variable}}`) thay vì hardcode values
