# GIẢI THÍCH MINTING SERVICE - LUỒNG HOẠT ĐỘNG

## 📋 TỔNG QUAN

**Minting Service** là microservice chịu trách nhiệm:

1. **Mint NFT** lên blockchain (Ganache)
2. **Lưu thông tin NFT** vào MongoDB
3. **Lắng nghe sự kiện Transfer** từ blockchain để cập nhật owner
4. **Quản lý metadata** trên IPFS

---

## 🔄 LUỒNG HOẠT ĐỘNG CHÍNH

### **BƯỚC 1: KHỞI ĐỘNG SERVICE**

📄 File: `index.js`

```
START
  ↓
Load .env (cấu hình)
  ↓
Khởi tạo Express Server (PORT 3002)
  ↓
Kết nối MongoDB
  ↓
Khởi động Event Listener
  ↓
Server sẵn sàng nhận request
```

**Chức năng:**

- ✅ Kết nối database MongoDB
- ✅ Khởi động API server
- ✅ Bật event listener để theo dõi blockchain
- ✅ Expose 5 endpoints REST API

---

### **BƯỚC 2: NHẬN REQUEST MINT NFT**

📄 File: `index.js` → Endpoint `POST /mint`

**Input nhận được:**

```json
{
  "recipient": "0x...", // Địa chỉ ví nhận NFT
  "tokenURI": "ipfs://QmXXX..." // URI metadata trên IPFS
}
```

**Hoặc (cách cũ):**

```json
{
  "recipient": "0x...",
  "name": "Villa Sài Gòn",
  "description": "...",
  "image": "...",
  "attributes": [...]
}
```

**Luồng xử lý:**

1. Kiểm tra recipient có hợp lệ không
2. Kiểm tra tokenURI hoặc metadata
3. Gọi `mintNFT()` từ `blockchainService.js`

---

### **BƯỚC 3: XỬ LÝ MINT NFT**

📄 File: `blockchainService.js` → Function `mintNFT()`

#### 3.1. Xử lý Metadata

```
Nhận tokenURI hoặc metadata object
  ↓
Nếu là metadata object (OLD FLOW):
  ├─ Tạo JSON metadata
  ├─ Upload lên IPFS (gọi ipfsService)
  └─ Nhận ipfsHash

Nếu là tokenURI string (NEW FLOW):
  └─ Dùng trực tiếp tokenURI
```

#### 3.2. Gọi Smart Contract

```
Khởi tạo kết nối Blockchain
  ↓
Provider: JsonRpcProvider → Ganache
  ↓
Signer: Wallet với private key (admin)
  ↓
Contract: ViePropChainNFT với ABI
  ↓
Gọi: nftContract.mint(recipient, tokenURI)
  ↓
Chờ transaction xác nhận (tx.wait())
  ↓
Lấy tokenId từ Transfer event
```

**Chi tiết lấy Token ID:**

- **Cách 1:** Parse event "Transfer" từ receipt.logs
- **Cách 2:** Gọi `tokenCounter()` từ contract
- **Cách 3:** Parse raw logs với Transfer signature
- **Fallback:** Dùng timestamp

#### 3.3. Lưu vào MongoDB

```
Tạo object NFT với 3 lớp dữ liệu:
  ↓
1. BLOCKCHAIN DATA
   - tokenId
   - contractAddress
   - owner
   - tokenURI
   - transactionHash
  ↓
2. IPFS METADATA
   - metadata { name, description, image, attributes }
   - ipfsHash
  ↓
3. APPLICATION DATA
   - status: "NOT_FOR_SALE"
   - listingPrice: 0
   - viewCount: 0
   - transactionHistory: [MINT event]
  ↓
Lưu vào collection "NFT"
  ↓
Return { success: true, tokenId, transactionHash, tokenURI }
```

---

### **BƯỚC 4: UPLOAD METADATA LÊN IPFS**

📄 File: `ipfsService.js` → Function `uploadToIPFS()`

**Chỉ chạy khi dùng OLD FLOW (metadata object)**

```
Nhận metadata JSON
  ↓
Gọi Pinata API:
  POST https://api.pinata.cloud/pinning/pinJSONToIPFS
  Header: Authorization Bearer JWT
  Body: metadata JSON
  ↓
Nhận ipfsHash (VD: "QmXXX...")
  ↓
Return ipfsHash
```

**Credentials cần thiết (trong .env):**

- `PINATA_API_KEY`
- `PINATA_API_SECRET`
- `PINATA_JWT`

---

### **BƯỚC 5: LẮNG NGHE SỰ KIỆN TRANSFER**

📄 File: `eventListener.js`

#### 5.1. Khởi động Listener

```
Function: startEventListener()
  ↓
Kết nối Provider → Ganache
  ↓
Load Contract ABI
  ↓
Khởi tạo Contract instance
  ↓
Lấy block hiện tại (lastCheckedBlock)
  ↓
Bật Polling (mỗi 3 giây)
```

#### 5.2. Polling Loop

```
Mỗi 3 giây:
  ↓
Kiểm tra block mới
  ↓
Nếu có block mới:
  ├─ Query Transfer events từ lastCheckedBlock → currentBlock
  ├─ Với mỗi event Transfer:
  │   ├─ Lấy: from, to, tokenId, transactionHash
  │   ├─ Bỏ qua nếu from = 0x000... (MINT event)
  │   └─ Gọi updateNFTOwner()
  └─ Cập nhật lastCheckedBlock
```

#### 5.3. Cập nhật Owner

```
Function: updateNFTOwner(tokenId, from, to, txHash)
  ↓
Tìm NFT trong MongoDB
  ↓
Kiểm tra owner có thay đổi không
  ↓
Nếu có:
  ├─ Cập nhật nft.owner = to
  ├─ Thêm vào transactionHistory:
  │   {
  │     type: "TRANSFER",
  │     from: from,
  │     to: to,
  │     transactionHash: txHash,
  │     timestamp: new Date()
  │   }
  └─ Lưu vào database
```

---

## 📊 CẤU TRÚC DỮ LIỆU NFT

📄 File: `nftModel.js`

### Schema MongoDB (3 lớp):

```javascript
NFT = {
  // 1. BLOCKCHAIN DATA (từ on-chain)
  tokenId: "1",
  contractAddress: "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
  owner: "0x123...",
  tokenURI: "ipfs://QmXXX...",
  transactionHash: "0xabc...",

  // 2. IPFS METADATA (từ IPFS)
  metadata: {
    name: "Villa Sài Gòn",
    description: "Biệt thự cao cấp...",
    image: "ipfs://QmYYY...",
    attributes: [
      { trait_type: "Location", value: "Saigon" },
      { trait_type: "Area", value: "200m2" }
    ]
  },
  ipfsHash: "QmXXX...",

  // 3. APPLICATION DATA (ứng dụng)
  status: "NOT_FOR_SALE",  // hoặc FOR_SALE, IN_TRANSACTION, SOLD
  listingPrice: { amount: 5000000000, currency: "VND" },
  viewCount: 150,
  favoriteCount: 25,
  transactionHistory: [
    { type: "MINT", from: "0x000...", to: "0x123...", ... },
    { type: "TRANSFER", from: "0x123...", to: "0x456...", ... }
  ],
  isBurned: false,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔌 CÁC API ENDPOINTS

### 1. **POST /mint** - Mint NFT mới

```bash
POST http://localhost:3002/mint
Body: { recipient, tokenURI } hoặc { recipient, name, description, ... }
Response: { success, tokenId, transactionHash, tokenURI }
```

### 2. **GET /nft/:tokenId** - Lấy thông tin 1 NFT

```bash
GET http://localhost:3002/nft/1
Response: { success, data: { NFT object } }
```

### 3. **GET /nfts/:owner** - Lấy tất cả NFT của 1 owner

```bash
GET http://localhost:3002/nfts/0x123...
Response: { success, count, data: [ NFT objects ] }
```

### 4. **GET /nfts** - Lấy tất cả NFT

```bash
GET http://localhost:3002/nfts
Response: { success, count, data: [ NFT objects ] }
```

---

## ⚙️ CẤU HÌNH QUAN TRỌNG (.env)

```properties
PORT=3002                          # Cổng service chạy
RPC_URL=http://127.0.0.1:8545     # Ganache RPC
CONTRACT_OWNER_PRIVATE_KEY=0x...  # Private key admin (mint NFT)
NFT_CONTRACT_ADDRESS=0x52B42...   # Địa chỉ contract đã deploy
MONGO_URI=mongodb+srv://...       # MongoDB connection
PINATA_JWT=eyJ...                 # JWT token Pinata IPFS
```

---

## 🎯 DEPENDENCIES CHÍNH

📄 File: `package.json`

- **ethers** (v6.15.0): Tương tác blockchain
- **express** (v5.1.0): API server
- **mongoose** (v8.8.4): MongoDB ORM
- **axios** (v1.12.2): HTTP client (gọi Pinata)
- **cors**: Enable CORS
- **dotenv**: Load biến môi trường

---

## 🔥 LUỒNG ĐẦY ĐỦ (END-TO-END)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. CLIENT/PROPERTY-SERVICE gửi POST /mint                      │
│     { recipient, tokenURI }                                     │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. index.js nhận request                                       │
│     → Gọi blockchainService.mintNFT(recipient, tokenURI)        │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. blockchainService.js                                        │
│     a. Nếu cần: Upload metadata → IPFS (ipfsService)            │
│     b. Gọi smart contract: nftContract.mint(recipient, tokenURI)│
│     c. Đợi transaction confirm                                  │
│     d. Lấy tokenId từ event                                     │
│     e. Lưu NFT vào MongoDB (nftModel)                           │
│     f. Return { success, tokenId, txHash }                      │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Response trả về client                                      │
│     { success: true, tokenId: "1", transactionHash: "0x..." }  │
└─────────────────────────────────────────────────────────────────┘

        ┌────────────────────────────────────────────────┐
        │  ĐỒNG THỜI: eventListener chạy background      │
        ├────────────────────────────────────────────────┤
        │  - Polling mỗi 3 giây                          │
        │  - Phát hiện Transfer event                    │
        │  - Cập nhật owner trong MongoDB                │
        │  - Ghi vào transactionHistory                  │
        └────────────────────────────────────────────────┘
```

---

## 📁 CÁC FILE QUAN TRỌNG NHẤT

### ⭐⭐⭐ QUAN TRỌNG NHẤT (Core):

1. **`index.js`**

   - Entry point của service
   - Khởi tạo server, database, event listener
   - Định nghĩa tất cả API endpoints

2. **`blockchainService.js`**

   - Logic mint NFT lên blockchain
   - Tương tác với smart contract
   - Lưu dữ liệu vào MongoDB

3. **`eventListener.js`**
   - Lắng nghe sự kiện Transfer từ blockchain
   - Cập nhật owner khi NFT được chuyển
   - Ghi lịch sử giao dịch

### ⭐⭐ QUAN TRỌNG (Supporting):

4. **`nftModel.js`**

   - Định nghĩa schema MongoDB cho NFT
   - Cấu trúc 3 lớp dữ liệu

5. **`.env`**
   - Cấu hình toàn bộ service
   - Credentials blockchain, MongoDB, IPFS

### ⭐ HỖ TRỢ (Helper):

6. **`ipfsService.js`**

   - Upload metadata lên IPFS (Pinata)
   - Chỉ dùng trong OLD FLOW

7. **`contract-abi.json`**

   - ABI của smart contract ViePropChainNFT
   - Cần để gọi các function từ contract

8. **`package.json`**
   - Danh sách dependencies
   - Scripts chạy service

---

## 🚀 CÁCH CHẠY SERVICE

```bash
# 1. Cài đặt dependencies
npm install

# 2. Đảm bảo .env đã được cấu hình đúng
#    - Ganache đang chạy
#    - MongoDB đã kết nối
#    - Contract đã deploy

# 3. Chạy service
npm start

# hoặc
node index.js
```

**Kết quả:**

```
✅ Connected to MongoDB
✅ Blockchain service initialized successfully
🎧 Bắt đầu lắng nghe sự kiện Transfer từ blockchain...
✅ Đã kết nối với contract: 0x52B42Ac0e051A4c3386791b04391510C3cE06632
📦 Bắt đầu từ block: 42
🔄 Sử dụng polling để theo dõi Transfer events (mỗi 3 giây)...
✅ Minting Service API đang chạy tại http://localhost:3002
```

---

## 🔍 TROUBLESHOOTING

### Lỗi thường gặp:

1. **MongoDB connection error**

   - Kiểm tra MONGO_URI trong .env
   - Đảm bảo mật khẩu được encode đúng (%40 cho @)

2. **Blockchain connection error**

   - Đảm bảo Ganache đang chạy
   - Kiểm tra RPC_URL

3. **Contract call failed**

   - Kiểm tra NFT_CONTRACT_ADDRESS
   - Kiểm tra CONTRACT_OWNER_PRIVATE_KEY có đúng không
   - Đảm bảo account có đủ ETH

4. **IPFS upload failed**
   - Kiểm tra PINATA_JWT
   - Service vẫn chạy được với fallback URL

---

## 📝 TÓM TẮT

**Minting Service = 3 chức năng chính:**

1. **🔨 MINT NFT**

   - Nhận request từ API
   - Mint lên blockchain
   - Lưu vào MongoDB

2. **👂 LẮNG NGHE BLOCKCHAIN**

   - Polling events mỗi 3 giây
   - Phát hiện Transfer
   - Cập nhật owner

3. **📡 CUNG CẤP API**
   - Query thông tin NFT
   - Query NFT theo owner
   - Query tất cả NFT

**Luồng xử lý đơn giản:**

```
Request → index.js → blockchainService → Blockchain + MongoDB → Response
                                ↓
                         eventListener (background)
                                ↓
                         Cập nhật owner khi transfer
```
