# 🧪 Hướng dẫn Test Property Service với Postman - TỪ ĐẦU ĐẾN CUỐI

## 📚 Mục Lục

1. [Giải thích Property Service](#giải-thích)
2. [Chuẩn bị môi trường](#chuẩn-bị)
3. [Import Postman Collection](#import-postman)
4. [Test Flow hoàn chỉnh](#test-flow)
5. [Giải thích kết quả](#giải-thích-kết-quả)

---

## 🎯 1. GIẢI THÍCH PROPERTY SERVICE

### Property Service làm gì?

**Property Service** là service TRUNG TÂM để quản lý bất động sản trong hệ thống ViePropChain.

#### So sánh với Minting Service:

| Tính năng     | Minting Service             | Property Service              |
| ------------- | --------------------------- | ----------------------------- |
| **Nhiệm vụ**  | Chỉ mint NFT lên blockchain | Quản lý TOÀN BỘ vòng đời BĐS  |
| **Lưu trữ**   | Lưu minimal vào MongoDB     | Lưu ĐẦY ĐỦ thông tin BĐS      |
| **Tìm kiếm**  | ❌ Không hỗ trợ             | ✅ Filter, search, pagination |
| **Analytics** | ❌ Không có                 | ✅ Views, favorites, shares   |
| **Quản lý**   | ❌ Không quản lý BĐS        | ✅ CRUD complete              |
| **Vai trò**   | Worker (thực thi)           | Manager (điều phối)           |

### Quy trình hoạt động

```
┌─────────────────────────────────────────────────────────────┐
│ FLOW 1: TẠO BẤT ĐỘNG SẢN                                    │
└─────────────────────────────────────────────────────────────┘

Admin nhập form → POST /properties → Property Service
                                           ↓
                                      Lưu MongoDB
                                           ↓
                        Trả về: { _id, status: "published", ... }

┌─────────────────────────────────────────────────────────────┐
│ FLOW 2: MINT NFT TỪ BẤT ĐỘNG SẢN                            │
└─────────────────────────────────────────────────────────────┘

Admin click Mint → POST /properties/:id/mint → Property Service
                                                      ↓
                                          1. Lấy thông tin BĐS
                                                      ↓
                                          2. Build metadata
                                                      ↓
                                          3. POST /mint → Minting Service
                                                      ↓
                                          4. Nhận kết quả (tokenId, txHash...)
                                                      ↓
                                          5. Update BĐS với NFT info
                                                      ↓
                        Trả về: { tokenId, transactionHash, ipfsHash, ... }

┌─────────────────────────────────────────────────────────────┐
│ FLOW 3: XEM DANH SÁCH BẤT ĐỘNG SẢN                          │
└─────────────────────────────────────────────────────────────┘

User vào trang → GET /properties?page=1 → Property Service
                                                ↓
                                        Query MongoDB
                                                ↓
                    Trả về: { data: [...], pagination: {...} }
```

---

## ⚙️ 2. CHUẨN BỊ MÔI TRƯỜNG

### Bước 1: Khởi động các service cần thiết

#### Terminal 1: Ganache (Blockchain)

```bash
cd d:\DACN\RE-Chain\viepropchain
ganache -m "arm either chef prosper fish lonely rigid antique dawn stumble wife camera" --database.dbPath "./ganache-data-dev" --chain.networkId 1337 --server.port 8545
```

**Kết quả mong đợi:**

```
Ganache CLI v6.12.2
Available Accounts
==================
(0) 0xC6890b26A32d9d92aefbc8635C4588247529CdfE (100 ETH)
...

Listening on 127.0.0.1:8545
```

#### Terminal 2: Minting Service

```bash
cd d:\DACN\RE-Chain\database_viepropchain_microservice\minting-service
node index.js
```

**Kết quả mong đợi:**

```
==================================================
🎨 NFT MINTING SERVICE
==================================================
✅ Server running on port 3002
✅ Connected to MongoDB
✅ Connected to Ganache
✅ NFT Contract loaded
✅ Event Listener started
```

#### Terminal 3: Property Service

```bash
cd d:\DACN\RE-Chain\database_viepropchain_microservice\property-service
npm install
node index.js
```

**Kết quả mong đợi:**

```
==================================================
🏢 PROPERTY SERVICE
==================================================
✅ Server running on port 3003
🌐 Environment: development
📍 API: http://localhost:3003
==================================================
✅ Connected to MongoDB (Property Service)
```

### Bước 2: Kiểm tra các service đang chạy

- ✅ Ganache: http://127.0.0.1:8545
- ✅ Minting Service: http://localhost:3002
- ✅ Property Service: http://localhost:3003

---

## 📥 3. IMPORT POSTMAN COLLECTION

### Cách 1: Import từ file

1. Mở Postman
2. Click **Import** (góc trên bên trái)
3. Chọn **File** tab
4. Chọn file: `ViePropChain_Property_Service.postman_collection.json`
5. Click **Import**

### Cách 2: Import từ Raw JSON

1. Mở Postman
2. Click **Import**
3. Chọn **Raw text** tab
4. Copy toàn bộ nội dung file JSON vào
5. Click **Continue** → **Import**

### Sau khi import

Bạn sẽ thấy collection **"ViePropChain - Property Service"** với 8 folders:

1. ✅ Health Check
2. 📝 Create Properties
3. 📋 Get Properties
4. ✏️ Update Property
5. 🎨 Mint NFT
6. 📊 Statistics
7. 📈 Analytics
8. 🗑️ Delete Property

---

## 🧪 4. TEST FLOW HOÀN CHỈNH

### SCENARIO A: Test cơ bản (5 phút)

#### Step 1: Health Check

```
Request: GET http://localhost:3003/health
```

**Click Send** → Xem response:

```json
{
  "success": true,
  "service": "Property Service",
  "status": "running",
  "database": "connected",
  "mintingService": "available", // ← QUAN TRỌNG: Phải là "available"
  "timestamp": "2025-10-17T..."
}
```

✅ **Nếu thấy `mintingService: "available"` → OK!**  
❌ **Nếu thấy `mintingService: "unavailable"` → Kiểm tra Minting Service có chạy không**

---

#### Step 2: Tạo Căn hộ đầu tiên

**Folder:** `2. Create Properties` → **"Create Apartment (Căn hộ)"**

**Click Send** → Xem response:

```json
{
  "success": true,
  "message": "Property created successfully",
  "data": {
    "_id": "671234567890abcdef123456",  // ← Copy ID này!
    "propertyType": "apartment",
    "name": "Căn hộ Vinhomes Central Park",
    "price": {
      "amount": 5000000000,
      "currency": "VND"
    },
    "location": {
      "address": "208 Nguyễn Hữu Cảnh, P.22, Q.Bình Thạnh",
      "city": "TP. Hồ Chí Minh"
    },
    "details": {
      "projectName": "Vinhomes Central Park",
      "bedrooms": 2,
      "bathrooms": 2,
      ...
    },
    "nft": {
      "isMinted": false  // ← Chưa mint NFT
    },
    "status": "published",
    "analytics": {
      "views": 0,
      "favorites": 0,
      "shares": 0
    },
    "createdAt": "2025-10-17T...",
    "updatedAt": "2025-10-17T..."
  }
}
```

**✅ LƯU Ý:** Copy `_id` value (ví dụ: `671234567890abcdef123456`)

---

#### Step 3: Set biến propertyId trong Postman

1. Click vào tab **Variables** ở cuối collection
2. Tìm dòng `propertyId`
3. Paste ID vừa copy vào cột **Current Value**
4. Click **Save**

**Hoặc** bạn có thể thay `{{propertyId}}` trong URL bằng ID thực tế.

---

#### Step 4: Xem chi tiết Property vừa tạo

**Folder:** `3. Get Properties` → **"Get Property by ID"**

**Click Send** → Xem response:

```json
{
  "success": true,
  "data": {
    "_id": "671234567890abcdef123456",
    "name": "Căn hộ Vinhomes Central Park",
    "nft": {
      "isMinted": false  // ← Vẫn chưa mint
    },
    "analytics": {
      "views": 0  // ← Chưa có view
    },
    ...
  }
}
```

---

#### Step 5: Xem chi tiết VÀ tăng view count

**Folder:** `3. Get Properties` → **"Get Property with View Count"**

**Click Send 3 lần** → Lần thứ 3 sẽ thấy:

```json
{
  "success": true,
  "data": {
    ...
    "analytics": {
      "views": 3,  // ← Đã tăng lên 3!
      "favorites": 0,
      "shares": 0
    }
  }
}
```

---

#### Step 6: Mint NFT từ Property

**⚠️ QUAN TRỌNG:** Minting Service PHẢI chạy trên port 3002!

**Folder:** `5. Mint NFT` → **"Mint Property to NFT"**

**Click Send** → Chờ khoảng 5-10 giây → Xem response:

```json
{
  "success": true,
  "message": "Property minted as NFT successfully",
  "data": {
    "propertyId": "671234567890abcdef123456",
    "tokenId": 1, // ← NFT Token ID
    "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
    "owner": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
    "transactionHash": "0x...", // ← Transaction hash trên blockchain
    "tokenURI": "https://gateway.pinata.cloud/ipfs/Qm...", // ← Metadata trên IPFS
    "ipfsHash": "Qm..." // ← IPFS hash
  }
}
```

**✅ Thành công!** BĐS đã được mint thành NFT!

---

#### Step 7: Kiểm tra Property sau khi mint

**Folder:** `3. Get Properties` → **"Get Property by ID"**

**Click Send** → Xem response:

```json
{
  "success": true,
  "data": {
    "_id": "671234567890abcdef123456",
    "name": "Căn hộ Vinhomes Central Park",
    "nft": {
      "isMinted": true,  // ← ĐÃ MINT!
      "tokenId": 1,
      "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
      "owner": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
      "tokenURI": "https://gateway.pinata.cloud/ipfs/Qm...",
      "transactionHash": "0x...",
      "ipfsHash": "Qm...",
      "mintedAt": "2025-10-17T..."
    },
    "status": "minted",  // ← Status đã chuyển thành "minted"
    ...
  }
}
```

---

### SCENARIO B: Test đầy đủ (15 phút)

#### Step 1-7: Giống Scenario A

#### Step 8: Tạo thêm 2 BĐS khác

**Tạo Đất nền:**

- Folder: `2. Create Properties` → **"Create Land (Đất nền)"**
- Click Send

**Tạo Nhà phố:**

- Folder: `2. Create Properties` → **"Create House (Nhà phố)"**
- Click Send

#### Step 9: Xem tất cả Properties

**Folder:** `3. Get Properties` → **"Get All Properties"**

**Click Send** → Xem response:

```json
{
  "success": true,
  "data": [
    {
      /* Căn hộ */
    },
    {
      /* Đất nền */
    },
    {
      /* Nhà phố */
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 3, // ← Tổng 3 BĐS
    "pages": 1
  }
}
```

#### Step 10: Filter theo loại

**Chỉ lấy Căn hộ:**

- Folder: `3. Get Properties` → **"Filter by Property Type"**
- Click Send

```json
{
  "success": true,
  "data": [
    { "propertyType": "apartment", ... }
  ],
  "pagination": { "total": 1 }
}
```

#### Step 11: Filter theo giá

**Folder:** `3. Get Properties` → **"Filter by Price Range"**

URL: `http://localhost:3003/properties?minPrice=3000000000&maxPrice=7000000000`

**Click Send** → Chỉ trả về BĐS có giá từ 3-7 tỷ

#### Step 12: Tìm kiếm

**Folder:** `3. Get Properties` → **"Search Properties"**

URL: `http://localhost:3003/properties?search=Vinhomes`

**Click Send** → Chỉ trả về BĐS có từ "Vinhomes"

#### Step 13: Cập nhật giá

**Folder:** `4. Update Property` → **"Update Property Info"**

Body:

```json
{
  "price": {
    "amount": 5500000000
  },
  "status": "for_sale"
}
```

**Click Send** → BĐS được cập nhật giá mới và status

#### Step 14: Tăng Favorite

**Folder:** `7. Analytics` → **"Increment Favorite"**

**Click Send 5 lần** → Lần thứ 5:

```json
{
  "success": true,
  "message": "Favorite count incremented",
  "favorites": 5
}
```

#### Step 15: Xem Thống kê

**Folder:** `6. Statistics` → **"Get Overview Statistics"**

**Click Send:**

```json
{
  "success": true,
  "data": {
    "totalProperties": 3,
    "totalMinted": 1, // ← 1 BĐS đã mint
    "totalForSale": 1, // ← 1 BĐS đang bán
    "totalSold": 0,
    "totalViews": 3, // ← Tổng views
    "byType": [
      { "_id": "apartment", "count": 1 },
      { "_id": "land", "count": 1 },
      { "_id": "house", "count": 1 }
    ],
    "byStatus": [
      { "_id": "published", "count": 2 },
      { "_id": "minted", "count": 1 }
    ]
  }
}
```

#### Step 16: Archive Property

**Folder:** `8. Delete Property` → **"Archive Property (Soft Delete)"**

**Click Send:**

```json
{
  "success": true,
  "message": "Property archived",
  "data": {
    "status": "archived" // ← Đã archive
  }
}
```

---

## 📊 5. GIẢI THÍCH KẾT QUẢ

### Response cơ bản

```json
{
  "success": true,           // ← API thành công
  "message": "...",          // ← Thông báo
  "data": { ... }           // ← Dữ liệu trả về
}
```

### Property Object

```json
{
  "_id": "...",                    // MongoDB ID
  "propertyType": "apartment",     // Loại BĐS
  "name": "Căn hộ ...",           // Tên BĐS
  "description": "...",            // Mô tả
  "price": {
    "amount": 5000000000,          // Giá (VND)
    "currency": "VND"
  },
  "location": {
    "address": "...",              // Địa chỉ
    "city": "...",
    "district": "..."
  },
  "details": {                     // Chi tiết theo loại
    "bedrooms": 2,
    "bathrooms": 2,
    ...
  },
  "nft": {
    "isMinted": false,             // Đã mint chưa?
    "tokenId": null,               // Token ID (nếu đã mint)
    "transactionHash": null,       // TX hash (nếu đã mint)
    ...
  },
  "status": "published",           // Trạng thái
  "analytics": {
    "views": 0,                    // Lượt xem
    "favorites": 0,                // Lượt yêu thích
    "shares": 0                    // Lượt chia sẻ
  },
  "createdAt": "...",              // Ngày tạo
  "updatedAt": "..."               // Ngày cập nhật
}
```

### Các Status

- `draft`: Nháp (chưa public)
- `published`: Đã public (chưa mint)
- `pending_mint`: Đang mint
- `minted`: Đã mint NFT
- `for_sale`: Đang bán
- `in_transaction`: Đang giao dịch
- `sold`: Đã bán
- `archived`: Đã archive (xóa mềm)

---

## ❓ Troubleshooting

### Lỗi: "mintingService: unavailable"

**Nguyên nhân:** Minting Service không chạy hoặc chạy sai port

**Giải pháp:**

```bash
# Kiểm tra Minting Service
cd d:\DACN\RE-Chain\database_viepropchain_microservice\minting-service
node index.js
```

### Lỗi: "Failed to mint NFT"

**Nguyên nhân:**

- Ganache không chạy
- Contract chưa deploy
- Minting Service lỗi

**Giải pháp:**

1. Kiểm tra Ganache đang chạy: http://127.0.0.1:8545
2. Kiểm tra Minting Service log
3. Thử mint lại

### Lỗi: "Property not found"

**Nguyên nhân:** ID không đúng hoặc BĐS đã bị xóa

**Giải pháp:**

1. Lấy danh sách: `GET /properties`
2. Copy `_id` chính xác
3. Set vào biến `propertyId`

---

## 🎯 Kết luận

**Property Service** là service QUAN TRỌNG NHẤT trong hệ thống vì:

1. ✅ **Quản lý tập trung** tất cả thông tin BĐS
2. ✅ **Điều phối** Minting Service để mint NFT
3. ✅ **Cung cấp API** đầy đủ cho Frontend
4. ✅ **Theo dõi analytics** (views, favorites...)
5. ✅ **Hỗ trợ tìm kiếm** và lọc mạnh mẽ

**Flow hoàn chỉnh:**

```
Tạo BĐS → Xem danh sách → Mint NFT → Cập nhật → Xem thống kê
```

Bây giờ bạn đã hiểu và test thành công Property Service! 🎉
