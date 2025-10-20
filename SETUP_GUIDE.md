# 🚀 HƯỚNG DẪN SETUP & CHẠY MICROSERVICES

## 📋 Yêu cầu hệ thống

- **Node.js**: v18 hoặc cao hơn
- **MongoDB**: v6.0 hoặc cao hơn
- **Ganache**: Local blockchain (port 8545)
- **IPFS/Pinata**: Pinata API keys (free tier)

---

## 1️⃣ SETUP CÁC SERVICE

### Bước 1: Install dependencies cho TẤT CẢ services

```powershell
# Shared models
cd shared
npm install

# API Gateway
cd ../services/api-gateway
npm install

# Auth Service
cd ../auth-service
npm install

# IPFS Service
cd ../ipfs-service
npm install

# Admin Service
cd ../admin-service
npm install

# Blockchain Service
cd ../blockchain-service
npm install

# Query Service
cd ../query-service
npm install

# Indexer Service
cd ../indexer-service
npm install
```

**HOẶC** chạy nhanh bằng script:

```powershell
cd database_viepropchain_microservice
.\install-all.ps1
```

---

### Bước 2: Tạo file .env cho MỖI service

Mỗi service có file `.env.example` - copy và điền thông tin:

#### **services/api-gateway/.env**

```env
PORT=4000
AUTH_SERVICE_URL=http://localhost:4001
IPFS_SERVICE_URL=http://localhost:4002
ADMIN_SERVICE_URL=http://localhost:4003
BLOCKCHAIN_SERVICE_URL=http://localhost:4004
QUERY_SERVICE_URL=http://localhost:4005
```

#### **services/auth-service/.env**

```env
MONGODB_URI=mongodb://localhost:27017/viepropchain
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=4001
```

#### **services/ipfs-service/.env**

```env
MONGODB_URI=mongodb://localhost:27017/viepropchain
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Lấy từ Pinata dashboard
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_KEY=your-pinata-secret-key
PORT=4002
```

**Lấy Pinata keys:** https://app.pinata.cloud/developers/api-keys

#### **services/admin-service/.env**

```env
MONGODB_URI=mongodb://localhost:27017/viepropchain
IPFS_SERVICE_URL=http://localhost:4002
BLOCKCHAIN_SERVICE_URL=http://localhost:4004
PORT=4003
```

#### **services/blockchain-service/.env**

```env
GANACHE_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x...  # Lấy từ deployment-development.json
ADMIN_PRIVATE_KEY=0x...  # Private key của admin account trong Ganache
PORT=4004
```

**Lấy CONTRACT_ADDRESS:**

```powershell
cd ../..
node -p "JSON.parse(require('fs').readFileSync('deployment-development.json')).ViePropChainNFT"
```

**Lấy ADMIN_PRIVATE_KEY:**

- Mở Ganache UI
- Click vào account đầu tiên (index 0)
- Copy private key

#### **services/query-service/.env**

```env
MONGODB_URI=mongodb://localhost:27017/viepropchain
PORT=4005
```

#### **services/indexer-service/.env**

```env
MONGODB_URI=mongodb://localhost:27017/viepropchain
GANACHE_URL=http://127.0.0.1:8545
CONTRACT_ADDRESS=0x...  # Giống blockchain-service
POLL_INTERVAL=3000
```

---

## 2️⃣ CHẠY SERVICES

### Cách 1: Chạy TẤT CẢ services bằng 1 script (KHUYẾN NGHỊ)

```powershell
.\start-all-services.ps1
```

Script này sẽ:

- ✅ Check MongoDB đang chạy
- ✅ Check Ganache đang chạy
- ✅ Tự động tạo .env từ .env.example nếu chưa có
- ✅ Mở 7 terminal windows - mỗi service 1 cửa sổ
- ✅ Hiển thị logs realtime cho mỗi service

---

### Cách 2: Chạy TỪNG service riêng lẻ

**Terminal 1 - API Gateway:**

```powershell
cd services\api-gateway
npm start
```

**Terminal 2 - Auth Service:**

```powershell
cd services\auth-service
npm start
```

**Terminal 3 - IPFS Service:**

```powershell
cd services\ipfs-service
npm start
```

**Terminal 4 - Admin Service:**

```powershell
cd services\admin-service
npm start
```

**Terminal 5 - Blockchain Service:**

```powershell
cd services\blockchain-service
npm start
```

**Terminal 6 - Query Service:**

```powershell
cd services\query-service
npm start
```

**Terminal 7 - Indexer Service:**

```powershell
cd services\indexer-service
npm start
```

---

## 3️⃣ KIỂM TRA SERVICES HOẠT ĐỘNG

### Health check TẤT CẢ services:

```powershell
# API Gateway
curl http://localhost:4000/health

# Auth Service
curl http://localhost:4001/health

# IPFS Service
curl http://localhost:4002/health

# Admin Service
curl http://localhost:4003/health

# Blockchain Service
curl http://localhost:4004/health

# Query Service
curl http://localhost:4005/health
```

Tất cả phải trả về `"success": true`

---

## 4️⃣ TEST WORKFLOW HOÀN CHỈNH

### Bước 1: Sign-in với Ethereum

```powershell
# 1. Lấy nonce
curl -X POST http://localhost:4000/api/auth/get-nonce `
  -H "Content-Type: application/json" `
  -d '{"walletAddress":"0xYourWalletAddress"}'

# Output: {"nonce":"abc123..."}

# 2. Ký message bằng MetaMask
# Message: "Sign this message to authenticate with ViePropChain. Nonce: abc123..."

# 3. Verify signature
curl -X POST http://localhost:4000/api/auth/verify-signature `
  -H "Content-Type: application/json" `
  -d '{
    "walletAddress":"0xYourWalletAddress",
    "signature":"0x...",
    "nonce":"abc123..."
  }'

# Output: {"success":true, "token":"eyJhbGci..."}
```

---

### Bước 2: Tạo Property

```powershell
curl -X POST http://localhost:4000/api/admin/properties `
  -H "Content-Type: application/json" `
  -d '{
    "name": "Căn hộ Vinhomes Central Park",
    "description": "Căn hộ 2PN view sông Sài Gòn",
    "propertyType": "apartment",
    "location": {
      "address": "208 Nguyễn Hữu Cảnh",
      "ward": "Phường 22",
      "district": "Bình Thạnh",
      "city": "Hồ Chí Minh"
    },
    "price": {
      "amount": 5000000000,
      "currency": "VND"
    },
    "details": {
      "area": { "value": 85, "unit": "m2" },
      "bedrooms": 2,
      "bathrooms": 2,
      "floors": 1,
      "legalStatus": "Sổ hồng"
    }
  }'
```

Output: Property ID

---

### Bước 3: Upload hình ảnh lên IPFS

```powershell
curl -X POST http://localhost:4000/api/ipfs/upload/image `
  -F "file=@C:\path\to\property-image.jpg" `
  -F "propertyId=<property-id-from-step-2>"
```

Output: `{"cid":"Qm...","url":"https://gateway.pinata.cloud/ipfs/Qm..."}`

---

### Bước 4: Mint Property thành NFT (ĐIỀU PHỐI)

```powershell
curl -X POST http://localhost:4000/api/admin/properties/<property-id>/mint `
  -H "Content-Type: application/json" `
  -d '{
    "recipient":"0xRecipientWalletAddress"
  }'
```

**Quá trình diễn ra:**

1. Admin Service lấy thông tin property
2. Build metadata JSON
3. Gọi **IPFS Service** → Upload metadata lên Pinata
4. Gọi **Blockchain Service** → Mint NFT on Ganache
5. Cập nhật property trong MongoDB với NFT info
6. **Indexer Service** tự động detect Transfer event → Update NFT collection

Output:

```json
{
  "success": true,
  "data": {
    "tokenId": 1,
    "contractAddress": "0x...",
    "owner": "0x...",
    "transactionHash": "0x...",
    "metadataCID": "Qm..."
  }
}
```

---

### Bước 5: Query Properties

```powershell
# Tìm tất cả properties
curl "http://localhost:4000/api/query/properties?city=Hồ Chí Minh&propertyType=apartment"

# Lấy property detail
curl http://localhost:4000/api/query/properties/<property-id>

# Statistics
curl http://localhost:4000/api/query/stats/overview
```

---

## 5️⃣ KIẾN TRÚC MICROSERVICES

```
┌─────────────────┐
│  React Frontend │  Port 3000
│  (đã chạy)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Gateway    │  Port 4000  ← SINGLE ENTRY POINT
└────────┬────────┘
         │
         ├──────────► Auth Service (4001)         - Sign-in with Ethereum, JWT
         │
         ├──────────► IPFS Service (4002)         - Upload files to Pinata
         │
         ├──────────► Admin Service (4003)        - ĐIỀU PHỐI: Create property, coordinate minting
         │                    │
         │                    ├─► Call IPFS Service
         │                    └─► Call Blockchain Service
         │
         ├──────────► Blockchain Service (4004)   - Interact with smart contract
         │
         └──────────► Query Service (4005)        - Read-only queries

         ┌────────────────────┐
         │ Indexer Service    │  Worker (no port) - Listen blockchain events
         │ (Background)       │
         └────────────────────┘
```

---

## 6️⃣ XÓA OLD SERVICES

Khi tất cả services mới đã chạy OK:

```powershell
# Stop old services trước (đóng terminal đang chạy)

# Xóa folders
Remove-Item -Recurse -Force .\minting-service
Remove-Item -Recurse -Force .\property-service
```

---

## 🆘 TROUBLESHOOTING

### MongoDB không kết nối được

```powershell
# Check MongoDB service
Get-Service MongoDB

# Start MongoDB
net start MongoDB

# Hoặc chạy MongoDB bằng mongod
mongod --dbpath "C:\data\db"
```

### Ganache không chạy

- Mở Ganache UI
- Tạo workspace mới hoặc load workspace cũ
- Đảm bảo port 8545

### Port đã được sử dụng

```powershell
# Tìm process đang dùng port 4000
netstat -ano | findstr :4000

# Kill process
taskkill /PID <PID> /F
```

### IPFS upload lỗi 401

- Check Pinata JWT có đúng không
- Thử generate API key mới tại https://app.pinata.cloud/

### Contract address không đúng

```powershell
# Xem deployment info
cat deployment-development.json

# Nếu không có, re-deploy contract
cd ..\viepropchain
truffle migrate --reset --network development
```

---

## 📚 API DOCUMENTATION

Xem chi tiết tại: `README_MICROSERVICES.md`

---

## ✅ CHECKLIST

- [ ] MongoDB đang chạy
- [ ] Ganache đang chạy
- [ ] Contract đã deploy (có deployment-development.json)
- [ ] Pinata API keys đã cấu hình
- [ ] 7 services đã install dependencies (npm install)
- [ ] 7 file .env đã tạo và điền thông tin
- [ ] Start tất cả services (start-all-services.ps1)
- [ ] Health check tất cả services OK
- [ ] Test workflow: Create → Upload → Mint → Query

---

**🎉 DONE! Microservices architecture hoàn chỉnh!**
