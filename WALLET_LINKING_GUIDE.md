# 🔗 HƯỚNG DẪN: WALLET LINKING TRONG POSTMAN

## 📋 MỤC LỤC

1. [Wallet Linking là gì?](#wallet-linking-là-gì)
2. [Tại sao cần Wallet Linking?](#tại-sao-cần-wallet-linking)
3. [Vấn đề khi test trong Postman](#vấn-đề-khi-test-trong-postman)
4. [Giải pháp: Dùng Node.js Script](#giải-pháp-dùng-nodejs-script)
5. [Hướng dẫn từng bước](#hướng-dẫn-từng-bước)

---

## 🤔 Wallet Linking là gì?

**Wallet Linking** = **Liên kết địa chỉ ví MetaMask với tài khoản Gmail**

### Workflow CŨ (Trước đây):

```
❌ User PHẢI có MetaMask từ đầu
❌ Sign message với wallet để login
❌ Khó tiếp cận cho người không biết crypto
```

### Workflow MỚI (Bây giờ):

```
✅ User login bằng Gmail (dễ dàng!)
✅ Làm KYC để verify danh tính
✅ Có thể dùng app ngay (xem NFT, marketplace, v.v.)

🔗 [OPTIONAL] Link wallet sau nếu muốn:
   - Mua/bán NFT
   - Sở hữu NFT on-chain
   - Nhận payment từ giao dịch
```

---

## 🎯 Tại sao cần Wallet Linking?

### Trước khi Link Wallet:

```
📧 Email: example@gmail.com ✅
✅ KYC: Verified
❌ Wallet: CHƯA CÓ

→ User có thể:
   ✅ Xem NFT
   ✅ Xem marketplace
   ✅ Quản lý profile

→ User KHÔNG thể:
   ❌ Mua/bán NFT (cần wallet để trả tiền)
   ❌ Sở hữu NFT on-chain (cần wallet làm owner)
   ❌ Nhận payment (cần wallet để nhận tiền)
```

### Sau khi Link Wallet:

```
📧 Email: example@gmail.com ✅
✅ KYC: Verified
✅ Wallet: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2

→ User giờ có thể:
   ✅ Mua/bán NFT
   ✅ Sở hữu NFT on-chain
   ✅ Nhận payment
   ✅ Login bằng Gmail HOẶC Wallet
```

---

## ⚠️ Vấn đề khi test trong Postman

**VẤN ĐỀ:** Postman KHÔNG CÓ MetaMask để sign message!

### Luồng Wallet Linking:

```
1. User gửi walletAddress lên server
   ↓
2. Server trả về message: "Link wallet 0x123... to account user@gmail.com"
   ↓
3. ❌ User phải SIGN message này bằng MetaMask
   ↓ (Postman KHÔNG LÀM ĐƯỢC BƯỚC NÀY!)
4. User gửi signature lên server
   ↓
5. Server verify signature → Link wallet
```

### Tại sao cần signature?

**Để chứng minh user THỰC SỰ sở hữu wallet đó!**

Nếu KHÔNG có signature:

```javascript
❌ Ai cũng có thể lấy địa chỉ wallet của người khác
❌ Paste vào form và claim là của mình
❌ Ví dụ: Copy wallet của Elon Musk và claim ownership!
❌ → LỖI BẢO MẬT NGHIÊM TRỌNG!
```

Với signature:

```javascript
✅ User phải sign message bằng private key
✅ Chỉ người có private key mới sign được
✅ Backend verify được user thực sự sở hữu wallet
✅ Message chứa email → Không thể reuse cho account khác
✅ → AN TOÀN!
```

---

## 💡 Giải pháp: Dùng Node.js Script

Vì Postman không có MetaMask, ta dùng **Node.js script** để generate signature!

### File: `generate-wallet-signature.js`

Script này sẽ:

1. Lấy private key từ Ganache
2. Sign message bằng ethers.js
3. Generate signature
4. Bạn copy signature vào Postman

---

## 📝 Hướng dẫn từng bước

### **Bước 0: Chuẩn bị**

#### 1. Start Ganache:

```bash
cd viepropchain
ganache -m "arm either chef prosper fish lonely rigid antique dawn stumble wife camera" --database.dbPath "./ganache-data-dev" --chain.networkId 1337 --server.port 8545 --server.host 0.0.0.0
```

#### 2. Lấy thông tin accounts từ Ganache:

```
Account 0 (Admin):
  Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2
  Private Key: 0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d
  Balance: 100 ETH

Account 1 (User):
  Address: 0xd1ABb2a4Bb9652f90E0944AFfDf53F0cFFf54D13
  Private Key: 0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1
  Balance: 100 ETH

Account 2 (User):
  Address: 0x2546BcD3c84621e976D8185a91A922aE77ECEc30
  Private Key: 0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c
  Balance: 100 ETH
```

#### 3. Install ethers.js (nếu chưa có):

```bash
npm install ethers
```

---

### **Bước 1: Login Gmail (Browser)**

⚠️ **KHÔNG THỂ test trong Postman!** Phải dùng Browser.

1. Mở browser, truy cập:
   ```
   http://localhost:4001/auth/google
   ```
2. Chọn tài khoản Gmail để đăng nhập
3. Sau khi login thành công, browser redirect về:
   ```
   http://localhost:3000?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. **Copy JWT token** từ URL (phần sau `?token=`)
5. Paste token vào Postman Environment variable:
   - Variable: `jwt_token`
   - Value: `eyJhbGci...`

---

### **Bước 2: Submit KYC (Postman)**

**Request:** `3. KYC Verification → Submit KYC`

**Method:** `POST http://localhost:4007/kyc`

**Headers:**

```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body:**

```json
{
  "fullName": "Nguyen Van A",
  "idNumber": "123456789012"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "userId": "67123abc...",
    "email": "example@gmail.com",
    "fullName": "Nguyen Van A",
    "status": "verified"
  }
}
```

---

### **Bước 3: Get Link Message (Postman)**

**Request:** `4. Wallet Linking → Step 1: Get Link Message`

**Method:** `POST http://localhost:4001/auth/link-wallet/message`

**Headers:**

```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body:**

```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Link wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2 to account example@gmail.com"
}
```

👉 **Copy message này!** Sẽ dùng ở bước tiếp theo.

---

### **Bước 4: Generate Signature (Node.js Script)**

#### 1. Mở file `generate-wallet-signature.js`

#### 2. Thay đổi 2 thứ:

```javascript
// 👇 THAY ĐỔI PRIVATE KEY (từ Ganache)
const PRIVATE_KEY =
  "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"; // Account 0

// 👇 PASTE MESSAGE TỪ POSTMAN (Bước 3)
const MESSAGE =
  "Link wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2 to account example@gmail.com";
```

#### 3. Chạy script:

```bash
node generate-wallet-signature.js
```

#### 4. Output:

```
🔐 WALLET SIGNATURE GENERATOR
============================================================

📋 THÔNG TIN:
   Wallet Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2
   Message: "Link wallet 0x742d35... to account example@gmail.com"

✅ SIGNATURE GENERATED!
============================================================

📤 COPY SIGNATURE NÀY VÀO POSTMAN:

0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1b

============================================================

🧪 HƯỚNG DẪN SỬ DỤNG:
   1. Copy signature ở trên
   2. Mở Postman
   3. Vào request: '4. Wallet Linking → Step 2'
   4. Paste signature vào field 'signature' trong Body
   5. Send request

✅ Wallet sẽ được link với Gmail account của bạn!

🔍 VERIFICATION (for debugging):
   Original Address:  0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2
   Recovered Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2
   Match: ✅ YES
```

👉 **Copy signature!** (dòng dài bắt đầu bằng `0x...`)

---

### **Bước 5: Link Wallet (Postman)**

**Request:** `4. Wallet Linking → Step 2: Link Wallet with Signature`

**Method:** `POST http://localhost:4001/auth/link-wallet`

**Headers:**

```
Authorization: Bearer {{jwt_token}}
Content-Type: application/json
```

**Body:**

```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
  "signature": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1b"
}
```

👆 **Paste signature từ Bước 4 vào đây!**

**Response:**

```json
{
  "success": true,
  "message": "Wallet linked successfully",
  "user": {
    "_id": "67123abc...",
    "email": "example@gmail.com",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
    "authMethods": ["google", "wallet"],
    "walletLinkedAt": "2025-10-24T10:30:00.000Z"
  }
}
```

🎉 **Thành công!** Wallet đã được link với Gmail account!

---

### **Bước 6: Verify (Postman)**

**Request:** `2. Gmail OAuth Login → Get My Info`

**Method:** `GET http://localhost:4001/auth/me`

**Headers:**

```
Authorization: Bearer {{jwt_token}}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "_id": "67123abc...",
    "email": "example@gmail.com",
    "emailVerified": true,
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2", // ✅ Đã link!
    "authMethods": ["google", "wallet"],
    "kycStatus": {
      "isVerified": true,
      "fullName": "Nguyen Van A"
    }
  }
}
```

✅ **Verified!** User giờ có cả email VÀ wallet!

---

## 🔐 Cơ chế bảo mật

### Server verify signature như thế nào?

```javascript
// Backend code (trong auth-service)
const { ethers } = require("ethers");

// 1. Nhận request
const { walletAddress, signature } = req.body;
const { email } = req.user; // Từ JWT

// 2. Tạo lại message
const message = `Link wallet ${walletAddress} to account ${email}`;

// 3. Recover address từ signature
const recoveredAddress = ethers.verifyMessage(message, signature);

// 4. So sánh
if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
  return res.status(400).json({
    error: "Invalid signature - You don't own this wallet!",
  });
}

// 5. Kiểm tra wallet chưa bị link
const existingUser = await User.findOne({ walletAddress });
if (existingUser && existingUser._id.toString() !== userId) {
  return res.status(400).json({
    error: "Wallet already linked to another account!",
  });
}

// 6. Link wallet
user.walletAddress = walletAddress;
user.walletLinkedAt = new Date();
user.authMethods.push({ type: "wallet", linkedAt: new Date() });
await user.save();

// ✅ Success!
```

### Tại sao an toàn?

1. **Signature chứng minh ownership:**

   - Chỉ người có private key mới sign được
   - Backend recover address từ signature
   - Nếu không khớp → Signature giả mạo

2. **Message chứa email:**

   - Message: "Link wallet 0x123... **to account user@gmail.com**"
   - Signature chỉ hợp lệ cho account này
   - Không thể reuse cho account khác

3. **Một wallet chỉ link được với một account:**
   - Backend kiểm tra wallet chưa bị link
   - Tránh xung đột ownership

---

## 🎯 Tóm tắt

```
📧 Login Gmail (Browser)
   ↓
✅ Submit KYC (Postman)
   ↓
🔗 Get Link Message (Postman)
   ↓
🔐 Generate Signature (Node.js Script)
   ↓
🔗 Link Wallet (Postman)
   ↓
✅ Verify (Postman)
   ↓
🎉 User giờ có cả email VÀ wallet!
```

**Wallet linking là OPTIONAL - User có thể dùng app mà không cần wallet!**

---

## 🧪 Quick Test Commands

### 1. Start Ganache:

```bash
cd viepropchain
ganache -m "arm either chef prosper fish lonely rigid antique dawn stumble wife camera" --database.dbPath "./ganache-data-dev" --chain.networkId 1337 --server.port 8545 --server.host 0.0.0.0
```

### 2. Generate Signature:

```bash
cd database_viepropchain_microservice
node generate-wallet-signature.js
```

### 3. Import Postman Collection:

```bash
ViePropChain_Gmail_OAuth_Flow.postman_collection.json
```

---

## ❓ FAQ

### Q: Tại sao phải dùng Node.js script? Không test trực tiếp trong Postman được không?

**A:** Không! Vì Postman không có MetaMask extension. Signing message cần private key, mà Postman không có cách nào access private key từ MetaMask. Node.js script là cách duy nhất để test trong môi trường local.

### Q: Có cách nào test trực tiếp với MetaMask không?

**A:** Có! Dùng Frontend (React app). Frontend có thể gọi MetaMask extension để sign message. Nhưng nếu chưa có Frontend, dùng Node.js script là cách nhanh nhất.

### Q: Message có thể thay đổi được không?

**A:** KHÔNG! Message phải CHÍNH XÁC như server trả về. Nếu thay đổi dù chỉ 1 ký tự, signature sẽ không hợp lệ.

### Q: Có thể dùng lại signature cho request khác không?

**A:** KHÔNG! Mỗi message khác nhau cần signature khác nhau. Mỗi user khác nhau cũng có message khác nhau (chứa email khác nhau).

### Q: Wallet linking có bắt buộc không?

**A:** KHÔNG! Wallet linking là OPTIONAL. User có thể:

- ✅ Login Gmail + KYC → Dùng app ngay
- 🔗 Link wallet sau nếu muốn mua/bán NFT

### Q: User có thể link nhiều wallet không?

**A:** Hiện tại KHÔNG. Một account chỉ link được một wallet. Tương lai có thể mở rộng để hỗ trợ multiple wallets.

---

**🎉 Chúc bạn test thành công!**
