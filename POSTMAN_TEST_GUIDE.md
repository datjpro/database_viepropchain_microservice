# Hướng dẫn Test NFT Minting với Postman

## Yêu cầu trước khi test

1. ✅ Ganache đang chạy trên `http://localhost:8545`
2. ✅ Smart contract đã được deploy qua Truffle
3. ✅ Minting service đang chạy trên `http://localhost:3002`

## Bước 1: Khởi động Service

Mở terminal và chạy:

```bash
node "d:\DACN\RE-Chain\database_viepropchain_microservice\minting-service\index.js"
```

Bạn sẽ thấy:

```
✅ Blockchain service initialized successfully
✅ Minting Service API đang chạy tại http://localhost:3002
✅ Connected to MongoDB
```

## Bước 2: Cấu hình Postman

### Request Settings:

- **Method:** `POST`
- **URL:** `http://localhost:3002/mint`
- **Headers:**
  - Key: `Content-Type`
  - Value: `application/json`

### Body (chọn raw + JSON):

```json
{
  "recipient": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
  "name": "Villa Quận 1 - Sài Gòn",
  "description": "Biệt thự cao cấp tại trung tâm Quận 1, diện tích 200m2, đầy đủ tiện nghi",
  "image": "https://images.unsplash.com/photo-1613977257363-707ba9348227",
  "attributes": [
    {
      "trait_type": "Loại BDS",
      "value": "Biệt thự"
    },
    {
      "trait_type": "Vị trí",
      "value": "Quận 1, TP.HCM"
    },
    {
      "trait_type": "Diện tích",
      "value": "200m2"
    },
    {
      "trait_type": "Giá",
      "value": "15 tỷ VND"
    },
    {
      "trait_type": "Tình trạng pháp lý",
      "value": "Sổ hồng chính chủ"
    }
  ]
}
```

**Lưu ý:** Thay `recipient` bằng một địa chỉ ví từ Ganache của bạn (lấy từ Ganache UI hoặc accounts[0-9]).

## Bước 3: Gửi Request

Click **Send** trong Postman.

## Bước 4: Kết quả mong đợi

### Response thành công (200 OK):

```json
{
  "success": true,
  "tokenId": "1",
  "transactionHash": "0x...",
  "ipfsHash": "QmXxxx...",
  "tokenURI": "ipfs://QmXxxx..."
}
```

### Trong Terminal:

```
[API] Nhận được yêu cầu mint cho recipient: 0xC68...
Bắt đầu mint cho 0xC68... với metadata: { name: '...', ... }
📤 Đang upload metadata lên IPFS...
✅ Đã upload lên IPFS: QmXxxx...
TokenURI: ipfs://QmXxxx...
Đang chờ giao dịch được xác nhận... 0x...
Giao dịch đã được xác nhận!
✅ NFT 1 đã được lưu vào MongoDB
```

## Bước 5: Kiểm tra dữ liệu đã lưu

### Trên IPFS (Pinata):

Truy cập: `https://gateway.pinata.cloud/ipfs/{ipfsHash}`

### Trên MongoDB:

1. Vào MongoDB Atlas Dashboard
2. Browse Collections → Database: `viepropchain` → Collection: `nfts`
3. Bạn sẽ thấy document với:
   - tokenId: "1"
   - owner: "0xC68..."
   - name, description, attributes
   - ipfsHash, tokenURI
   - transactionHash
   - createdAt

### Trên Blockchain (Ganache):

1. Mở Ganache
2. Vào tab "Transactions"
3. Tìm transaction với hash từ response
4. Kiểm tra Contract Calls

## Các lỗi thường gặp

### ❌ Error 400: "Thiếu recipient hoặc name"

- Kiểm tra body JSON có đầy đủ `recipient` và `name` không

### ❌ Error 500: "IPFS upload failed"

- Kiểm tra Pinata credentials trong `.env`
- Kiểm tra kết nối internet

### ❌ Error 500: "Transaction failed"

- Kiểm tra Ganache có đang chạy không
- Kiểm tra địa chỉ contract có đúng không
- Kiểm tra private key có quyền mint không

### ❌ MongoDB connection error

- Kiểm tra `MONGO_URI` trong `.env`
- Kiểm tra kết nối internet (MongoDB Atlas)
- Kiểm tra IP whitelist trên MongoDB Atlas

## Test với nhiều NFT

Bạn có thể test mint nhiều NFT bằng cách:

1. Thay đổi `name` và `description`
2. Gửi lại request
3. TokenId sẽ tăng dần: 1, 2, 3, ...

## Ví dụ khác

### NFT Căn hộ:

```json
{
  "recipient": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
  "name": "Căn hộ Vinhomes Central Park",
  "description": "Căn hộ 3PN, tầng cao, view sông Sài Gòn tuyệt đẹp",
  "image": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00",
  "attributes": [
    {
      "trait_type": "Loại BDS",
      "value": "Căn hộ"
    },
    {
      "trait_type": "Vị trí",
      "value": "Bình Thạnh, TP.HCM"
    },
    {
      "trait_type": "Diện tích",
      "value": "95m2"
    },
    {
      "trait_type": "Số phòng ngủ",
      "value": "3"
    },
    {
      "trait_type": "Giá",
      "value": "6.5 tỷ VND"
    }
  ]
}
```

### NFT Đất nền:

```json
{
  "recipient": "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
  "name": "Đất nền KDC Phú Mỹ Hưng",
  "description": "Lô đất góc 2 mặt tiền, vị trí đẹp, gần trường học",
  "image": "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
  "attributes": [
    {
      "trait_type": "Loại BDS",
      "value": "Đất nền"
    },
    {
      "trait_type": "Vị trí",
      "value": "Quận 7, TP.HCM"
    },
    {
      "trait_type": "Diện tích",
      "value": "120m2"
    },
    {
      "trait_type": "Hướng",
      "value": "Đông Nam"
    },
    {
      "trait_type": "Giá",
      "value": "8 tỷ VND"
    }
  ]
}
```

---

## Addresses từ Ganache (để test)

Các địa chỉ ví từ Ganache bạn có thể dùng làm `recipient`:

- Account 0: `0xC6890b26A32d9d92aefbc8635C4588247529CdfE`
- Account 1: (lấy từ Ganache UI)
- Account 2: (lấy từ Ganache UI)
- ...

## Xem NFT đã mint

Sau khi mint thành công, bạn có thể:

1. **Xem trên IPFS**: `https://gateway.pinata.cloud/ipfs/{ipfsHash}`
2. **Xem trên MongoDB**: MongoDB Atlas → Collection `nfts`
3. **Query từ Smart Contract**: Dùng Web3/Ethers để gọi `tokenURI(tokenId)`

---

**Chúc bạn test thành công! 🚀**
