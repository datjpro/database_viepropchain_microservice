# 🔄 KIẾN TRÚC MỚI: Gmail OAuth + KYC + Wallet Linking

## 📋 TÓM TẮT THAY ĐỔI

### **❌ Workflow CŨ (Wallet-based Auth):**

```
1. User kết nối MetaMask
2. Sign message với wallet
3. Verify signature → Login
4. KYC với walletAddress
```

**Vấn đề:**

- ❌ Bắt buộc phải có wallet từ đầu
- ❌ Người dùng không quen crypto khó tiếp cận
- ❌ Không có email cho notifications

---

### **✅ Workflow MỚI (Gmail OAuth + Optional Wallet):**

```
1. User đăng nhập bằng Gmail (Google OAuth)
   → Tạo account với email

2. User điền KYC (Họ tên + CCCD)
   → Auto verified
   → Account active với email

3. [Optional] User kết nối wallet MetaMask
   → Link wallet với account
   → Có thể sử dụng cả 2 phương thức login
```

**Lợi ích:**

- ✅ Dễ tiếp cận (ai cũng có Gmail)
- ✅ Không bắt buộc wallet ngay từ đầu
- ✅ Có email cho notifications
- ✅ KYC với identity thật (Gmail verified)
- ✅ User có thể link wallet sau

---

## 🏗️ KIẾN TRÚC CHI TIẾT

### **1. Auth Service - Google OAuth Integration**

#### **Dependencies mới:**

```json
{
  "passport": "^0.7.0",
  "passport-google-oauth20": "^2.0.0",
  "express-session": "^1.18.0"
}
```

#### **Environment Variables (.env):**

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4001/auth/google/callback
SESSION_SECRET=your_random_secret_key
FRONTEND_URL=http://localhost:3000
```

#### **User Model Update:**

```javascript
{
  // Google OAuth fields
  googleId: String (unique, required khi login bằng Google),
  email: String (required, unique, index),
  emailVerified: Boolean (default: false),

  // Wallet fields (OPTIONAL giờ đây)
  walletAddress: String (unique, lowercase, optional),
  walletLinkedAt: Date,

  // Auth methods
  authMethods: [{
    type: { type: String, enum: ['google', 'wallet'] },
    linkedAt: Date
  }],

  // Existing fields
  role: String,
  profile: {...},
  ...
}
```

#### **New Endpoints:**

**1. Initiate Google Login:**

```
GET /auth/google
→ Redirect to Google OAuth consent screen
```

**2. Google Callback:**

```
GET /auth/google/callback
→ Google redirects here with code
→ Exchange code for user info
→ Create/update user with email
→ Generate JWT
→ Redirect to frontend with token
```

**3. Link Wallet to Account:**

```
POST /auth/link-wallet
Headers: Authorization: Bearer <jwt_token>
Body: {
  "walletAddress": "0x...",
  "signature": "0x..."  // Sign message: "Link wallet to {email}"
}
Response: {
  "success": true,
  "message": "Wallet linked successfully",
  "user": {
    "email": "user@gmail.com",
    "walletAddress": "0x...",
    "authMethods": ["google", "wallet"]
  }
}
```

**4. Unlink Wallet:**

```
POST /auth/unlink-wallet
Headers: Authorization: Bearer <jwt_token>
Response: {
  "success": true,
  "message": "Wallet unlinked"
}
```

**5. Get Current User:**

```
GET /auth/me
Headers: Authorization: Bearer <jwt_token>
Response: {
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@gmail.com",
    "emailVerified": true,
    "walletAddress": "0x..." | null,
    "kycStatus": {
      "isVerified": true,
      "fullName": "Nguyen Van A"
    },
    "authMethods": ["google", "wallet"]
  }
}
```

---

### **2. KYC Service - Link with User ID**

#### **KYC Model Update:**

```javascript
{
  // Link với User (thay vì wallet)
  userId: ObjectId (ref: 'User', required, unique),
  email: String (denormalized từ User, for quick lookup),

  // Wallet (optional, chỉ có sau khi link)
  walletAddress: String (optional, unique if exists),

  // KYC Info
  fullName: String (required),
  idNumber: String (required, unique),

  // Status (auto verified)
  status: { type: String, default: 'verified' },
  verifiedAt: Date,

  ...
}
```

#### **New Endpoints:**

**1. Submit KYC (với userId):**

```
POST /kyc
Headers: Authorization: Bearer <jwt_token>
Body: {
  "fullName": "Nguyen Van A",
  "idNumber": "123456789012"
}
Response: {
  "success": true,
  "message": "KYC verified successfully",
  "data": {
    "userId": "user_id",
    "email": "user@gmail.com",
    "fullName": "Nguyen Van A",
    "status": "verified",
    "verifiedAt": "2025-10-24T..."
  }
}
```

**2. Get KYC by User:**

```
GET /kyc/me
Headers: Authorization: Bearer <jwt_token>
```

**3. Check Verified Status:**

```
GET /kyc/me/verified
Headers: Authorization: Bearer <jwt_token>
```

---

### **3. User Service - User Profile Update**

#### **UserProfile Model Update:**

```javascript
{
  // Link với User từ Auth Service
  userId: ObjectId (ref: 'User', required, unique),
  email: String (denormalized),

  // Wallet (optional)
  walletAddress: String (optional, unique if exists),

  // Basic Info (từ KYC)
  basicInfo: {
    fullName: String,
    ...
  },

  // KYC Status
  kycStatus: {
    isVerified: Boolean,
    verifiedAt: Date,
    kycId: ObjectId
  },

  ...
}
```

---

### **4. JWT Token Strategy**

#### **Token Payload:**

```javascript
{
  userId: "user_id",              // Primary identifier
  email: "user@gmail.com",        // For display
  walletAddress: "0x..." | null,  // If linked
  kycVerified: true | false,
  role: "user" | "admin",
  authMethod: "google" | "wallet" | "both"
}
```

#### **Token Verification Middleware:**

```javascript
// verifyToken middleware giờ check userId thay vì walletAddress
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
```

---

## 🔄 USER FLOW CHI TIẾT

### **Flow 1: Đăng ký User mới**

```
1. Frontend: Click "Login with Google"
   → Redirect: GET /auth/google

2. Google OAuth: User chọn account
   → Callback: GET /auth/google/callback?code=...

3. Backend:
   - Exchange code → Get email, googleId
   - Check User exists (by googleId or email)?
     - No: Create new User
     - Yes: Update lastLoginAt
   - Generate JWT with userId
   - Redirect: {FRONTEND_URL}?token={jwt}

4. Frontend: Save token, redirect to /kyc

5. User điền KYC:
   POST /kyc
   Body: { fullName, idNumber }
   Headers: Authorization: Bearer {jwt}

6. Backend:
   - Extract userId from JWT
   - Create KYC record linked to userId
   - Auto verify (status: 'verified')
   - Notify User Service to update profile

7. User có thể sử dụng app (wallet optional)
```

---

### **Flow 2: Link Wallet với Account**

```
1. User vào Settings → Connect Wallet

2. Frontend:
   - Request wallet connection (MetaMask)
   - Get walletAddress
   - Tạo message: "Link wallet {walletAddress} to account {email}"
   - Sign message với MetaMask
   - Get signature

3. Frontend call:
   POST /auth/link-wallet
   Headers: Authorization: Bearer {jwt}
   Body: {
     walletAddress: "0x...",
     signature: "0x..."
   }

4. Backend:
   - Extract userId from JWT
   - Verify signature (recover address)
   - Check wallet không bị link với user khác
   - Update User:
       walletAddress: "0x..."
       walletLinkedAt: Date.now()
       authMethods.push({ type: 'wallet', linkedAt: Date.now() })
   - Update KYC record with walletAddress
   - Update UserProfile with walletAddress

5. User giờ có thể:
   - Login bằng Google (như cũ)
   - Login bằng Wallet (sign message)
   - Sử dụng NFT features
```

---

### **Flow 3: Login bằng Wallet (sau khi đã link)**

```
1. Frontend: Click "Connect Wallet"
   - Request wallet connection
   - Get walletAddress

2. Frontend call:
   POST /auth/wallet/nonce
   Body: { walletAddress }

3. Backend:
   - Find User by walletAddress
   - Return nonce

4. Frontend:
   - Sign message: "Login to ViePropChain. Nonce: {nonce}"
   - Get signature

5. Frontend call:
   POST /auth/wallet/verify
   Body: { walletAddress, signature }

6. Backend:
   - Verify signature
   - Find User by walletAddress
   - Generate JWT with userId
   - Return token

7. Frontend: Save token, user logged in
```

---

## 📊 DATABASE CHANGES

### **Auth Service - User Collection:**

**Before:**

```javascript
{
  _id: ObjectId,
  walletAddress: "0x..." (unique, required),
  nonce: "123456",
  role: "user",
  profile: {...},
  createdAt: Date
}
```

**After:**

```javascript
{
  _id: ObjectId,

  // Google OAuth (required cho Google login)
  googleId: "google_user_id" (unique, sparse),
  email: "user@gmail.com" (unique, required),
  emailVerified: true,

  // Wallet (optional, có sau khi link)
  walletAddress: "0x..." (unique, sparse),
  walletLinkedAt: Date,
  nonce: "123456" (chỉ cần khi login bằng wallet),

  // Auth tracking
  authMethods: [
    { type: "google", linkedAt: Date },
    { type: "wallet", linkedAt: Date }
  ],

  // Existing
  role: "user",
  profile: {...},
  createdAt: Date,
  lastLoginAt: Date
}
```

---

### **KYC Service - KYC Collection:**

**Before:**

```javascript
{
  _id: ObjectId,
  walletAddress: "0x..." (unique, required),
  fullName: "Nguyen Van A",
  idNumber: "123456789012",
  status: "verified",
  verifiedAt: Date
}
```

**After:**

```javascript
{
  _id: ObjectId,

  // Link với User
  userId: ObjectId (ref: 'User', required, unique),
  email: "user@gmail.com" (for quick lookup),

  // Wallet (optional)
  walletAddress: "0x..." (sparse unique),

  // KYC Info
  fullName: "Nguyen Van A",
  idNumber: "123456789012",

  // Status
  status: "verified",
  verifiedAt: Date,

  createdAt: Date
}
```

---

### **User Service - UserProfile Collection:**

**Before:**

```javascript
{
  _id: ObjectId,
  walletAddress: "0x..." (unique, required),
  basicInfo: {...},
  kycStatus: {...},
  ...
}
```

**After:**

```javascript
{
  _id: ObjectId,

  // Link với User
  userId: ObjectId (ref: 'User', required, unique),
  email: "user@gmail.com",

  // Wallet (optional)
  walletAddress: "0x..." (sparse unique),

  // Existing
  basicInfo: {...},
  kycStatus: {...},
  ...
}
```

---

## 🔐 SECURITY CONSIDERATIONS

### **1. Google OAuth Security:**

- ✅ Sử dụng HTTPS cho production
- ✅ Verify Google token server-side
- ✅ Session security với httpOnly cookies
- ✅ CSRF protection

### **2. Wallet Linking Security:**

- ✅ Verify signature để đảm bảo user sở hữu wallet
- ✅ Message phải chứa email để prevent replay attacks
- ✅ Check wallet không bị link với user khác
- ✅ Rate limiting cho link/unlink operations

### **3. JWT Security:**

- ✅ Short expiry time (24h)
- ✅ Refresh token mechanism
- ✅ Token revocation on logout

---

## 📱 FRONTEND CHANGES

### **Login Screen:**

```jsx
// Old
<button onClick={connectWallet}>Connect Wallet</button>

// New
<div>
  <button onClick={loginWithGoogle}>
    <GoogleIcon /> Login with Google
  </button>

  <div className="divider">OR</div>

  <button onClick={connectWallet}>
    <MetaMaskIcon /> Connect Wallet
  </button>
</div>
```

### **Settings → Connect Wallet:**

```jsx
{
  !user.walletAddress && (
    <Card>
      <h3>Connect MetaMask Wallet</h3>
      <p>Link your wallet to buy/sell NFTs</p>
      <button onClick={linkWallet}>Connect Wallet</button>
    </Card>
  );
}

{
  user.walletAddress && (
    <Card>
      <h3>Connected Wallet</h3>
      <p>{user.walletAddress}</p>
      <button onClick={unlinkWallet}>Disconnect</button>
    </Card>
  );
}
```

---

## 🧪 TESTING FLOW

### **Test 1: Google OAuth Login + KYC:**

```
1. GET /auth/google
2. Callback with code
3. POST /kyc { fullName, idNumber }
4. GET /auth/me → Check kycVerified: true
```

### **Test 2: Link Wallet:**

```
1. Login with Google (get token)
2. POST /auth/link-wallet { walletAddress, signature }
3. GET /auth/me → Check walletAddress exists
```

### **Test 3: Login with Linked Wallet:**

```
1. POST /auth/wallet/nonce { walletAddress }
2. POST /auth/wallet/verify { walletAddress, signature }
3. GET /auth/me → Check user is same
```

---

## 📦 MIGRATION STRATEGY

### **Existing Users (wallet-only):**

```javascript
// Migration script
async function migrateExistingUsers() {
  const users = await User.find({ walletAddress: { $exists: true } });

  for (const user of users) {
    // Tạo placeholder email nếu chưa có
    if (!user.email) {
      user.email = `${user.walletAddress.toLowerCase()}@wallet.local`;
      user.emailVerified = false;
    }

    // Thêm authMethod
    if (!user.authMethods || user.authMethods.length === 0) {
      user.authMethods = [
        {
          type: "wallet",
          linkedAt: user.createdAt || new Date(),
        },
      ];
    }

    await user.save();
  }
}
```

---

## ✅ CHECKLIST IMPLEMENTATION

### **Phase 1: Auth Service**

- [ ] Install passport, passport-google-oauth20
- [ ] Add Google OAuth config
- [ ] Update User model (add googleId, email, etc)
- [ ] Create /auth/google routes
- [ ] Create /auth/link-wallet endpoint
- [ ] Update JWT strategy
- [ ] Add verifyToken middleware update

### **Phase 2: KYC Service**

- [ ] Update KYC model (userId instead of walletAddress)
- [ ] Update KYC controller to use req.userId
- [ ] Add email to KYC record
- [ ] Update notification to User Service

### **Phase 3: User Service**

- [ ] Update UserProfile model
- [ ] Add userId field
- [ ] Update profile endpoints

### **Phase 4: Testing**

- [ ] Test Google OAuth flow
- [ ] Test KYC with userId
- [ ] Test wallet linking
- [ ] Test wallet login (after link)

### **Phase 5: Migration**

- [ ] Create migration script
- [ ] Test on staging
- [ ] Run on production

---

## 🚀 NEXT STEPS

1. **Review this architecture** - Bạn có thay đổi gì không?
2. **Setup Google OAuth** - Tạo Google Cloud Project
3. **Start implementation** - Begin with Auth Service
4. **Test thoroughly** - Each flow must work perfectly
5. **Update Postman** - New collection with Gmail flow

---

**Bạn đồng ý với kiến trúc này không? Có điểm nào cần thay đổi không?**

Mình sẽ bắt đầu implement sau khi bạn confirm! 🚀
