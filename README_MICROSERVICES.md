# 🏗️ ViePropChain Microservices Architecture

Hệ thống quản lý bất động sản NFT với kiến trúc microservices.

## 📐 Kiến trúc tổng quan

```
Frontend (React - Port 3000)
      ↓
API Gateway (Port 4000)
      ↓
┌─────────────────────────────────────────────────────────────┐
│  Auth Service (4001)      - Sign-in with Ethereum          │
│  IPFS Service (4002)      - Upload files to IPFS/Pinata    │
│  Admin Service (4003)     - CRUD properties, mint NFT       │
│  Blockchain Service (4004) - Interact with Smart Contract   │
│  Indexer Service (Worker) - Listen blockchain events 24/7  │
│  Query Service (4005)     - Read-only queries              │
└─────────────────────────────────────────────────────────────┘
      ↓
MongoDB + Blockchain (Ganache Port 8545)
```

## 🚀 Setup và Chạy

### 1. Cài đặt dependencies

```bash
# Shared models
cd shared/models
npm install

# API Gateway
cd services/api-gateway
npm install

# Auth Service
cd services/auth-service
npm install

# IPFS Service
cd services/ipfs-service
npm install

# Admin Service
cd services/admin-service
npm install

# Blockchain Service
cd services/blockchain-service
npm install

# Indexer Service
cd services/indexer-service
npm install

# Query Service
cd services/query-service
npm install
```

### 2. Config .env cho mỗi service

Mỗi service cần file `.env` riêng (xem `.env.example` trong mỗi folder)

### 3. Chạy các services (7 terminals)

**Terminal 1 - Ganache:**
```bash
cd d:\DACN\RE-Chain\viepropchain
ganache -m "arm either chef prosper fish lonely rigid antique dawn stumble wife camera" --database.dbPath "./ganache-data-dev" --chain.networkId 1337 --server.port 8545
```

**Terminal 2 - API Gateway:**
```bash
cd services/api-gateway
npm start
```

**Terminal 3 - Auth Service:**
```bash
cd services/auth-service
npm start
```

**Terminal 4 - IPFS Service:**
```bash
cd services/ipfs-service
npm start
```

**Terminal 5 - Admin Service:**
```bash
cd services/admin-service
npm start
```

**Terminal 6 - Blockchain Service:**
```bash
cd services/blockchain-service
npm start
```

**Terminal 7 - Indexer Service:**
```bash
cd services/indexer-service
npm start
```

**Terminal 8 - Query Service:**
```bash
cd services/query-service
npm start
```

## 📡 API Endpoints

### Via API Gateway (http://localhost:4000)

#### Auth Service
- `POST /api/auth/get-nonce` - Lấy nonce để ký
- `POST /api/auth/verify-signature` - Verify signature và login
- `GET /api/auth/profile` - Lấy profile
- `PUT /api/auth/profile` - Cập nhật profile

#### IPFS Service
- `POST /api/ipfs/upload/image` - Upload ảnh
- `POST /api/ipfs/upload/document` - Upload document
- `POST /api/ipfs/upload/metadata` - Upload metadata JSON

#### Admin Service
- `POST /api/admin/properties` - Tạo property
- `GET /api/admin/properties` - Lấy danh sách properties
- `GET /api/admin/properties/:id` - Lấy chi tiết property
- `PUT /api/admin/properties/:id` - Cập nhật property
- `DELETE /api/admin/properties/:id` - Xóa property
- `POST /api/admin/properties/:id/mint` - Mint NFT

#### Blockchain Service
- `POST /api/blockchain/mint` - Mint NFT
- `GET /api/blockchain/nft/:tokenId` - Get NFT info
- `POST /api/blockchain/transfer` - Transfer NFT

#### Query Service (Public)
- `GET /api/query/properties` - Browse properties (có filter, pagination)
- `GET /api/query/properties/:id` - Get chi tiết property
- `GET /api/query/stats` - Thống kê
- `POST /api/query/properties/:id/view` - Increment view count

## 🔄 Data Flow

### 1. Admin tạo property và mint NFT

```
1. Admin login → Auth Service verify signature → JWT token
2. Admin upload images → IPFS Service → CIDs
3. Admin tạo property → Admin Service → MongoDB
4. Admin mint NFT:
   Admin Service → IPFS Service (upload metadata)
                 → Blockchain Service (mint NFT)
                 → Update MongoDB
5. Indexer Service catch Transfer event → Update MongoDB
```

### 2. User browse properties

```
1. User request properties → Query Service
2. Query Service query MongoDB (cached data)
3. Return results (fast, không cần gọi IPFS)
```

### 3. NFT transfer

```
1. User transfer NFT (từ wallet trực tiếp)
2. Smart Contract emit Transfer event
3. Indexer Service catch event → Update MongoDB
   - Update NFT owner
   - Update Property owner
   - Create Transaction record
```

## 📊 Database Collections

- **users** - User accounts & wallets
- **properties** - Properties (off-chain data)
- **nfts** - NFTs (on-chain data synced)
- **transactions** - Blockchain transactions
- **ipfs_metadata** - IPFS content cache
- **analytics** - Views, favorites, shares

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Blockchain**: Ethereum (ethers.js v6), Ganache
- **Storage**: IPFS (Pinata)
- **Auth**: JWT, Sign-in with Ethereum

## 📝 Nguyên tắc

✅ **Separation of Concerns**: Mỗi service có nhiệm vụ rõ ràng
✅ **Single Source of Truth**: Blockchain cho ownership, MongoDB cho mutable data
✅ **Cache Strategy**: Cache IPFS metadata trong MongoDB
✅ **Event-Driven**: Indexer sync blockchain events real-time
✅ **Read-Write Separation**: Query Service chỉ đọc, Admin Service ghi

## 🔐 Security

- Chỉ Blockchain Service có private key
- JWT authentication cho mọi protected endpoints
- CORS configured cho Frontend origin
- Input validation trên tất cả endpoints

## 📄 License

MIT
