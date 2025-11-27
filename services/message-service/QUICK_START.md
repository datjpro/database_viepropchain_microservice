# Message Service - Quick Start Guide

## 📦 Installation

```bash
cd database_viepropchain_microservice/services/message-service
npm install
```

## 🔧 Configuration

File `.env` đã được tạo sẵn với cấu hình:
```env
PORT=4008
MONGODB_URI=mongodb+srv://db_dacn:123456%40ABC@dacn.swowsqw.mongodb.net/viepropchain
JWT_SECRET=viepropchain-secret-key-2025-secure-production
```

## 🚀 Running the Service

### Option 1: Standalone
```bash
cd database_viepropchain_microservice/services/message-service
npm start
```

### Option 2: Development with auto-reload
```bash
npm run dev
```

### Option 3: With all services
Sử dụng `run.js` ở root:
```bash
node run.js
```

## ✅ Testing

### 1. Check Service Health
```bash
curl http://localhost:4008/health
```

Expected response:
```json
{
  "success": true,
  "service": "message-service",
  "status": "running",
  "timestamp": "2025-11-27T..."
}
```

### 2. Test WebSocket Connection (Browser Console)

```javascript
// Connect to WebSocket
const token = localStorage.getItem('viepropchain_token');
const socket = io('http://localhost:4008', {
  auth: { token }
});

socket.on('connect', () => {
  console.log('✅ Connected!');
});

// Send a message
socket.emit('send_message', {
  receiver_id: '674abc123...',  // Replace with real user ID
  message: 'Hello from test!'
});

// Listen for new messages
socket.on('new_message', (data) => {
  console.log('📩 New message:', data);
});
```

### 3. Test REST API

**Get all chats:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4008/api/messages/chats
```

**Get chat history:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:4008/api/messages/chats/USER_ID/messages?limit=20"
```

**Get unread count:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:4008/api/messages/unread-count
```

## 🔗 API Gateway Integration

API Gateway đã được cập nhật với routes:
- `GET /api/messages/*` → Message Service (HTTP)
- `ws://localhost:4000/socket.io` → Message Service (WebSocket)

**Frontend kết nối qua Gateway:**
```javascript
const socket = io('http://localhost:4000', {
  auth: { token }
});
```

## 📱 Frontend Integration

### Install Socket.IO Client
```bash
cd viepropchain
npm install socket.io-client
```

### Copy Example Component
```bash
# Copy Chat.js and Chat.css từ folder example-frontend
cp database_viepropchain_microservice/services/message-service/example-frontend/Chat.js viepropchain/src/components/Chat/
cp database_viepropchain_microservice/services/message-service/example-frontend/Chat.css viepropchain/src/components/Chat/
```

### Usage in React
```javascript
import Chat from './components/Chat/Chat';

function PropertyDetail({ property }) {
  return (
    <div>
      <h1>{property.name}</h1>
      
      {/* Chat with property owner */}
      <Chat 
        receiverId={property.owner_id} 
        receiverName={property.owner_name}
      />
    </div>
  );
}
```

## 🎯 Use Cases

### 1. Marketplace - Buyer contacts Seller
```javascript
// On property detail page
<Chat 
  receiverId={property.seller_id}
  receiverName={property.seller_name}
  metadata={{
    property_id: property._id,
    transaction_type: 'sale'
  }}
/>
```

### 2. Support Chat
```javascript
<Chat 
  receiverId={ADMIN_USER_ID}
  receiverName="Customer Support"
/>
```

### 3. Rental Inquiry
```javascript
<Chat 
  receiverId={property.landlord_id}
  receiverName={property.landlord_name}
  metadata={{
    property_id: property._id,
    transaction_type: 'rental'
  }}
/>
```

## 📊 Database Collections

Service tự động tạo 2 collections:

### `messages`
```javascript
{
  chat_id: "chat_userId1_userId2",
  sender_id: ObjectId,
  receiver_id: ObjectId,
  message: "Hello!",
  attachments: [],
  seen: false,
  createdAt: ISODate("2025-11-27T...")
}
```

### `chats`
```javascript
{
  chat_id: "chat_userId1_userId2",
  participants: [ObjectId, ObjectId],
  last_message: "Hello!",
  last_message_at: ISODate("2025-11-27T..."),
  unread_count: { "userId1": 3, "userId2": 0 },
  metadata: {
    property_id: ObjectId,
    transaction_type: "sale"
  }
}
```

## 🐛 Troubleshooting

### WebSocket không kết nối được
**Lỗi:** `Authentication error: No token provided`

**Solution:**
```javascript
// Đảm bảo token được gửi đúng format
const token = localStorage.getItem('viepropchain_token');
const socket = io('http://localhost:4008', {
  auth: { token }  // ✅ Correct
  // NOT: headers: { Authorization: `Bearer ${token}` }
});
```

### Không nhận được tin nhắn real-time
**Check:**
1. Socket connected: `socket.connected` → `true`
2. Browser console có log "✅ Connected to chat server"
3. Network tab có WebSocket connection màu xanh

### Message không lưu vào DB
**Check:**
1. MongoDB connection thành công
2. JWT token hợp lệ (decode tại jwt.io)
3. receiver_id tồn tại trong database

### CORS error
**Solution:**
```javascript
// Trong message-service/index.js đã config:
io: {
  cors: {
    origin: "*", // Cho phép tất cả origins
    methods: ["GET", "POST"]
  }
}
```

## 📈 Performance Tips

1. **Pagination** - Luôn giới hạn số message load:
   ```javascript
   GET /chats/:id/messages?limit=50&page=1
   ```

2. **Lazy loading** - Load thêm khi scroll lên:
   ```javascript
   const loadMore = async (page) => {
     const response = await fetch(`/api/messages/chats/${id}/messages?page=${page}`);
   }
   ```

3. **Optimistic UI** - Hiển thị message ngay, không chờ server:
   ```javascript
   setMessages(prev => [...prev, tempMessage]);
   socket.emit('send_message', data);
   ```

4. **Debounce typing** - Giảm số lần emit:
   ```javascript
   const handleTyping = debounce(() => {
     socket.emit('typing', { receiver_id });
   }, 300);
   ```

## 🔒 Security Checklist

- ✅ JWT authentication cho HTTP và WebSocket
- ✅ User chỉ thấy tin nhắn của mình
- ✅ sender_id được lấy từ token, không thể giả mạo
- ✅ Soft delete (không xóa vật lý)
- ⚠️ TODO: Rate limiting (chống spam)
- ⚠️ TODO: File upload size limit
- ⚠️ TODO: Profanity filter

## 📚 Further Reading

- Socket.IO Documentation: https://socket.io/docs/v4/
- MongoDB Indexes: https://www.mongodb.com/docs/manual/indexes/
- JWT Best Practices: https://jwt.io/introduction

## 🆘 Support

Nếu gặp vấn đề:
1. Check service logs trong console
2. Check MongoDB connection
3. Check JWT token validity
4. Check Browser Network/Console tabs
5. Review README.md trong message-service folder
