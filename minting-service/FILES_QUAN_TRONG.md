# 📌 CÁC FILE QUAN TRỌNG NHẤT - MINTING SERVICE

## 🌟 TOP 3 FILE CORE (BẮT BUỘC PHẢI HIỂU)

### 1. **index.js** ⭐⭐⭐

**Vai trò:** Entry point - Điểm bắt đầu của toàn bộ service

**Chức năng chính:**

- ✅ Khởi động Express server (port 3002)
- ✅ Kết nối MongoDB
- ✅ Khởi động Event Listener
- ✅ Định nghĩa 4 API endpoints:
  - `POST /mint` - Mint NFT mới
  - `GET /nft/:tokenId` - Lấy thông tin 1 NFT
  - `GET /nfts/:owner` - Lấy NFT theo owner
  - `GET /nfts` - Lấy tất cả NFT

**Flow:**

```
START → Load .env → Init Express → Connect MongoDB → Start Event Listener → Ready
```

**Khi nào cần đọc/sửa:**

- Muốn thêm endpoint API mới
- Thay đổi port hoặc cấu hình server
- Debug lỗi khởi động service

---

### 2. **blockchainService.js** ⭐⭐⭐

**Vai trò:** Xử lý tất cả logic liên quan đến blockchain

**Chức năng chính:**

- ✅ Kết nối với Ganache blockchain
- ✅ Tương tác với Smart Contract (ViePropChainNFT)
- ✅ Mint NFT lên blockchain
- ✅ Lấy tokenId từ transaction
- ✅ Lưu thông tin NFT vào MongoDB

**Flow mint NFT:**

```
Nhận request
  → Xử lý metadata/tokenURI
  → (Optional) Upload IPFS
  → Call contract.mint()
  → Wait transaction
  → Get tokenId
  → Save to MongoDB
  → Return response
```

**Dependencies:**

- `ethers`: Tương tác blockchain
- `nftModel`: Schema MongoDB
- `ipfsService`: Upload IPFS (nếu cần)

**Khi nào cần đọc/sửa:**

- Thay đổi logic mint NFT
- Sửa cách lấy tokenId
- Thêm field mới vào NFT data
- Debug lỗi mint hoặc save database

---

### 3. **eventListener.js** ⭐⭐⭐

**Vai trò:** Lắng nghe và xử lý sự kiện Transfer từ blockchain

**Chức năng chính:**

- ✅ Polling blockchain mỗi 3 giây
- ✅ Phát hiện Transfer events
- ✅ Cập nhật owner trong MongoDB khi NFT được chuyển
- ✅ Ghi lịch sử giao dịch (transactionHistory)

**Flow:**

```
Start Listener
  → Connect to blockchain
  → Get current block
  → START POLLING LOOP:
      ├─ Check new blocks
      ├─ Query Transfer events
      ├─ For each event:
      │   ├─ Skip if MINT (from = 0x000...)
      │   └─ Update owner in MongoDB
      └─ Update lastCheckedBlock
```

**Hàm quan trọng:**

- `startEventListener()`: Bật listener
- `startPolling()`: Loop kiểm tra events
- `updateNFTOwner()`: Cập nhật owner trong DB
- `stopEventListener()`: Tắt listener

**Khi nào cần đọc/sửa:**

- NFT không tự động cập nhật owner
- Muốn thay đổi tần suất polling (hiện tại: 3s)
- Thêm logic xử lý event khác (không chỉ Transfer)
- Debug lỗi event listener

---

## 📊 CÁC FILE HỖ TRỢ QUAN TRỌNG

### 4. **nftModel.js** ⭐⭐

**Vai trò:** Định nghĩa schema MongoDB cho NFT

**Cấu trúc 3 lớp:**

```javascript
{
  // 1. BLOCKCHAIN DATA
  tokenId, contractAddress, owner, tokenURI, transactionHash,

  // 2. IPFS METADATA
  metadata { name, description, image, attributes },
  ipfsHash,

  // 3. APPLICATION DATA
  status, listingPrice, viewCount, favoriteCount,
  transactionHistory, isBurned, createdAt, updatedAt
}
```

**Khi nào cần đọc/sửa:**

- Thêm field mới vào NFT
- Thay đổi validation rules
- Thêm indexes cho query nhanh hơn

---

### 5. **.env** ⭐⭐

**Vai trò:** Lưu tất cả cấu hình và credentials

**Các biến quan trọng:**

```properties
PORT=3002                          # Port service chạy
RPC_URL=http://127.0.0.1:8545     # Ganache blockchain
CONTRACT_OWNER_PRIVATE_KEY=0x...  # Private key admin
NFT_CONTRACT_ADDRESS=0x...        # Contract address
MONGO_URI=mongodb+srv://...       # MongoDB connection
PINATA_JWT=eyJ...                 # IPFS credentials
```

**⚠️ LƯU Ý:** File này chứa thông tin nhạy cảm, KHÔNG commit lên Git!

**Khi nào cần đọc/sửa:**

- Deploy lên môi trường mới
- Thay đổi blockchain network
- Cập nhật credentials
- Debug connection errors

---

### 6. **ipfsService.js** ⭐

**Vai trò:** Upload metadata lên IPFS (Pinata)

**Chức năng:**

- ✅ Upload JSON metadata lên Pinata
- ✅ Return ipfsHash

**Khi dùng:**

- Chỉ dùng khi client gửi metadata object (OLD FLOW)
- NEW FLOW: Property Service tự upload, chỉ gửi tokenURI

**Khi nào cần đọc/sửa:**

- Thay đổi IPFS provider (hiện tại: Pinata)
- Thêm error handling cho IPFS
- Upload file image (hiện tại chỉ upload JSON)

---

## 🔧 CÁC FILE CẤU HÌNH

### 7. **contract-abi.json** ⭐

**Vai trò:** ABI (Application Binary Interface) của Smart Contract

**Chứa gì:**

- Danh sách functions của contract
- Danh sách events của contract
- Input/output parameters

**Khi nào cần update:**

- Smart contract được deploy lại với thay đổi
- Thêm function mới vào contract
- Copy từ `viepropchain/artifacts/ViePropChainNFT.json`

---

### 8. **package.json** ⭐

**Vai trò:** Quản lý dependencies và scripts

**Dependencies quan trọng:**

- `ethers@6.15.0` - Blockchain library
- `express@5.1.0` - Web server
- `mongoose@8.8.4` - MongoDB ODM
- `axios@1.12.2` - HTTP client

**Scripts:**

```json
{
  "start": "node index.js"
}
```

---

## 🎯 TÓM TẮT NHANH

### Khi bắt đầu học service này:

1. **Đọc theo thứ tự:**

   - `index.js` → Hiểu cấu trúc tổng quan
   - `blockchainService.js` → Hiểu logic mint NFT
   - `eventListener.js` → Hiểu cách sync với blockchain
   - `nftModel.js` → Hiểu cấu trúc dữ liệu

2. **File phải biết để deploy:**

   - `.env` - Cấu hình
   - `contract-abi.json` - ABI contract
   - `package.json` - Dependencies

3. **File dự phòng:**
   - `ipfsService.js` - Chỉ dùng khi cần upload IPFS

---

## 📈 BIỂU ĐỒ QUAN HỆ GIỮA CÁC FILE

```
┌─────────────┐
│  index.js   │ ◄─── Entry Point (khởi động mọi thứ)
└──────┬──────┘
       │
       ├───► blockchainService.js ───► nftModel.js (save to MongoDB)
       │              │
       │              └───► ipfsService.js (optional)
       │
       └───► eventListener.js ───► nftModel.js (update owner)
                     │
                     └───► contract-abi.json (read events)

Tất cả đều đọc từ: .env (config)
```

---

## 🚨 KHI GẶP LỖI - KIỂM TRA FILE NÀO?

| Lỗi                 | File cần check                        | Giải pháp                                       |
| ------------------- | ------------------------------------- | ----------------------------------------------- |
| Service không start | `index.js`, `.env`                    | Kiểm tra MongoDB URI, Port                      |
| Mint thất bại       | `blockchainService.js`, `.env`        | Kiểm tra RPC_URL, Private Key, Contract Address |
| Owner không update  | `eventListener.js`                    | Kiểm tra polling có chạy không                  |
| Không lưu được DB   | `nftModel.js`, `blockchainService.js` | Kiểm tra schema, connection                     |
| IPFS upload lỗi     | `ipfsService.js`, `.env`              | Kiểm tra PINATA_JWT                             |
| Contract call lỗi   | `contract-abi.json`, `.env`           | ABI có đúng không, contract address             |

---

## 💡 TIPS QUAN TRỌNG

1. **Thứ tự khởi động:**

   - Ganache PHẢI chạy trước
   - MongoDB PHẢI kết nối được
   - Mới start minting-service

2. **Debug logs:**

   - Tất cả 3 file core đều có `console.log` rõ ràng
   - Xem terminal để track flow

3. **Database:**

   - Collection: `nfts` (lowercase)
   - Indexes: tokenId, owner, status

4. **Event Listener:**
   - Chạy background ngay khi service start
   - Polling mỗi 3 giây
   - KHÔNG bắt MINT events (đã xử lý trong API /mint)

---

## 📚 ĐỌC THÊM

- **Chi tiết đầy đủ:** Xem file `GIAI_THICH_SERVICE.md`
- **API Testing:** Xem file `../property-service/POSTMAN_COMPLETE_GUIDE.md`
- **Smart Contract:** Xem file `../../viepropchain/contracts/ViePropChainNFT.sol`

---

**Tác giả:** AI Assistant  
**Ngày tạo:** October 18, 2025  
**Version:** 1.0
