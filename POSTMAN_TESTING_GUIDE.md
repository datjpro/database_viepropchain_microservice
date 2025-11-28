# 📋 Hướng Dẫn Test Postman Collection - Utility-First

## 🚀 Chuẩn Bị

### 1. Khởi động tất cả services

```bash
cd d:\DACN\RE-Chain
node run.js
```

Đợi ~15 giây cho tất cả services khởi động xong. Kiểm tra:

- ✅ API Gateway: http://localhost:4000/health
- ✅ Auth Service: http://localhost:4010/health
- ✅ Admin Service: http://localhost:4003/health

### 2. Import Postman Collection

1. Mở Postman Desktop
2. Import → Upload file: `ViePropChain_Utility_First.postman_collection.json`
3. Tạo Environment mới tên: `ViePropChain Local`

### 3. Cấu hình Environment Variables

Trong Postman Environment `ViePropChain Local`, thêm các biến sau:

| Variable Name    | Initial Value           | Current Value           |
| ---------------- | ----------------------- | ----------------------- |
| `base_url`       | `http://localhost:4000` | `http://localhost:4000` |
| `landlord_token` | _(để trống)_            | _(auto set khi login)_  |
| `admin_token`    | _(để trống)_            | _(auto set khi login)_  |
| `renter_token`   | _(để trống)_            | _(auto set khi login)_  |

**Lưu ý:** Các biến khác như `property_id`, `order_id`, `custodial_wallet_address` sẽ tự động được set khi chạy các request.

---

## 🔐 BƯỚC 1: Authentication (Gmail OAuth)

### 1.1. Login Gmail (Landlord)

**Request:** `GET {{base_url}}/api/auth/google`

**Cách test:**

1. Chọn request "🔐 Login Gmail (Landlord)"
2. Click **Send**
3. **Lỗi sẽ xuất hiện** vì đây là OAuth flow cần browser

**Cách đúng:**

1. Mở browser, truy cập: `http://localhost:4010/auth/google`
2. Đăng nhập Gmail (tài khoản Landlord)
3. Sau khi redirect thành công, check console browser hoặc URL để lấy JWT token
4. **Copy JWT token** và paste vào Environment variable `landlord_token`

**Hoặc sử dụng cách thủ công:**

```bash
# Mở browser
http://localhost:4010/auth/google

# Sau khi login, hệ thống sẽ redirect về frontend với token trong URL hoặc cookie
# Hoặc call trực tiếp endpoint /auth/me để xem response
```

### 1.2. Verify Login - Get My Info

**Request:** `GET {{base_url}}/api/auth/me`

**Headers:**

```
Authorization: Bearer {{landlord_token}}
```

**Expected Response:**

```json
{
  "success": true,
  "user": {
    "_id": "673...",
    "email": "your-email@gmail.com",
    "walletAddress": null,
    "custodialWallet": {
      "address": "0x...",
      "isActive": true
    },
    "kycLevel": 1,
    "role": "user"
  }
}
```

**Auto Set:**

- `landlord_user_id`: User ID
- `custodial_wallet_address`: Custodial wallet address (nếu có)

### 1.3. Lặp lại cho Admin và Renter

- Login Gmail với tài khoản Admin → Lấy `admin_token`
- Login Gmail với tài khoản Renter → Lấy `renter_token`

---

## 📂 BƯỚC 2: Upload Files

### 2.1. Upload Public Image (IPFS)

**Request:** `POST {{base_url}}/api/ipfs/upload/public`

**Body:** `form-data`

- `file`: Chọn ảnh nhà đẹp (JPG/PNG)
- `type`: `public`

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "cid": "Qm...",
    "url": "https://ipfs.io/ipfs/Qm..."
  }
}
```

**Auto Set:** `public_image_url`

### 2.2. Upload Legal Document (Private)

**Request:** `POST {{base_url}}/api/upload/private`

**Body:** `form-data`

- `file`: Chọn ảnh sổ đỏ/CCCD
- `type`: `private`

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "secureUrl": "http://localhost:4002/private/doc_123.jpg"
  }
}
```

**Auto Set:** `private_doc_url`

---

## 🏠 BƯỚC 3: Create Property (Landlord)

### 3.1. Create Property

**Request:** `POST {{base_url}}/api/admin/properties`

**Headers:**

```
Authorization: Bearer {{landlord_token}}
Content-Type: application/json
```

**Body:**

```json
{
  "title": "Căn hộ Utility-First Test",
  "description": "Chỉ hiển thị ảnh nhà, giấu sổ đỏ.",
  "address": { "city": "Hanoi" },
  "price": 15000000,
  "images": ["{{public_image_url}}"],
  "legalDocuments": ["{{private_doc_url}}"]
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "_id": "673...",
    "title": "Căn hộ Utility-First Test",
    "verificationStatus": "pending",
    "blockchainStatus": "none",
    "images": ["https://ipfs.io/ipfs/..."],
    "legalDocuments": ["..."] // Chỉ owner/admin thấy
  }
}
```

**Auto Set:** `property_id`

### 3.2. Get Property Detail (Guest View)

**Request:** `GET {{base_url}}/api/admin/properties/{{property_id}}`

**No Auth Required** (Public endpoint)

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "_id": "673...",
    "title": "Căn hộ Utility-First Test",
    "images": ["https://ipfs.io/ipfs/..."]
    // ❌ legalDocuments KHÔNG xuất hiện (select: false)
  }
}
```

**Test:**

- ✅ `pm.expect(jsonData.data.legalDocuments).to.be.undefined`
- ✅ `pm.expect(jsonData.data.images).to.be.an('array')`

---

## 👮 BƯỚC 4: Admin Approval Workflow

### 4.1. Get Pending Properties

**Request:** `GET {{base_url}}/api/admin/properties/pending/approval`

**Headers:**

```
Authorization: Bearer {{admin_token}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "673...",
      "title": "Căn hộ Utility-First Test",
      "verificationStatus": "pending",
      "createdAt": "2025-11-28..."
    }
  ]
}
```

### 4.2. Get Property Detail (Admin View)

**Request:** `GET {{base_url}}/api/admin/properties/{{property_id}}/admin-view`

**Headers:**

```
Authorization: Bearer {{admin_token}}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "_id": "673...",
    "title": "Căn hộ Utility-First Test",
    "images": ["https://ipfs.io/ipfs/..."],
    "legalDocuments": ["http://localhost:4002/private/..."], // ✅ Admin THẤY
    "verificationStatus": "pending"
  }
}
```

**Test:**

- ✅ `pm.expect(jsonData.data.legalDocuments).to.exist`

### 4.3. Option A: Approve Only (No Mint)

**Request:** `POST {{base_url}}/api/admin/properties/{{property_id}}/approve`

**Body:**

```json
{
  "note": "Giấy tờ hợp lệ, chưa cần NFT."
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Property approved successfully (No NFT)",
  "data": {
    "verificationStatus": "verified",
    "blockchainStatus": "none", // Chưa mint
    "nft": { "tokenId": null }
  }
}
```

### 4.4. Option B: Approve & Mint NFT

**Request:** `POST {{base_url}}/api/admin/properties/{{property_id}}/approve-and-mint`

**Body:**

```json
{
  "recipientWallet": "{{custodial_wallet_address}}",
  "note": "Docs verified ok."
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Property approved and NFT minted",
  "data": {
    "verificationStatus": "verified",
    "blockchainStatus": "minted",
    "nft": {
      "tokenId": "1",
      "contractAddress": "0x...",
      "txHash": "0x..."
    }
  }
}
```

**Auto Set:** `token_id`

### 4.5. Option C: Reject Property

**Request:** `POST {{base_url}}/api/admin/properties/{{property_id}}/reject`

**Body:**

```json
{
  "reason": "Giấy tờ không rõ ràng, cần bổ sung."
}
```

### 4.6. Option D: Request More Info

**Request:** `POST {{base_url}}/api/admin/properties/{{property_id}}/request-info`

**Body:**

```json
{
  "message": "Cần bổ sung ảnh mặt sau sổ đỏ."
}
```

---

## 🛒 BƯỚC 5: Marketplace Orders

### 5.1. Create Rent Order (Fiat Payment)

**Request:** `POST {{base_url}}/api/marketplace/orders/rent`

**Headers:**

```
Authorization: Bearer {{renter_token}}
```

**Body:**

```json
{
  "propertyId": "{{property_id}}",
  "days": 365,
  "paymentMethod": "bank_transfer",
  "amount": 180000000
}
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "orderId": "ORD-1732809600-ABC123",
    "type": "rent",
    "status": "pending_payment",
    "payment": {
      "method": "bank_transfer",
      "amount": 180000000
    },
    "blockchainSync": {
      "isSynced": false
    }
  }
}
```

**Auto Set:** `order_id`

### 5.2. Create Buy Order (Cash)

**Request:** `POST {{base_url}}/api/marketplace/orders/buy`

**Body:**

```json
{
  "propertyId": "{{property_id}}",
  "paymentMethod": "cash",
  "amount": 5000000000
}
```

### 5.3. Get Order Detail

**Request:** `GET {{base_url}}/api/marketplace/orders/{{order_id}}`

**Headers:**

```
Authorization: Bearer {{renter_token}}
```

### 5.4. Confirm Payment (Admin)

**Request:** `POST {{base_url}}/api/marketplace/orders/{{order_id}}/confirm-payment`

**Headers:**

```
Authorization: Bearer {{admin_token}}
```

**Body:**

```json
{
  "proofImage": "{{public_image_url}}",
  "bankRef": "FT123456789"
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Payment confirmed, blockchain syncing...",
  "data": {
    "status": "blockchain_syncing",
    "payment": {
      "status": "confirmed",
      "proofImage": "...",
      "confirmedAt": "2025-11-28..."
    },
    "blockchainSync": {
      "isSynced": false,
      "retryCount": 0
    }
  }
}
```

**Hệ thống tự động:**

1. Call Blockchain Service: `POST /api/blockchain/set-user`
2. Update `blockchainSync.txHash`
3. Change status → `completed`

### 5.5. Get Pending Orders (Admin)

**Request:** `GET {{base_url}}/api/marketplace/orders/pending`

### 5.6. Retry Blockchain Sync

**Request:** `POST {{base_url}}/api/marketplace/orders/{{order_id}}/retry-sync`

**Use Case:** Nếu blockchain sync lỗi, admin có thể retry (max 3 lần)

---

## 📊 BƯỚC 6: Monitoring & Stats

### 6.1. Get All Verified Properties (Public)

**Request:** `GET {{base_url}}/api/admin/properties?verificationStatus=verified`

### 6.2. Get Blockchain Stats (Admin)

**Request:** `GET {{base_url}}/api/blockchain/stats`

### 6.3. Get My Orders (User)

**Request:** `GET {{base_url}}/api/marketplace/orders/my-orders`

---

## ✅ Test Checklist

### Security Tests

- [ ] Guest KHÔNG thấy `legalDocuments` khi GET property
- [ ] Admin THẤY `legalDocuments` khi GET admin-view
- [ ] Không có JWT token → 401 Unauthorized
- [ ] JWT token hết hạn → 401 Invalid or expired token

### Approval Workflow Tests

- [ ] Property tạo mới có `verificationStatus: pending`
- [ ] Approve only → `verified` + `blockchainStatus: none`
- [ ] Approve & Mint → `verified` + `minted` + có `tokenId`
- [ ] Reject → `verificationStatus: rejected`

### Order Workflow Tests

- [ ] Tạo order → `status: pending_payment`
- [ ] Confirm payment → `blockchain_syncing` → `completed`
- [ ] Order có `blockchainSync.txHash` sau khi sync
- [ ] Retry sync works (max 3 lần)

### Data Isolation Tests

- [ ] User chỉ thấy orders của mình (GET /my-orders)
- [ ] Admin thấy tất cả pending orders
- [ ] Public endpoint không lộ private data

---

## 🐛 Troubleshooting

### Lỗi: "Cannot GET /api/auth/me"

**Nguyên nhân:** API Gateway chưa khởi động hoặc Auth Service down

**Giải pháp:**

```bash
# Kiểm tra services
curl http://localhost:4000/health
curl http://localhost:4010/health

# Khởi động lại
node run.js
```

### Lỗi: "Invalid or expired token"

**Nguyên nhân:** JWT token chưa set hoặc hết hạn

**Giải pháp:**

1. Login lại Gmail: `http://localhost:4010/auth/google`
2. Copy token mới vào Postman Environment
3. Hoặc call `/auth/me` trực tiếp để lấy token

### Lỗi: "User not found"

**Nguyên nhân:** Chưa login lần nào, user chưa tồn tại trong DB

**Giải pháp:**

1. Đảm bảo MongoDB đang chạy
2. Login Gmail để tạo user mới
3. Kiểm tra MongoDB collection `users`

### Upload file lỗi

**Nguyên nhân:** IPFS Service hoặc Upload endpoint chưa implement

**Giải pháp:**

- Kiểm tra IPFS Service: `http://localhost:4002/health`
- Nếu chưa có endpoint, dùng mock URL:
  ```json
  {
    "public_image_url": "https://ipfs.io/ipfs/QmTest123",
    "private_doc_url": "http://localhost:4002/private/doc123.jpg"
  }
  ```

---

## 🎯 Quick Test Flow (Happy Path)

```
1. Login Landlord → Get token
2. Get My Info → Get custodial wallet
3. Upload Image (mock: https://ipfs.io/ipfs/QmTest)
4. Upload Doc (mock: http://localhost:4002/private/doc.jpg)
5. Create Property → Get property_id
6. Login Admin → Get admin_token
7. Get Pending Properties → Verify property_id xuất hiện
8. Approve & Mint → Get token_id
9. Login Renter → Get renter_token
10. Create Rent Order → Get order_id
11. Switch to Admin token
12. Confirm Payment → Verify blockchain sync
13. Check Order Detail → status = completed
```

---

## 📝 Notes

- **Gmail OAuth:** Cần setup Google Cloud Console với redirect URI `http://localhost:4010/auth/google/callback`
- **Custodial Wallet:** Tự động tạo khi user login lần đầu (nếu chưa có wallet)
- **Blockchain Sync:** Async process, có thể mất vài giây
- **Rate Limiting:** Default 100 requests/15 minutes
- **CORS:** Frontend phải ở `http://localhost:3000`

---

🎉 **Ready to test!** Import collection vào Postman và bắt đầu từ endpoint đầu tiên.
