# 🧪 HƯỚNG DẪN TEST VIEPROPCHAIN VỚI POSTMAN

## 📋 Chuẩn Bị

### 1. Import Postman Collection

1. Mở Postman
2. Click **Import** → Chọn file `ViePropChain_Complete_Flow.postman_collection.json`
3. Collection sẽ xuất hiện trong sidebar

### 2. Kiểm Tra Services Đang Chạy

Đảm bảo 4 services đang chạy:

```powershell
# Terminal 1 - Admin Service
cd services/admin-service
npm start

# Terminal 2 - IPFS Service
cd services/ipfs-service
npm start

# Terminal 3 - User Service
cd services/user-service
npm start

# Terminal 4 - KYC Service
cd services/kyc-service
npm start
```

---

## 🎯 WORKFLOW TEST (Thứ Tự Quan Trọng)

### **BƯỚC 1: Health Checks** ✅

Test tất cả services hoạt động:

1. **Admin Service Health** → Status 200
2. **IPFS Service Health** → Status 200
3. **User Service Health** → Status 200
4. **KYC Service Health** → Status 200

**Kết quả mong đợi:**

- `success: true`
- `mongodb: "connected"`
- `pinata: "configured"` (IPFS Service)

---

### **BƯỚC 2: KYC Flow (Identity Verification)** 👤

**Mục đích:** Xác thực danh tính người dùng

#### 2.1. Submit KYC - User 1

**Request:**

```json
POST http://localhost:4007/kyc
{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "fullName": "Nguyen Van A",
  "idNumber": "123456789012"
}
```

**Response mong đợi:**

```json
{
  "success": true,
  "message": "KYC verified successfully",
  "data": {
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "fullName": "Nguyen Van A",
    "idNumber": "123456789012",
    "status": "verified",
    "verifiedAt": "2025-10-22T..."
  }
}
```

**✨ Điều xảy ra:**

- KYC tự động verified
- KYC Service gọi User Service để update `kycStatus`
- Biến `{{user1_wallet}}` được lưu vào Environment

#### 2.2. Get KYC Info

Kiểm tra thông tin KYC đã lưu

#### 2.3. Check if Verified

Kiểm tra trạng thái verified

---

### **BƯỚC 3: User Profile Management** 👨‍💼

**Mục đích:** Quản lý thông tin bổ sung của người dùng

#### 3.1. Get or Create Profile

**Request:**

```json
POST http://localhost:4006/profiles
{
  "walletAddress": "{{user1_wallet}}"
}
```

**Response:** Profile được tạo với `kycStatus.isVerified = true` (đã được KYC Service update)

#### 3.2. Update Basic Info

Cập nhật thông tin cơ bản:

- Họ tên
- Ngày sinh
- Giới tính
- Quốc tịch

#### 3.3. Update Contact Info

Cập nhật thông tin liên hệ:

- Email
- Số điện thoại
- Địa chỉ chi tiết

#### 3.4. Get Profile

Xem profile đầy đủ sau khi cập nhật

---

### **BƯỚC 4: Property Management** 🏠

**Mục đích:** Tạo và quản lý property

#### 4.1. Create Property ⭐

**Request:**

```json
POST http://localhost:4003/properties
{
  "title": "Luxury Villa in District 2",
  "description": "Beautiful 3-bedroom villa with swimming pool and garden",
  "propertyType": "villa",
  "address": {
    "street": "123 Thao Dien",
    "ward": "Thao Dien",
    "district": "District 2",
    "city": "Ho Chi Minh City",
    "country": "Vietnam"
  },
  "area": 250,
  "price": 15000000000,
  "currency": "VND",
  "bedrooms": 3,
  "bathrooms": 3,
  "features": ["Swimming Pool", "Garden", "Parking", "Security"],
  "owner": "{{user1_wallet}}",
  "legalStatus": "verified"
}
```

**Response mong đợi:**

- Status 201
- Property ID được lưu vào `{{property_id}}`

#### 4.2. Get All Properties

Xem danh sách tất cả properties

#### 4.3. Get Property Detail

Xem chi tiết property vừa tạo

#### 4.4. Update Property

Cập nhật giá hoặc mô tả

#### 4.5. Get Statistics

Xem thống kê tổng quan

---

### **BƯỚC 5: IPFS File Upload** 📁

**Mục đích:** Upload ảnh property và metadata NFT lên IPFS/Pinata

---

#### 5.1. Upload Property Image ⚠️ QUAN TRỌNG - ĐỌC KỸ

**⚠️ LƯU Ý:** Bước này cần upload file thực từ máy tính của bạn!

**Cách làm từng bước:**

**1️⃣ Chuẩn bị ảnh:**

- Tìm 1 ảnh nhà/villa bất kỳ trên máy tính (jpg, png, ...)
- Hoặc tải ảnh mẫu từ internet về máy

**2️⃣ Trong Postman:**

- Mở request **"Upload Property Image"** trong folder **"5. IPFS Service"**
- Click tab **Body** (ở giữa màn hình, dưới URL)
- Kiểm tra đã chọn **form-data** (nếu chưa thì chọn)

**3️⃣ Upload file:**

- Bạn sẽ thấy 2 dòng (rows):

  - Dòng 1: `file` (type: File)
  - Dòng 2: `propertyId` (type: Text) = `{{property_id}}`

- **Ở dòng `file`:**
  - Bên phải có dropdown "Text" → Click vào → Chọn **"File"**
  - Sau đó bên phải sẽ xuất hiện nút **"Select Files"**
  - Click **"Select Files"** → Chọn ảnh từ máy tính
  - Sau khi chọn, tên file sẽ hiển thị

**4️⃣ Kiểm tra trước khi Send:**

- ✅ `file`: Đã chọn file ảnh (hiển thị tên file)
- ✅ `propertyId`: Có giá trị `{{property_id}}` (tự động từ Bước 4)
- ✅ URL: `http://localhost:4002/upload/image`

**5️⃣ Click Send**

**Response mong đợi:**

```json
{
  "success": true,
  "data": {
    "cid": "QmXxx...",
    "pinataUrl": "https://gateway.pinata.cloud/ipfs/QmXxx...",
    "propertyId": "67480cf6b84fe1b3f3ad64df"
  }
}
```

**✨ Quan trọng:**

- Response trả về **CID** (Content Identifier) của ảnh trên IPFS
- CID này tự động được lưu vào biến `{{image_cid}}`
- Bạn có thể mở `pinataUrl` trên browser để xem ảnh vừa upload

**📸 Hình minh họa trong Postman:**

```
┌─────────────────────────────────────────────────┐
│ Body  Params  Authorization  Headers  ...       │
├─────────────────────────────────────────────────┤
│ ○ none   ○ form-data   ○ x-www-form-urlencoded │
│                ▲ Chọn form-data                  │
├─────────────────────────────────────────────────┤
│ KEY          │ VALUE              │ TYPE  │ ✓   │
├──────────────┼────────────────────┼───────┼─────┤
│ file         │ villa.jpg          │ File  │ ✓   │ ← Click "Select Files" để chọn
│              │ [Select Files]     │       │     │
├──────────────┼────────────────────┼───────┼─────┤
│ propertyId   │ {{property_id}}    │ Text  │ ✓   │ ← Tự động từ Bước 4
└──────────────┴────────────────────┴───────┴─────┘
```

**🔧 Nếu gặp lỗi:**

- **"No file selected"** → Bạn chưa chọn file, làm lại bước 3️⃣
- **"IPFS Service not responding"** → Kiểm tra IPFS Service đang chạy: `npm start` trong folder `ipfs-service`
- **"Invalid property ID"** → Chạy lại Bước 4 để tạo property và lưu `{{property_id}}`

---

#### 5.2. Upload NFT Metadata

**Mục đích:** Upload metadata JSON (thông tin NFT) lên IPFS

**⚠️ LƯU Ý:** Bước này **KHÔNG cần chọn file**, chỉ cần gửi JSON!

**Cách làm:**

**1️⃣ Trong Postman:**

- Mở request **"Upload NFT Metadata"** trong folder **"5. IPFS Service"**
- Tab **Body** → Kiểm tra đã chọn **raw** và **JSON**

**2️⃣ Kiểm tra JSON body:**

Request body đã được điền sẵn như sau:

```json
{
  "propertyId": "{{property_id}}",
  "metadata": {
    "name": "Luxury Villa in District 2",
    "description": "Beautiful 3-bedroom villa with swimming pool and garden",
    "image": "ipfs://{{image_cid}}",
    "external_url": "https://viepropchain.com/property/{{property_id}}",
    "attributes": [
      { "trait_type": "Property Type", "value": "Villa" },
      { "trait_type": "Area", "value": "250 sqm" },
      { "trait_type": "Bedrooms", "value": "3" },
      { "trait_type": "Bathrooms", "value": "3" },
      { "trait_type": "Location", "value": "District 2, HCMC" }
    ]
  }
}
```

**✨ Các biến tự động:**

- `{{property_id}}` → Từ Bước 4 (Create Property)
- `{{image_cid}}` → Từ Bước 5.1 (Upload Image)

**3️⃣ Click Send**

**Response mong đợi:**

```json
{
  "success": true,
  "data": {
    "cid": "QmYyy...",
    "pinataUrl": "https://gateway.pinata.cloud/ipfs/QmYyy...",
    "propertyId": "67480cf6b84fe1b3f3ad64df",
    "metadata": { ... }
  }
}
```

**✨ Metadata CID được lưu vào `{{metadata_cid}}`** → Dùng cho Bước 6 (Mint NFT)

#### 5.3. Get Content by CID

Xem metadata vừa upload

---

### **BƯỚC 6: NFT Minting (Orchestrator)** 🎨

**Mục đích:** Mint property thành NFT trên blockchain

#### 6.1. Mint Property to NFT ⭐⭐⭐

**Request:**

```json
POST http://localhost:4003/properties/{{property_id}}/mint
{
  "to": "{{user1_wallet}}",
  "metadataUri": "ipfs://{{metadata_cid}}"
}
```

**✨ Admin Service Orchestrates:**

1. Gọi Blockchain Service để mint NFT
2. Nhận tokenId từ blockchain
3. Update Property với NFT info (tokenId, contractAddress, metadataUri)
4. **Tự động tạo NFT record trong MongoDB** để track giá, status, history

**Response mong đợi:**

```json
{
  "success": true,
  "message": "Property minted successfully",
  "data": {
    "tokenId": "8",
    "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
    "owner": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
    "transactionHash": "0x638aee567d1d9aacfce0f96579a7047b6f2ff32d259c933b4d6825e8a2258670",
    "blockNumber": 32,
    "tokenURI": "ipfs://QmR6FtgPMLKkmHpAhhMBTH94Nocy62GeVynDMcsPrdFCxm",
    "metadataCID": "QmR6FtgPMLKkmHpAhhMBTH94Nocy62GeVynDMcsPrdFCxm"
  }
}
```

**✨ Sau khi mint:**

- NFT được lưu trong MongoDB với status: `minted`
- Property status: `minted`
- `{{token_id}}` được lưu vào environment variable

**⚠️ LỖI CÓ THỂ XẢY RA:**

- `Blockchain Service not available` → Blockchain Service chưa chạy (Port 4004)
- `Property already minted` → Property đã được mint rồi
- `Property not found` → Property ID không tồn tại

---

### **BƯỚC 7: NFT Management (Owner Operations)** 💎

**Mục đích:** Owner quản lý NFT của mình (giá, status, metadata)

#### 7.1. Get NFT Details

**Request:**

```http
GET http://localhost:4003/nfts/{{token_id}}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tokenId": 8,
    "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
    "propertyId": "68f88b446dcb6241698a902c",
    "currentOwner": "0xc6890b26a32d9d92aefbc8635c4588247529cdfe",
    "status": "minted",
    "metadataUri": "ipfs://QmR6FtgPMLKkmHpAhhMBTH94Nocy62GeVynDMcsPrdFCxm",
    "listing": {
      "isListed": false,
      "price": null,
      "priceETH": null
    },
    "transferHistory": [...],
    "saleHistory": [],
    "totalTransfers": 1,
    "totalSales": 0,
    "views": 0
  }
}
```

---

#### 7.2. List NFT for Sale

**Request:**

```json
POST http://localhost:4003/nfts/{{token_id}}/list
{
  "price": "1000000000000000000",
  "seller": "{{user1_wallet}}",
  "listingId": 1
}
```

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
      "price": "1000000000000000000",
      "priceETH": 1,
      "listedAt": "2025-10-22T...",
      "seller": "0xc6890b26..."
    }
  }
}
```

**✨ Giá được tính:**

- `price`: Wei (1 ETH = 10^18 wei)
- `priceETH`: ETH readable (1.0, 2.5, etc.)

---

#### 7.3. Update NFT Price (Owner only)

**Request:**

```json
PUT http://localhost:4003/nfts/{{token_id}}/price
{
  "price": "2000000000000000000",
  "owner": "{{user1_wallet}}"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Price updated successfully",
  "data": {
    "tokenId": 8,
    "price": "2000000000000000000",
    "priceETH": 2
  }
}
```

**⚠️ Chỉ owner mới update được giá!**

---

#### 7.4. Update NFT Status (Owner only)

**Request:**

```json
PUT http://localhost:4003/nfts/{{token_id}}/status
{
  "status": "transferred",
  "owner": "{{user1_wallet}}"
}
```

**Valid statuses:**

- `minted` - Vừa mint xong
- `listed` - Đang bán
- `sold` - Đã bán
- `transferred` - Đã chuyển nhượng
- `burned` - Đã burn

---

#### 7.5. Unlist NFT (Cancel Sale)

**Request:**

```json
POST http://localhost:4003/nfts/{{token_id}}/unlist
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
      "isListed": false
    }
  }
}
```

---

#### 7.6. Get NFTs by Owner

**Request:**

```http
GET http://localhost:4003/nfts/owner/{{user1_wallet}}
```

**Response:** Danh sách tất cả NFT của owner

---

#### 7.7. Get Listed NFTs (Marketplace)

**Request:**

```http
GET http://localhost:4003/nfts/marketplace/listed?minPrice=0.5&maxPrice=10
```

**Response:** Tất cả NFT đang bán trong khoảng giá

---

### **BƯỚC 8: Search & Statistics** 📊

Kiểm tra dữ liệu tổng quan:

1. **Search Users** - Tìm users đã verified
2. **User Statistics** - Thống kê users
3. **KYC Statistics** - Thống kê KYC
4. **Property Statistics** - Thống kê properties

---

## 📊 KẾT QUẢ MONG ĐỢI

Sau khi hoàn thành workflow:

### MongoDB Collections

**User Service:**

- `userprofiles`: 1 user với `kycStatus.isVerified = true`

**KYC Service:**

- `kycs`: 1 KYC record với `status = "verified"`

**Admin Service:**

- `properties`: 1 property với NFT info (tokenId, contractAddress)
- `nfts`: 1 NFT record với currentOwner, listing (price, status), saleHistory, transferHistory

**IPFS Service:**

- `ipfsmetadatas`: 2 records (image + metadata)

---

## 🐛 TROUBLESHOOTING

### Lỗi: "Unable to connect to the remote server"

**Nguyên nhân:** Service chưa chạy

**Giải pháp:**

```powershell
cd services/<service-name>
npm start
```

### Lỗi: "Property not found"

**Nguyên nhân:** `{{property_id}}` chưa được set

**Giải pháp:**

1. Chạy lại "Create Property"
2. Kiểm tra tab **Tests** có chạy script set variable không

### Lỗi: "Blockchain Service not available"

**Nguyên nhân:** Blockchain Service chưa được implement hoặc chưa chạy

**Giải pháp tạm thời:**

- Skip bước Mint NFT
- Hoặc implement Blockchain Service trước

### Lỗi: "File upload failed"

**Nguyên nhân:** Chưa chọn file hoặc file quá lớn

**Giải pháp:**

- Chọn file ảnh < 10MB
- Kiểm tra Pinata API keys trong `.env`

---

## 🎯 CHECKLIST HOÀN THÀNH

- [ ] ✅ All services health checks pass
- [ ] ✅ KYC submitted và auto-verified
- [ ] ✅ User profile created với KYC status
- [ ] ✅ Property created successfully
- [ ] ✅ Image uploaded to IPFS
- [ ] ✅ Metadata uploaded to IPFS
- [ ] ✅ Property minted to NFT (Blockchain Service required)
- [ ] ✅ NFT record created in MongoDB
- [ ] ✅ Owner can list NFT for sale
- [ ] ✅ Owner can update price/status
- [ ] ✅ Marketplace queries working
- [ ] ✅ Statistics endpoints working

---

## 📝 GHI CHÚ

**Environment Variables được tự động set:**

- `user1_wallet` - Wallet address của user (từ KYC)
- `property_id` - ID của property vừa tạo
- `image_cid` - CID của ảnh trên IPFS
- `metadata_cid` - CID của metadata trên IPFS
- `token_id` - Token ID của NFT (sau khi mint)

**Các biến này được sử dụng trong các request tiếp theo bằng cú pháp `{{variable_name}}`**

---

## 🏗️ DATA ARCHITECTURE

### IPFS (Immutable - Không thay đổi)

Upload **1 lần duy nhất** khi mint NFT:

- Property metadata: name, description, image
- Attributes: property type, area, bedrooms, location
- CID được lưu on-chain trong `tokenURI`

**❌ KHÔNG nên thay đổi sau khi mint!**

### MongoDB (Mutable - Có thể thay đổi)

Lưu **dynamic marketplace data** mà owner có thể update:

- `listing.price` / `listing.priceETH` - Giá bán hiện tại
- `status` - Trạng thái NFT (minted/listed/sold/transferred)
- `currentOwner` - Owner hiện tại (tự động update khi transfer)
- `saleHistory` - Lịch sử bán (price, from, to, timestamp)
- `transferHistory` - Lịch sử chuyển nhượng
- `views`, `favorites` - Thống kê engagement

**✅ Frontend query từ cả 2 sources:**

- Metadata (immutable) từ IPFS gateway
- Current price/status/owner từ API (`GET /nfts/:tokenId`)

**Đây là pattern chuẩn của OpenSea, Rarible!**

---

## 🚀 NEXT STEPS

Sau khi test xong workflow cơ bản:

1. **Implement Blockchain Service** để hoàn thành NFT minting
2. **Implement Auth Service** để thêm authentication
3. **Implement Query Service** để search/filter properties
4. **Implement Indexer Service** để lắng nghe blockchain events

---

Chúc bạn test thành công! 🎉
