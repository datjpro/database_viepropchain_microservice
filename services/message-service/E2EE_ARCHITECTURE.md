# Message Service - E2EE vs Server-Side Architecture

## 📖 Tổng quan

Message Service hỗ trợ **2 loại chat** với mức bảo mật khác nhau:

### 1. **E2EE Chat (Private)** 🔒

- **Mục đích**: Chat riêng tư giữa 2 user
- **Bảo mật**: End-to-End Encryption
- **Admin**: KHÔNG thể đọc được
- **Encryption**: Client-side (RSA + AES-256)
- **Use case**: Thảo luận cá nhân, thông tin nhạy cảm

### 2. **Server-Side Chat (Marketplace/Support/Dispute)** 👀

- **Mục đích**: Giao dịch, hỗ trợ, tranh chấp
- **Bảo mật**: Lưu plaintext trên server
- **Admin**: CÓ thể đọc được
- **Encryption**: None (plaintext)
- **Use case**: Bằng chứng giao dịch, xử lý khiếu nại

---

## 🔐 E2EE Chat Flow

### Architecture

```
Client A                Server                Client B
   |                      |                      |
   |-- Generate RSA Keys -|                      |
   |   (Public/Private)   |                      |
   |                      |                      |
   |-- Upload Public Key->|                      |
   |                      |<- Upload Public Key--|
   |                      |                      |
   |-- Send Message ----->|                      |
   |  1. Generate AES key |                      |
   |  2. Encrypt msg      |                      |
   |  3. Encrypt AES key  |                      |
   |     with B's RSA pub |                      |
   |                      |                      |
   |                      |-- Forward encrypted->|
   |                      |    message + keys   |
   |                      |                      |
   |                      |    Client B decrypts|
   |                      |    with private key  |
```

### Implementation

#### 1. Client generates RSA key pair

```javascript
// Client-side (Browser)
async function generateKeys() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  // Export public key
  const publicKey = await window.crypto.subtle.exportKey(
    "spki",
    keyPair.publicKey
  );

  // Store private key in IndexedDB (NEVER send to server)
  await storePrivateKey(keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKey),
    privateKey: keyPair.privateKey,
  };
}
```

#### 2. Register public key with server

```javascript
POST / api / messages / keys / register;
Authorization: Bearer <
  token >
  {
    public_key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMI...",
    device_info: {
      device_id: "device_123",
      device_name: "Chrome on Windows",
      platform: "web",
    },
  };
```

#### 3. Send encrypted message

```javascript
// Client-side encryption
async function sendE2EEMessage(receiverId, plaintext) {
  // 1. Get receiver's public key
  const receiverKey = await fetch(`/api/messages/keys/${receiverId}`);

  // 2. Generate random AES key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-CBC", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  // 3. Encrypt message with AES
  const iv = window.crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    aesKey,
    new TextEncoder().encode(plaintext)
  );

  // 4. Encrypt AES key with receiver's RSA public key
  const encryptedKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    receiverKey,
    await window.crypto.subtle.exportKey("raw", aesKey)
  );

  // 5. Send to server
  socket.emit("send_message", {
    receiver_id: receiverId,
    message: arrayBufferToBase64(encrypted), // Encrypted
    chat_type: "private",
    encryption: {
      type: "e2ee",
      encrypted_keys: {
        [receiverId]: arrayBufferToBase64(encryptedKey),
      },
      iv: arrayBufferToBase64(iv),
    },
  });
}
```

#### 4. Receive and decrypt message

```javascript
socket.on("new_message", async (data) => {
  const message = data.data;

  if (message.encryption.type === "e2ee") {
    // 1. Get my encrypted AES key
    const encryptedKey = message.encryption.encrypted_keys[myUserId];

    // 2. Decrypt AES key with my private RSA key
    const privateKey = await getMyPrivateKey();
    const aesKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      base64ToArrayBuffer(encryptedKey)
    );

    // 3. Import AES key
    const key = await window.crypto.subtle.importKey(
      "raw",
      aesKey,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    // 4. Decrypt message
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-CBC",
        iv: base64ToArrayBuffer(message.encryption.iv),
      },
      key,
      base64ToArrayBuffer(message.message)
    );

    const plaintext = new TextDecoder().decode(decrypted);
    displayMessage(plaintext);
  }
});
```

### What Server Stores (E2EE)

```javascript
{
  chat_id: "private_userId1_userId2",
  sender_id: ObjectId("..."),
  receiver_id: ObjectId("..."),
  message: "U2FsdGVkX1+...", // ❌ Admin cannot read
  chat_type: "private",
  encryption: {
    type: "e2ee",
    encrypted_keys: {
      "userId1": "MIIBIjANBgkq...", // Encrypted AES key
      "userId2": "ANBgkqhkiG9w..."
    },
    iv: "dGhpc2lzYW5pdg==",
    key_version: "a1b2c3d4..."
  }
}
```

**Admin xem message này → CHỈ thấy ciphertext (vô nghĩa)** ❌

---

## 📢 Server-Side Chat Flow

### Architecture

```
Client A         Server (Admin có thể đọc)         Client B
   |                     |                            |
   |-- Send Message ---->|                            |
   |   (Plaintext)       |                            |
   |                     |                            |
   |                     |-- Store plaintext in DB    |
   |                     |                            |
   |                     |-- Forward to Client B ---->|
   |                     |                            |
   |                     |<-- Admin Dashboard --------|
   |                     |    (Read all messages)     |
```

### Implementation

#### 1. Start marketplace chat

```javascript
POST /api/messages/chats/start

{
  "receiver_id": "seller_id",
  "chat_type": "marketplace",
  "metadata": {
    "property_id": "property_123",
    "transaction_type": "sale"
  }
}
```

#### 2. Send plaintext message

```javascript
socket.emit("send_message", {
  receiver_id: "seller_id",
  message: "Hello, is this property still available?", // Plaintext
  chat_type: "marketplace",
  encryption: {
    type: "server-side", // No encryption
  },
});
```

### What Server Stores (Server-Side)

```javascript
{
  chat_id: "marketplace_buyer_seller",
  sender_id: ObjectId("buyer"),
  receiver_id: ObjectId("seller"),
  message: "Hello, is this property still available?", // ✅ Admin can read
  chat_type: "marketplace",
  encryption: {
    type: "server-side"
  },
  metadata: {
    property_id: ObjectId("..."),
    transaction_type: "sale"
  }
}
```

**Admin xem message này → Thấy plaintext (rõ ràng)** ✅

---

## 🎯 Chat Types

| Chat Type       | Encryption       | Admin Access | Use Case                       |
| --------------- | ---------------- | ------------ | ------------------------------ |
| **private**     | E2EE (RSA+AES)   | ❌ Không     | Chat cá nhân riêng tư          |
| **marketplace** | None (plaintext) | ✅ Có        | Mua bán property, thương lượng |
| **support**     | None (plaintext) | ✅ Có        | Hỗ trợ khách hàng              |
| **dispute**     | None (plaintext) | ✅ Có        | Tranh chấp, khiếu nại          |

---

## 🔑 API Endpoints

### For Users

#### E2EE Key Management

```http
# Register public key
POST /api/messages/keys/register
Body: { public_key, device_info }

# Get my key
GET /api/messages/keys/me

# Get user's public key
GET /api/messages/keys/:userId

# Batch get keys
POST /api/messages/keys/batch
Body: { user_ids: [...] }

# Revoke key
POST /api/messages/keys/revoke
Body: { reason }
```

#### Messaging (Same for both E2EE and Server-Side)

```http
# Get all chats
GET /api/messages/chats

# Get chat history
GET /api/messages/chats/:receiver_id/messages

# Send message (via WebSocket)
socket.emit('send_message', { ... })
```

### For Admins

#### Server-Side Chat Management

```http
# Get all server-side chats
GET /api/messages/admin/chats
Query: ?chat_type=marketplace&status=active

# Get chat messages (plaintext)
GET /api/messages/admin/chats/:chat_id/messages

# Assign chat to admin
PUT /api/messages/admin/chats/:chat_id/assign
Body: { assigned_to, priority }

# Update chat status
PUT /api/messages/admin/chats/:chat_id/status
Body: { status: "resolved" }

# Flag message
POST /api/messages/admin/messages/:message_id/flag
Body: { reason }

# Get flagged messages
GET /api/messages/admin/flagged

# Search server-side messages
GET /api/messages/admin/search?query=hello

# Get statistics
GET /api/messages/admin/stats
```

---

## 🚀 Usage Examples

### Example 1: Private E2EE Chat

```javascript
// User A sends encrypted message to User B
const { publicKey, privateKey } = await generateKeys();

// Register public key
await fetch("/api/messages/keys/register", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ public_key: publicKey }),
});

// Send E2EE message
await sendE2EEMessage(userB_id, "This is a secret message!");

// ❌ Admin cannot read this message
```

### Example 2: Marketplace Chat (Admin readable)

```javascript
// Buyer contacts seller about property
socket.emit("send_message", {
  receiver_id: seller_id,
  message: "Is the price negotiable?",
  chat_type: "marketplace",
  encryption: { type: "server-side" },
  metadata: {
    property_id: property_123,
    transaction_type: "sale",
  },
});

// ✅ Admin can read this for dispute resolution
```

### Example 3: Support Chat

```javascript
// User contacts support
socket.emit("send_message", {
  receiver_id: support_admin_id,
  message: "I can't complete my KYC verification",
  chat_type: "support",
  encryption: { type: "server-side" },
});

// ✅ Admin can read and respond
```

### Example 4: Dispute Chat

```javascript
// Start dispute
POST /api/messages/chats/start
{
  "receiver_id": "seller_id",
  "chat_type": "dispute",
  "metadata": {
    "property_id": "property_123",
    "dispute_reason": "Seller not responding",
    "evidence_urls": ["https://..."]
  }
}

// ✅ Admin can review entire conversation for resolution
```

---

## 🔒 Security Considerations

### E2EE Chats

✅ **Pros:**

- Zero-knowledge: Server cannot read messages
- Perfect forward secrecy
- User privacy protected
- Compliant with privacy regulations

❌ **Cons:**

- Cannot search messages server-side
- Cannot moderate content
- Cannot recover lost messages
- Cannot resolve disputes without user cooperation

### Server-Side Chats

✅ **Pros:**

- Full search capability
- Content moderation possible
- Dispute resolution with evidence
- Backup and recovery
- Compliance with legal requirements

❌ **Cons:**

- Server can read messages
- Trust required in platform
- Potential privacy concerns

---

## 📊 Decision Matrix

**Use E2EE when:**

- Privacy is critical
- Personal conversations
- No dispute risk
- Users trust each other

**Use Server-Side when:**

- Marketplace transactions
- Money involved
- Dispute resolution needed
- Regulatory compliance required
- Customer support

---

## 🛠️ Implementation Checklist

### E2EE

- [x] RSA key pair generation
- [x] Public key storage
- [x] AES message encryption
- [x] Key exchange mechanism
- [x] Client-side encryption/decryption
- [x] Key versioning
- [x] Key revocation

### Server-Side

- [x] Plaintext message storage
- [x] Admin dashboard access
- [x] Full-text search
- [x] Message flagging
- [x] Chat assignment
- [x] Status tracking
- [x] Dispute handling

### Common

- [x] WebSocket real-time delivery
- [x] Message seen status
- [x] Multi-device sync
- [x] Offline message delivery
- [x] Attachment support (schema ready)
- [x] Soft delete

---

## 🎓 Best Practices

1. **Default to E2EE for user-to-user chats**
2. **Use Server-Side for marketplace/support/dispute**
3. **Never store private keys on server**
4. **Rotate keys periodically**
5. **Implement key backup mechanism**
6. **Log admin access to server-side chats**
7. **Implement rate limiting**
8. **Use HTTPS/WSS in production**

---

## 📚 Further Reading

- [Signal Protocol](https://signal.org/docs/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [E2EE Best Practices](https://www.eff.org/deeplinks/2021/09/understanding-end-end-encryption)
- [GDPR Compliance](https://gdpr.eu/)
