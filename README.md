# 🏠 ViePropChain Database - Microservices Architecture

> Hệ thống quản lý bất động sản blockchain với kiến trúc microservices

## 📋 Tổng Quan

ViePropChain Database được thiết kế theo **kiến trúc microservices**, chia nhỏ các chức năng thành **8 services** độc lập:

1. **API Gateway** (4000) - Entry point duy nhất
2. **Auth Service** (4001) - Authentication với Sign-in with Ethereum
3. **IPFS Service** (4002) - Upload files lên IPFS/Pinata
4. **Admin Service** (4003) - **Orchestrator** điều phối property & minting
5. **Blockchain Service** (4004) - Tương tác smart contract
6. **Query Service** (4005) - Read-only queries
7. **User Service** (4006) - User profiles & additional info
8. **KYC Service** (4007) - Identity verification (simplified)
9. **Indexer Service** (Worker) - Lắng nghe blockchain events

---

## 🚀 Quick Start

### 1. Install dependencies

Cài đặt dependencies cho từng service:

```powershell
# Service chính đã restructure (MVC pattern)
cd services/admin-service && npm install
cd services/ipfs-service && npm install
cd services/user-service && npm install
cd services/kyc-service && npm install
```

### 2. Configure .env files

Các service đã được config sẵn MongoDB Atlas và Pinata. Kiểm tra các file .env:

- `services/admin-service/.env`
- `services/ipfs-service/.env`
- `services/user-service/.env`
- `services/kyc-service/.env`

### 3. Start services

Khởi động từng service trong terminal riêng:

```powershell
# Terminal 1 - Admin Service (Port 4003)
cd services/admin-service
npm start

# Terminal 2 - IPFS Service (Port 4002)
cd services/ipfs-service
npm start

# Terminal 3 - User Service (Port 4006)
cd services/user-service
npm start

# Terminal 4 - KYC Service (Port 4007)
cd services/kyc-service
npm start
```

### 4. Test services

```powershell
# Health checks
Invoke-RestMethod http://localhost:4003/health  # Admin
Invoke-RestMethod http://localhost:4002/health  # IPFS
Invoke-RestMethod http://localhost:4006/health  # User
Invoke-RestMethod http://localhost:4007/health  # KYC
```

---

## 🏗️ Kiến Trúc

```
Frontend (React - Port 3000)
          ↓
API Gateway (Port 4000)
          ↓
    ┌─────┴──────┬──────────┬───────────┬────────────┬──────────┬──────────┐
    ↓            ↓          ↓           ↓            ↓          ↓          ↓
Auth (4001)  IPFS (4002)  Admin (4003)  Blockchain  Query    User (4006) KYC (4007)
                             ↓          (4004)      (4005)       ↓          ↓
                       Orchestrator                           Profiles   Verified
                       ├─► IPFS                                  ↑          │
                       └─► Blockchain                            └──────────┘
                                                            (KYC updates User)
Background: Indexer Service (Worker)
```

**✅ Services đã hoàn thành (MVC Pattern):**

- ✅ Admin Service (Port 4003) - Property management + NFT minting orchestration
- ✅ IPFS Service (Port 4002) - File uploads to Pinata
- ✅ User Service (Port 4006) - User profiles & additional info
- ✅ KYC Service (Port 4007) - Identity verification (auto-verify)

---

## 📁 Cấu Trúc Thư Mục

```
database_viepropchain_microservice/
├── services/                    # Microservices
│   ├── admin-service/          # ✅ Port 4003 - Orchestrator (MVC)
│   │   ├── src/
│   │   │   ├── models/         # Property, NFT, Transaction
│   │   │   ├── services/       # propertyService, orchestratorService
│   │   │   ├── controllers/    # propertyController
│   │   │   ├── routes/         # propertyRoutes
│   │   │   ├── config/         # database
│   │   │   └── index.js
│   │   ├── .env
│   │   └── package.json
│   │
│   ├── ipfs-service/           # ✅ Port 4002 - File storage (MVC)
│   │   ├── src/
│   │   │   ├── models/         # IPFSMetadata
│   │   │   ├── services/       # pinataService, metadataService
│   │   │   ├── controllers/    # uploadController
│   │   │   ├── routes/         # uploadRoutes
│   │   │   ├── config/         # database, pinata
│   │   │   └── index.js
│   │   ├── .env
│   │   └── package.json
│   │
│   ├── user-service/           # ✅ Port 4006 - User profiles (MVC)
│   │   ├── src/
│   │   │   ├── models/         # User (UserProfile)
│   │   │   ├── services/       # userProfileService
│   │   │   ├── controllers/    # userProfileController
│   │   │   ├── routers/        # userRoutes
│   │   │   ├── config/         # database
│   │   │   └── index.js
│   │   ├── .env
│   │   └── package.json
│   │
│   ├── kyc-service/            # ✅ Port 4007 - KYC verification (MVC)
│   │   ├── src/
│   │   │   ├── models/         # KYC (simplified)
│   │   │   ├── services/       # kycService
│   │   │   ├── controllers/    # kycController
│   │   │   ├── routers/        # kycRoutes
│   │   │   ├── config/         # database, services
│   │   │   └── index.js
│   │   ├── .env
│   │   └── package.json
│   │
│   ├── api-gateway/            # Port 4000 - Entry point (TODO)
│   ├── auth-service/           # Port 4001 - Authentication (TODO)
│   ├── blockchain-service/     # Port 4004 - Smart contract (TODO)
│   ├── query-service/          # Port 4005 - Read queries (TODO)
│   └── indexer-service/        # Worker - Event listener (TODO)
│
├── shared/                      # Deprecated - Models now in each service
├── ViePropChain_Microservices_Tests.postman_collection.json
└── database-schema.js          # Schema documentation
```

---

## 🔑 Workflow Chính

### Tạo Property và Mint NFT:

```
1. Frontend → API Gateway → Admin Service
2. Admin Service: Create property trong MongoDB
3. Admin Service → IPFS Service: Upload metadata
4. Admin Service → Blockchain Service: Mint NFT
5. Admin Service: Update property với NFT info
6. Indexer Service: Detect Transfer event → Update MongoDB
```

**Pattern:** Admin Service **ĐIỀU PHỐI**, IPFS và Blockchain là **CHUYÊN BIỆT**

---

## 📚 Tài Liệu

- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Hướng dẫn cài đặt từng bước
- **[POSTMAN_TEST_GUIDE.md](POSTMAN_TEST_GUIDE.md)** - Test workflow với Postman
- **[README_MICROSERVICES.md](README_MICROSERVICES.md)** - API documentation chi tiết
- **[COMPLETION_REPORT.md](COMPLETION_REPORT.md)** - Báo cáo kiến trúc đầy đủ
- **[database-schema.js](database-schema.js)** - MongoDB schema

---

## 🔧 Yêu Cầu Hệ Thống

- Node.js v18+
- MongoDB v6.0+
- Ganache (Local blockchain)
- Pinata API keys (free tier)

---

## 📊 MongoDB Collections

Mỗi service có models riêng (không còn shared/models):

**Admin Service:**

1. **properties** - Property listings & NFT info
2. **nfts** - On-chain NFT data & transfer history
3. **transactions** - Blockchain transactions log

**IPFS Service:** 4. **ipfsmetadatas** - IPFS uploads cache

**User Service:** 5. **userprofiles** - User profiles & additional info

- Basic info, contact, profile, preferences
- KYC status integration
- User type, status, stats

**KYC Service:** 6. **kycs** - KYC verification records (simplified)

- walletAddress, fullName, idNumber
- status: "verified" (auto)
- Notifies User Service after verification

---

## 🧪 Testing

### Health Check services đang chạy:

```powershell
Invoke-RestMethod http://localhost:4003/health  # Admin Service ✅
Invoke-RestMethod http://localhost:4002/health  # IPFS Service ✅
Invoke-RestMethod http://localhost:4006/health  # User Service ✅
Invoke-RestMethod http://localhost:4007/health  # KYC Service ✅
```

### Test KYC Flow:

```powershell
# 1. Submit KYC (auto-verify)
$body = @{
  walletAddress = "0x1234567890123456789012345678901234567890"
  fullName = "Nguyen Van A"
  idNumber = "123456789012"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4007/kyc" `
  -Method POST -Body $body -ContentType "application/json"

# 2. Get KYC info
Invoke-RestMethod "http://localhost:4007/kyc/0x1234567890123456789012345678901234567890"

# 3. Check User Profile (KYC status updated)
Invoke-RestMethod "http://localhost:4006/profiles/0x1234567890123456789012345678901234567890"
```

### Test Property Flow:

```powershell
# Get all properties
Invoke-RestMethod "http://localhost:4003/properties"

# Get property statistics
Invoke-RestMethod "http://localhost:4003/properties/stats/overview"
```

---

## 🎯 API Endpoints Chính

### Admin Service (Port 4003) ✅

- `POST /properties` - Tạo property
- `GET /properties` - List properties
- `GET /properties/:id` - Get property detail
- `PUT /properties/:id` - Update property
- `DELETE /properties/:id` - Archive property
- **`POST /properties/:id/mint`** - **Mint property thành NFT** (ĐIỀU PHỐI)
- `GET /properties/stats/overview` - Get statistics

### IPFS Service (Port 4002) ✅

- `POST /upload/image` - Upload image
- `POST /upload/document` - Upload document
- `POST /upload/metadata` - Upload NFT metadata JSON
- `GET /content/:cid` - Get content by CID

### User Service (Port 4006) ✅

- `POST /profiles` - Get or create user profile
- `GET /profiles/:walletAddress` - Get profile
- `PUT /profiles/:walletAddress/basic-info` - Update basic info
- `PUT /profiles/:walletAddress/contact-info` - Update contact info
- `PUT /profiles/:walletAddress/profile` - Update profile
- `PUT /profiles/:walletAddress/preferences` - Update preferences
- `PUT /profiles/:walletAddress/kyc-status` - Update KYC (internal)
- `GET /users/search` - Search users
- `GET /users/statistics` - Get statistics

### KYC Service (Port 4007) ✅

- `POST /kyc` - Submit KYC (auto-verify)
  - Body: `{walletAddress, fullName, idNumber}`
  - Response: Auto verified + notify User Service
- `GET /kyc/:walletAddress` - Get KYC info
- `GET /kyc/:walletAddress/verified` - Check if verified
- `GET /verified/all` - Get all verified users
- `GET /statistics` - Get KYC statistics

---

## 🐛 Troubleshooting

### MongoDB không kết nối

```powershell
net start MongoDB
```

### Ganache không chạy

Mở Ganache UI → Start workspace

### Port đã được sử dụng

```powershell
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

---

## 📝 License

MIT

---

## 👥 Contributors

ViePropChain Team
