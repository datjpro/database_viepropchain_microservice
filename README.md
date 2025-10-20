# 🏠 ViePropChain Database - Microservices Architecture

> Hệ thống quản lý bất động sản blockchain với kiến trúc microservices

## 📋 Tổng Quan

ViePropChain Database được thiết kế theo **kiến trúc microservices**, chia nhỏ các chức năng thành 7 services độc lập:

1. **API Gateway** (4000) - Entry point duy nhất
2. **Auth Service** (4001) - Authentication với Sign-in with Ethereum
3. **IPFS Service** (4002) - Upload files lên IPFS/Pinata
4. **Admin Service** (4003) - **Orchestrator** điều phối property & minting
5. **Blockchain Service** (4004) - Tương tác smart contract
6. **Query Service** (4005) - Read-only queries
7. **Indexer Service** (Worker) - Lắng nghe blockchain events

---

## 🚀 Quick Start

### 1. Install dependencies

```powershell
.\install-all.ps1
```

### 2. Configure .env files

Xem hướng dẫn chi tiết trong **[SETUP_GUIDE.md](SETUP_GUIDE.md)**

### 3. Start services

```powershell
.\start-all-services.ps1
```

### 4. Test với Postman

Import file **`ViePropChain_Microservices_Tests.postman_collection.json`**

Xem hướng dẫn test chi tiết trong **[POSTMAN_TEST_GUIDE.md](POSTMAN_TEST_GUIDE.md)**

---

## 🏗️ Kiến Trúc

```
Frontend (React - Port 3000)
          ↓
API Gateway (Port 4000)
          ↓
    ┌─────┴──────┬──────────┬───────────┬────────────┐
    ↓            ↓          ↓           ↓            ↓
Auth (4001)  IPFS (4002)  Admin (4003)  Blockchain  Query
                             ↓          (4004)      (4005)
                       Orchestrator
                       ├─► IPFS
                       └─► Blockchain

Background: Indexer Service (Worker)
```

---

## 📁 Cấu Trúc Thư Mục

```
database_viepropchain_microservice/
├── services/                    # 7 microservices
│   ├── api-gateway/            # Port 4000 - Entry point
│   ├── auth-service/           # Port 4001 - Authentication
│   ├── ipfs-service/           # Port 4002 - File storage
│   ├── admin-service/          # Port 4003 - Orchestrator
│   ├── blockchain-service/     # Port 4004 - Smart contract
│   ├── query-service/          # Port 4005 - Read queries
│   └── indexer-service/        # Worker - Event listener
│
├── shared/                      # Shared code
│   └── models/                 # MongoDB models (6 collections)
│
├── ViePropChain_Microservices_Tests.postman_collection.json
├── SETUP_GUIDE.md              # Setup hướng dẫn chi tiết
├── POSTMAN_TEST_GUIDE.md       # Test guide
├── COMPLETION_REPORT.md        # Báo cáo hoàn thành
├── README_MICROSERVICES.md     # API documentation
├── database-schema.js          # Schema documentation
├── install-all.ps1             # Install script
└── start-all-services.ps1      # Startup script
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

1. **users** - User accounts & authentication
2. **properties** - Property listings & NFT info
3. **nfts** - On-chain NFT data & transfer history
4. **transactions** - Blockchain transactions log
5. **ipfs_metadata** - IPFS uploads cache
6. **marketplace** - Marketplace listings (future)
7. **analytics** - User analytics & tracking

---

## 🧪 Testing

### Health Check tất cả services:

```powershell
curl http://localhost:4000/health  # API Gateway
curl http://localhost:4001/health  # Auth Service
curl http://localhost:4002/health  # IPFS Service
curl http://localhost:4003/health  # Admin Service
curl http://localhost:4004/health  # Blockchain Service
curl http://localhost:4005/health  # Query Service
```

### Test workflow hoàn chỉnh:

Xem **[POSTMAN_TEST_GUIDE.md](POSTMAN_TEST_GUIDE.md)**

---

## 🎯 API Endpoints Chính

### Admin Service (Port 4003)

- `POST /properties` - Tạo property
- `GET /properties` - List properties
- `PUT /properties/:id` - Update property
- **`POST /properties/:id/mint`** - **Mint property thành NFT** (ĐIỀU PHỐI)

### IPFS Service (Port 4002)

- `POST /upload/image` - Upload image
- `POST /upload/document` - Upload document
- `POST /upload/metadata` - Upload NFT metadata

### Blockchain Service (Port 4004)

- `POST /mint` - Mint NFT on-chain
- `GET /nft/:tokenId` - Get NFT info
- `POST /transfer` - Transfer NFT

### Query Service (Port 4005)

- `GET /properties` - Search properties (with filters)
- `GET /properties/:id` - Property detail
- `GET /stats/overview` - Statistics

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
