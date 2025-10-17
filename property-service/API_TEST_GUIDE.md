# Property Service - API Testing Guide

## 🚀 Quick Start

### 1. Start Property Service

```bash
cd property-service
npm install
npm start
```

Service chạy trên: `http://localhost:3003`

### 2. Create Sample Data

```bash
node create-samples.js
```

## 📋 Test Scenarios

### Scenario 1: Tạo bất động sản mới

**Request:**

```bash
curl -X POST http://localhost:3003/properties \
  -H "Content-Type: application/json" \
  -d '{
    "propertyType": "apartment",
    "name": "Căn hộ Estella Heights",
    "description": "Căn hộ 3PN view đẹp tại Quận 2",
    "price": { "amount": 6000000000, "currency": "VND" },
    "location": {
      "address": "88 Song Hành, An Phú, Quận 2",
      "city": "TP. Hồ Chí Minh",
      "district": "Quận 2"
    },
    "details": {
      "projectName": "Estella Heights",
      "bedrooms": 3,
      "bathrooms": 2,
      "netArea": "120m2",
      "floor": 15,
      "balconyDirection": "Nam",
      "legalStatus": "Sổ hồng"
    },
    "media": {
      "images": [
        {
          "url": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
          "isPrimary": true
        }
      ]
    },
    "owner": {
      "walletAddress": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
      "name": "Nguyễn Test"
    },
    "status": "published"
  }'
```

### Scenario 2: Lấy danh sách bất động sản

**All properties:**

```bash
curl http://localhost:3003/properties
```

**With filters:**

```bash
curl "http://localhost:3003/properties?propertyType=apartment&status=published&page=1&limit=10"
```

**Search:**

```bash
curl "http://localhost:3003/properties?search=Vinhomes"
```

**Price range:**

```bash
curl "http://localhost:3003/properties?minPrice=3000000000&maxPrice=7000000000"
```

### Scenario 3: Xem chi tiết bất động sản

```bash
curl http://localhost:3003/properties/[PROPERTY_ID]
```

**Tăng view count:**

```bash
curl "http://localhost:3003/properties/[PROPERTY_ID]?incrementView=true"
```

### Scenario 4: Cập nhật bất động sản

```bash
curl -X PUT http://localhost:3003/properties/[PROPERTY_ID] \
  -H "Content-Type: application/json" \
  -d '{
    "price": { "amount": 6500000000 },
    "status": "for_sale"
  }'
```

### Scenario 5: Mint NFT từ bất động sản

**QUAN TRỌNG:** Minting Service phải chạy trên port 3002

```bash
curl -X POST http://localhost:3003/properties/[PROPERTY_ID]/mint \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE"
  }'
```

**Response mẫu:**

```json
{
  "success": true,
  "message": "Property minted as NFT successfully",
  "data": {
    "propertyId": "67...",
    "tokenId": 1,
    "contractAddress": "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
    "owner": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
    "transactionHash": "0x...",
    "tokenURI": "https://gateway.pinata.cloud/ipfs/Qm...",
    "ipfsHash": "Qm..."
  }
}
```

### Scenario 6: Xem thống kê

```bash
curl http://localhost:3003/properties/stats/overview
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalProperties": 3,
    "totalMinted": 1,
    "totalForSale": 0,
    "totalSold": 0,
    "totalViews": 15,
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

### Scenario 7: Analytics actions

**Thêm favorite:**

```bash
curl -X POST http://localhost:3003/properties/[PROPERTY_ID]/favorite
```

**Thêm share:**

```bash
curl -X POST http://localhost:3003/properties/[PROPERTY_ID]/share
```

### Scenario 8: Archive bất động sản

**Soft delete (archive):**

```bash
curl -X DELETE http://localhost:3003/properties/[PROPERTY_ID]
```

**Permanent delete:**

```bash
curl -X DELETE "http://localhost:3003/properties/[PROPERTY_ID]?permanent=true"
```

## 🔍 Test Full Flow: Từ tạo BĐS → Mint NFT

```bash
# 1. Tạo bất động sản
PROPERTY_ID=$(curl -s -X POST http://localhost:3003/properties \
  -H "Content-Type: application/json" \
  -d '{
    "propertyType": "villa",
    "name": "Biệt thự Phú Mỹ Hưng",
    "description": "Biệt thự sang trọng",
    "price": { "amount": 15000000000, "currency": "VND" },
    "location": {
      "address": "Khu Phú Mỹ Hưng, Quận 7",
      "city": "TP. Hồ Chí Minh",
      "district": "Quận 7"
    },
    "details": {
      "landArea": "200m2",
      "bedrooms": 5,
      "bathrooms": 4,
      "constructionYear": 2022,
      "legalStatus": "Sổ hồng riêng"
    },
    "media": {
      "images": [{
        "url": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
        "isPrimary": true
      }]
    },
    "owner": {
      "walletAddress": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
      "name": "Test Owner"
    },
    "status": "published"
  }' | jq -r '.data._id')

echo "Created Property ID: $PROPERTY_ID"

# 2. Xem chi tiết
curl http://localhost:3003/properties/$PROPERTY_ID | jq

# 3. Mint NFT
curl -X POST http://localhost:3003/properties/$PROPERTY_ID/mint \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE"
  }' | jq

# 4. Kiểm tra lại property sau khi mint
curl http://localhost:3003/properties/$PROPERTY_ID | jq '.data.nft'
```

## ✅ Expected Results

### Property created:

- ✅ `_id` được tạo
- ✅ `status` = "published"
- ✅ `nft.isMinted` = false
- ✅ `createdAt`, `updatedAt` được set

### After minting:

- ✅ `nft.isMinted` = true
- ✅ `nft.tokenId` có giá trị
- ✅ `nft.transactionHash` được ghi nhận
- ✅ `nft.ipfsHash` được lưu
- ✅ `status` = "minted"

## 🐛 Common Issues

### 1. Minting Service not available

```
Error: Failed to mint NFT
```

**Solution:** Kiểm tra Minting Service đang chạy trên port 3002

### 2. MongoDB connection failed

```
Error: MongoDB connection error
```

**Solution:** Kiểm tra `MONGODB_URI` trong file `.env`

### 3. IPFS upload failed

```
Error: Failed to upload metadata to IPFS
```

**Solution:** Kiểm tra `PINATA_JWT` trong file `.env`

## 📊 Health Check

```bash
curl http://localhost:3003/health
```

**Response:**

```json
{
  "success": true,
  "service": "Property Service",
  "status": "running",
  "database": "connected",
  "mintingService": "available",
  "timestamp": "2025-10-17T..."
}
```

## 🔗 Integration với Frontend

Frontend có thể gọi API như sau:

```javascript
// Create property
const response = await fetch("http://localhost:3003/properties", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(propertyData),
});

// Get properties
const response = await fetch(
  "http://localhost:3003/properties?page=1&limit=20"
);

// Mint NFT
const response = await fetch(`http://localhost:3003/properties/${id}/mint`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ recipient: walletAddress }),
});
```
