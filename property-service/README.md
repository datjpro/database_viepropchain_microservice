# Property Service - ViePropChain

🏢 **Property Service** là service xương sống của hệ thống ViePropChain, quản lý tất cả thông tin bất động sản và điều phối các service khác.

## 📋 Chức năng chính

### 1. Quản lý Bất động sản (CRUD)

- ✅ Tạo hồ sơ bất động sản mới
- ✅ Lấy danh sách bất động sản (có phân trang, lọc, tìm kiếm)
- ✅ Xem chi tiết một bất động sản
- ✅ Cập nhật thông tin bất động sản
- ✅ Xóa/Archive bất động sản

### 2. Quản lý IPFS

- ✅ Tải file ảnh, tài liệu lên IPFS
- ✅ Tạo metadata.json theo chuẩn ERC-721
- ✅ Build metadata từ thông tin bất động sản

### 3. Điều phối Minting

- ✅ Gửi yêu cầu mint NFT đến Minting Service
- ✅ Cập nhật thông tin NFT sau khi mint thành công
- ✅ Kiểm tra trạng thái Minting Service

### 4. Thống kê & Analytics

- ✅ Thống kê tổng quan (số lượng, views, favorites...)
- ✅ Phân loại theo loại BĐS, trạng thái
- ✅ Theo dõi lượt xem, yêu thích, chia sẻ

## 🗂️ Cấu trúc Database

### Property Schema

```javascript
{
  // Basic Info
  propertyType: 'apartment' | 'land' | 'house' | 'villa',
  name: String,
  description: String,
  price: { amount: Number, currency: String },

  // Location
  location: {
    address: String,
    ward: String,
    district: String,
    city: String,
    coordinates: { latitude: Number, longitude: Number }
  },

  // Property Details (dynamic)
  details: {
    // Apartment
    projectName, apartmentCode, block, floor,
    grossArea, netArea, bedrooms, bathrooms,
    balconyDirection, interiorStatus, legalStatus

    // Land
    landNumber, mapSheetNumber, gpsCoordinates,
    frontWidth, length, landType, zoning, roadFrontage

    // House/Villa
    landArea, constructionArea, usableArea, structure,
    bedrooms, bathrooms, houseDirection, roadFrontage,
    constructionYear, legalStatus
  },

  // Media
  media: {
    images: [{ url, caption, isPrimary }],
    documents: [{ name, url, type }],
    virtualTour: String
  },

  // NFT Info
  nft: {
    isMinted: Boolean,
    tokenId: Number,
    contractAddress: String,
    owner: String,
    tokenURI: String,
    transactionHash: String,
    ipfsHash: String,
    mintedAt: Date
  },

  // Status
  status: 'draft' | 'published' | 'pending_mint' | 'minted' |
          'for_sale' | 'in_transaction' | 'sold' | 'archived',

  // Owner & Agent
  owner: { userId, walletAddress, name, email },
  agent: { userId, name, phone, email },

  // Analytics
  analytics: { views, favorites, shares, inquiries },

  // Metadata
  isPublic: Boolean,
  isFeatured: Boolean,
  tags: [String],

  // Timestamps
  createdAt, updatedAt, publishedAt
}
```

## 🚀 API Endpoints

### Properties Management

#### 1. Create Property

```http
POST /properties
Content-Type: application/json

{
  "propertyType": "apartment",
  "name": "Căn hộ Vinhomes Central Park",
  "description": "Căn hộ 2PN view sông tuyệt đẹp",
  "price": { "amount": 5000000000, "currency": "VND" },
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
      { "url": "https://example.com/image1.jpg", "isPrimary": true }
    ]
  },
  "owner": {
    "walletAddress": "0x...",
    "name": "Nguyễn Văn A"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Property created successfully",
  "data": {
    /* property object */
  }
}
```

#### 2. Get All Properties

```http
GET /properties?page=1&limit=20&propertyType=apartment&status=published&city=TP.%20Hồ%20Chí%20Minh

Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 20)
- propertyType: apartment | land | house | villa
- status: draft | published | minted | for_sale | sold
- city: City name
- district: District name
- minPrice: Minimum price
- maxPrice: Maximum price
- bedrooms: Number of bedrooms
- search: Text search
- sortBy: Field to sort by (default: createdAt)
- sortOrder: asc | desc (default: desc)
```

**Response:**

```json
{
  "success": true,
  "data": [
    /* array of properties */
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

#### 3. Get Property by ID

```http
GET /properties/:id?incrementView=true
```

**Response:**

```json
{
  "success": true,
  "data": {
    /* property object */
  }
}
```

#### 4. Update Property

```http
PUT /properties/:id
Content-Type: application/json

{
  "price": { "amount": 5500000000 },
  "status": "for_sale",
  "details": {
    "interiorStatus": "Nội thất đầy đủ"
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Property updated successfully",
  "data": {
    /* updated property */
  }
}
```

#### 5. Delete/Archive Property

```http
DELETE /properties/:id?permanent=false
```

**Response:**

```json
{
  "success": true,
  "message": "Property archived"
}
```

### NFT Minting

#### 6. Mint Property to NFT

```http
POST /properties/:id/mint
Content-Type: application/json

{
  "recipient": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Property minted as NFT successfully",
  "data": {
    "propertyId": "...",
    "tokenId": 1,
    "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
    "owner": "0x...",
    "transactionHash": "0x...",
    "tokenURI": "https://gateway.pinata.cloud/ipfs/...",
    "ipfsHash": "Qm..."
  }
}
```

### Statistics

#### 7. Get Overview Statistics

```http
GET /properties/stats/overview
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalProperties": 150,
    "totalMinted": 45,
    "totalForSale": 30,
    "totalSold": 10,
    "totalViews": 15000,
    "byType": [
      { "_id": "apartment", "count": 80 },
      { "_id": "house", "count": 40 },
      { "_id": "land", "count": 20 },
      { "_id": "villa", "count": 10 }
    ],
    "byStatus": [
      { "_id": "published", "count": 60 },
      { "_id": "minted", "count": 45 },
      { "_id": "for_sale", "count": 30 }
    ]
  }
}
```

### Analytics

#### 8. Increment Favorite

```http
POST /properties/:id/favorite
```

#### 9. Increment Share

```http
POST /properties/:id/share
```

## 🛠️ Installation & Setup

### 1. Install dependencies

```bash
cd property-service
npm install
```

### 2. Configure environment

Copy `.env` file and update:

- `MONGODB_URI`: Your MongoDB connection string
- `MINTING_SERVICE_URL`: Minting Service URL (default: http://localhost:3002)
- `PINATA_JWT`: Your Pinata JWT token
- `PORT`: Service port (default: 3003)

### 3. Start service

```bash
# Development
npm run dev

# Production
npm start
```

## 🔗 Service Integration

### With Minting Service

Property Service giao tiếp với Minting Service qua HTTP:

- Endpoint: `POST http://localhost:3002/mint`
- Health check: `GET http://localhost:3002/nfts`

### With Frontend

Frontend gọi Property Service để:

- Tạo/cập nhật bất động sản
- Lấy danh sách và chi tiết
- Request mint NFT
- Xem thống kê

## 📊 Data Flow

```
Frontend → Property Service → MongoDB
                ↓
           IPFS (Pinata)
                ↓
         Minting Service → Blockchain
                ↓
         Update Property with NFT info
```

## ✅ Testing

### Test endpoints with cURL:

```bash
# Create property
curl -X POST http://localhost:3003/properties \
  -H "Content-Type: application/json" \
  -d '{"propertyType":"apartment","name":"Test Property","description":"Test"}'

# Get all properties
curl http://localhost:3003/properties

# Get property by ID
curl http://localhost:3003/properties/[ID]

# Mint property
curl -X POST http://localhost:3003/properties/[ID]/mint \
  -H "Content-Type: application/json" \
  -d '{"recipient":"0xC6890b26A32d9d92aefbc8635C4588247529CdfE"}'
```

## 📝 Notes

- Property Service runs on port **3003** by default
- Minting Service must be running on port **3002**
- MongoDB connection required
- Pinata account needed for IPFS uploads

## 🔐 Security

- Input validation on all endpoints
- Soft delete (archive) by default
- NFT info cannot be updated directly (only via minting)
- CORS configured for frontend origin

## 📄 License

MIT
