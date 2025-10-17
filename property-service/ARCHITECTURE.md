# 🏗️ KIẾN TRÚC HỆ THỐNG - ViePropChain Property Service

## 📋 TÓM TẮT

**Property Service** là service trung tâm quản lý toàn bộ bất động sản trong hệ thống ViePropChain. Frontend CHỈ gọi Property Service, KHÔNG gọi trực tiếp Minting Service.

---

## 🎯 LUỒNG HOẠT ĐỘNG CHÍNH

### **1. Tạo NFT từ Admin (1 lần gọi duy nhất)**

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Admin Page /admin/nft)                           │
│  - Điền form: tên, mô tả, giá, địa chỉ, thuộc tính...      │
│  - Click "Tạo NFT"                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ POST /properties/create-and-mint
                      │ {recipient, propertyType, name, price, location, details, media}
                      ▼
┌──────────────────────────────────────────────────────────────┐
│  PROPERTY SERVICE (port 3003)                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Step 1: Tạo Property                                   │ │
│  │  - Lưu vào MongoDB                                     │ │
│  │  - Status: pending_mint                                │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Step 2: Build NFT Metadata                             │ │
│  │  - Chuyển property data thành ERC-721 metadata         │ │
│  │  - Attributes array với property type specific fields  │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Step 3: Gọi Minting Service                            │ │
│  │  - POST http://localhost:3002/mint                     │ │
│  │  - {recipient, metadata}                               │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Step 4: Nhận kết quả từ Minting Service               │ │
│  │  - tokenId, transactionHash, ipfsHash, tokenURI        │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Step 5: Cập nhật Property                              │ │
│  │  - nft.isMinted = true                                 │ │
│  │  - nft.tokenId, owner, transactionHash, etc.           │ │
│  │  - Status: minted                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                      │
                      │ Response {success, data: {property, nft}}
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND                                                    │
│  - Hiển thị thông tin Property + NFT                        │
│  - Property ID, Token ID, Transaction Hash, IPFS link       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 API ENDPOINTS

### **1. CREATE AND MINT (All-in-One) - DÀNH CHO ADMIN**

```http
POST http://localhost:3003/properties/create-and-mint
```

**Request Body:**
```json
{
  "recipient": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
  "propertyType": "apartment",
  "name": "Căn hộ Vinhomes Central Park",
  "description": "Căn hộ 2PN view đẹp",
  "price": {
    "amount": 5000000000,
    "currency": "VND"
  },
  "location": {
    "address": "208 Nguyễn Hữu Cảnh",
    "ward": "Phường 22",
    "district": "Quận Bình Thạnh",
    "city": "TP. Hồ Chí Minh"
  },
  "details": {
    "tenduan": "Vinhomes Central Park",
    "macanho": "L3-1205",
    "block": "Landmark 3",
    "tang": 12,
    "dientichtimtuong": "85m2",
    "dientichthongthuy": "80m2",
    "sophongngu": 2,
    "sophongtam": 2,
    "huongbancong": "Đông Nam",
    "tinhtrangnoithat": "Nội thất đầy đủ",
    "phap ly": "Sổ hồng"
  },
  "media": {
    "images": [{
      "url": "https://example.com/image.jpg",
      "isPrimary": true
    }]
  },
  "status": "published"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Property created and minted as NFT successfully",
  "data": {
    "property": {
      "_id": "68f1f371679b101ad72f301c",
      "propertyType": "apartment",
      "name": "Căn hộ Vinhomes Central Park",
      "status": "minted",
      "nft": {
        "isMinted": true,
        "tokenId": 6,
        "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
        "owner": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
        "transactionHash": "0x56a501f93edc97adfe2f0143bb7078e3a0c01abe90d76d14ef7db750a77834a4",
        "ipfsHash": "QmXxx...",
        "tokenURI": "https://gateway.pinata.cloud/ipfs/QmXxx...",
        "mintedAt": "2025-10-17T07:47:17.123Z"
      },
      ...
    },
    "nft": {
      "tokenId": 6,
      "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
      "owner": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
      "transactionHash": "0x56a501f93edc97adfe2f0143bb7078e3a0c01abe90d76d14ef7db750a77834a4",
      "tokenURI": "https://gateway.pinata.cloud/ipfs/QmXxx...",
      "ipfsHash": "QmXxx..."
    }
  }
}
```

### **2. GET ALL PROPERTIES - DÀNH CHO DANH SÁCH**

```http
GET http://localhost:3003/properties
GET http://localhost:3003/properties?page=1&limit=10
GET http://localhost:3003/properties?propertyType=apartment
GET http://localhost:3003/properties?status=minted
```

**Response:**
```json
{
  "success": true,
  "data": [...properties],
  "pagination": {
    "total": 10,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

### **3. GET PROPERTY BY ID**

```http
GET http://localhost:3003/properties/:id
GET http://localhost:3003/properties/:id?incrementView=true
```

---

## 🎨 FRONTEND COMPONENTS

### **Admin NFT Page** (`/admin/nft`)
- Form điền thông tin bất động sản
- Chọn loại: apartment, land, house, villa
- Các trường động theo loại BĐS
- Gọi `POST /properties/create-and-mint`
- Hiển thị kết quả: Property info + NFT info

### **Admin List Page** (`/admin/list-nft`)
- Gọi `GET /properties`
- Hiển thị danh sách properties
- Filter theo type, status
- Click vào property → Xem chi tiết

---

## 🔄 SO SÁNH CŨ VS MỚI

### **❌ CŨ (SAI):**
```
Frontend → Minting Service (port 3002)
  - Chỉ mint NFT
  - Không lưu thông tin property
  - Không có database
```

### **✅ MỚI (ĐÚNG):**
```
Frontend → Property Service (port 3003) → Minting Service (port 3002)
  - Lưu property trong MongoDB
  - Quản lý lifecycle: draft → published → pending_mint → minted → for_sale → sold
  - Analytics: views, favorites, shares
  - Property Service TỰ GỌI Minting Service khi cần
```

---

## 📦 SERVICES ROLES

### **Property Service (port 3003)** - MANAGER
- ✅ Quản lý TOÀN BỘ thông tin bất động sản
- ✅ CRUD properties
- ✅ MongoDB storage
- ✅ IPFS metadata builder
- ✅ Điều phối minting (gọi Minting Service)
- ✅ Analytics & Statistics
- ✅ **Frontend gọi trực tiếp**

### **Minting Service (port 3002)** - WORKER
- ✅ CHỈ mint NFT lên blockchain
- ✅ Kết nối Ganache
- ✅ Smart contract interaction
- ✅ Lắng nghe Transfer events
- ❌ **Frontend KHÔNG gọi trực tiếp**
- ✅ **Property Service gọi khi cần mint**

---

## 🚀 WORKFLOW THỰC TẾ

1. **Admin mở trang `/admin/nft`**
2. **Điền form đầy đủ** (tên, mô tả, giá, địa chỉ, thuộc tính...)
3. **Click "Tạo NFT"**
4. **Frontend gọi 1 endpoint duy nhất:**
   ```javascript
   fetch('http://localhost:3003/properties/create-and-mint', {
     method: 'POST',
     body: JSON.stringify({
       recipient: "0x...",
       propertyType: "apartment",
       name: "...",
       // ... tất cả thông tin
     })
   })
   ```
5. **Property Service tự động:**
   - Tạo property trong MongoDB
   - Build NFT metadata
   - Gọi Minting Service mint NFT
   - Cập nhật property với thông tin NFT
   - Trả về kết quả đầy đủ
6. **Frontend hiển thị kết quả**

---

## ✅ LỢI ÍCH

1. **Đơn giản hóa Frontend**: Chỉ cần gọi 1 endpoint
2. **Tách biệt trách nhiệm**: Property Service = Manager, Minting Service = Worker
3. **Dễ mở rộng**: Thêm chức năng mới vào Property Service
4. **Database-backed**: Có thể query, filter, search properties
5. **Analytics**: Tracking views, favorites, sales
6. **Lifecycle management**: Quản lý trạng thái property từ draft → sold

---

## 🛠️ TESTING

### **Test với Postman:**

1. **Start services:**
   ```bash
   # Terminal 1: Ganache
   cd viepropchain
   ganache -m "arm either chef..." --database.dbPath "./ganache-data-dev" --chain.networkId 1337 --server.port 8545
   
   # Terminal 2: Minting Service
   cd database_viepropchain_microservice/minting-service
   npm start
   
   # Terminal 3: Property Service
   cd database_viepropchain_microservice/property-service
   npm start
   ```

2. **Test create-and-mint:**
   - Import collection: `ViePropChain_Property_Service.postman_collection.json`
   - Run request: "Create and Mint Apartment"
   - Check response có property + nft info

3. **Test list properties:**
   - Run request: "Get All Properties"
   - Check có property vừa tạo

---

## 📚 TÀI LIỆU LIÊN QUAN

- `POSTMAN_COMPLETE_GUIDE.md` - Hướng dẫn test với Postman
- `API_TEST_GUIDE.md` - Chi tiết API endpoints
- `README.md` - Tổng quan Property Service
- `QUICK_START.md` - Bắt đầu nhanh
