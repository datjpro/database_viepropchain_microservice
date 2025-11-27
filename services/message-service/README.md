# Message Service

Real-time messaging service với WebSocket (Socket.IO) và REST API.

## Tính năng

### ✅ Đã triển khai
- **Real-time messaging** qua WebSocket
- **Lịch sử chat** với pagination
- **Typing indicators** (đang gõ...)
- **Message seen/unread** tracking
- **Multi-device sync** (nhiều thiết bị cùng lúc)
- **Offline message delivery** (lưu DB, gửi khi online)
- **Search messages** (full-text search)
- **Soft delete** messages
- **Unread count** tracking
- **Chat metadata** (property_id, transaction_type)

## Cài đặt

```bash
cd database_viepropchain_microservice/services/message-service
npm install
```

## Cấu hình

Tạo file `.env`:
```env
PORT=4008
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
UPLOAD_DIR=uploads/attachments
MAX_FILE_SIZE=10485760
```

## Chạy Service

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### REST API

**Base URL:** `http://localhost:4008/api/messages`

#### 1. Get All Chats
```http
GET /chats
Authorization: Bearer <token>
Query: ?page=1&limit=20
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "chat_id": "chat_userId1_userId2",
      "other_user": {
        "_id": "...",
        "email": "user@example.com",
        "profile": {...}
      },
      "last_message": "Hello!",
      "last_message_at": "2025-11-27T...",
      "unread_count": 3
    }
  ],
  "pagination": {...}
}
```

#### 2. Get Chat History
```http
GET /chats/:receiver_id/messages
Authorization: Bearer <token>
Query: ?page=1&limit=50
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "chat_id": "chat_...",
      "sender_id": {...},
      "receiver_id": {...},
      "message": "Hello!",
      "seen": true,
      "attachments": [],
      "createdAt": "2025-11-27T..."
    }
  ],
  "pagination": {...}
}
```

#### 3. Search Messages
```http
GET /search?query=hello&receiver_id=<optional>
Authorization: Bearer <token>
```

#### 4. Mark as Seen
```http
PUT /chats/:chat_id/seen
Authorization: Bearer <token>
```

#### 5. Delete Message
```http
DELETE /messages/:message_id
Authorization: Bearer <token>
```

#### 6. Get Unread Count
```http
GET /unread-count
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "unread_count": 15
}
```

### WebSocket Events

**Connect:** `ws://localhost:4008`

#### Client → Server

**1. Send Message**
```javascript
socket.emit('send_message', {
  receiver_id: '674abc...',
  message: 'Hello!',
  attachments: [
    {
      type: 'image',
      url: 'https://...',
      filename: 'photo.jpg',
      size: 123456
    }
  ],
  metadata: {
    property_id: '...',
    transaction_type: 'sale'
  }
});
```

**2. Typing Indicator**
```javascript
socket.emit('typing', {
  receiver_id: '674abc...'
});
```

**3. Stop Typing**
```javascript
socket.emit('stop_typing', {
  receiver_id: '674abc...'
});
```

**4. Mark as Seen**
```javascript
socket.emit('mark_seen', {
  chat_id: 'chat_userId1_userId2'
});
```

#### Server → Client

**1. New Message**
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data.data);
});
```

**2. Message Sent Confirmation**
```javascript
socket.on('message_sent', (data) => {
  console.log('Message sent:', data.data);
});
```

**3. User Typing**
```javascript
socket.on('user_typing', (data) => {
  console.log(`${data.email} is typing...`);
});
```

**4. User Stop Typing**
```javascript
socket.on('user_stop_typing', (data) => {
  console.log('User stopped typing');
});
```

**5. Messages Seen**
```javascript
socket.on('messages_seen', (data) => {
  console.log('Messages seen in:', data.chat_id);
});
```

**6. User Status Change**
```javascript
socket.on('user_status_change', (data) => {
  console.log(`User ${data.user_id} is ${data.online ? 'online' : 'offline'}`);
});
```

## Frontend Integration Example

### React Hook
```javascript
import { io } from 'socket.io-client';
import { useEffect, useState } from 'react';

function useChat(receiverId) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('viepropchain_token');
    
    // Connect to WebSocket
    const newSocket = io('http://localhost:4008', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat');
    });

    newSocket.on('new_message', (data) => {
      setMessages(prev => [...prev, data.data]);
    });

    newSocket.on('user_typing', () => {
      setIsTyping(true);
    });

    newSocket.on('user_stop_typing', () => {
      setIsTyping(false);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const sendMessage = (message) => {
    socket.emit('send_message', {
      receiver_id: receiverId,
      message
    });
  };

  const startTyping = () => {
    socket.emit('typing', { receiver_id: receiverId });
  };

  const stopTyping = () => {
    socket.emit('stop_typing', { receiver_id: receiverId });
  };

  return { messages, sendMessage, startTyping, stopTyping, isTyping };
}
```

## Database Schema

### Messages Collection
```javascript
{
  chat_id: String,              // Unique chat identifier
  sender_id: ObjectId,          // User reference
  receiver_id: ObjectId,        // User reference
  message: String,              // Message content
  attachments: [],              // Files/images
  seen: Boolean,                // Read status
  seen_at: Date,                // When seen
  deleted_by: [ObjectId],       // Soft delete
  edited: Boolean,              // Edit status
  edited_at: Date,              // When edited
  createdAt: Date,              // Auto timestamp
  updatedAt: Date               // Auto timestamp
}
```

### Chats Collection
```javascript
{
  chat_id: String,              // Unique identifier
  participants: [ObjectId],     // User references
  last_message: String,         // Latest message
  last_message_at: Date,        // Latest message time
  last_message_by: ObjectId,    // Who sent last
  unread_count: Map,            // userId → count
  archived_by: [ObjectId],      // Archived users
  blocked_by: Object,           // Block info
  metadata: {
    property_id: ObjectId,      // Related property
    nft_id: ObjectId,           // Related NFT
    transaction_type: String    // sale/rental/auction
  }
}
```

## Quy trình hoạt động

### 1. Gửi tin nhắn
```
User A → Socket.emit('send_message') 
→ Server lưu DB 
→ Server emit 'new_message' → User B (nếu online)
→ Server emit 'message_sent' → User A (confirmation)
```

### 2. Nhận tin khi offline
```
User B offline → tin nhắn lưu trong DB
User B online lại → GET /chats/:receiver_id/messages
→ Load toàn bộ lịch sử
```

### 3. Multi-device sync
```
User A có 3 thiết bị (Web, Mobile, Tablet)
→ Tất cả join room `user_${userId}`
→ Message phát tới tất cả thiết bị
→ Seen status sync realtime
```

## Tích hợp với API Gateway

Thêm vào `api-gateway/index.js`:

```javascript
app.use('/api/messages', createProxyMiddleware({
  target: 'http://localhost:4008',
  changeOrigin: true,
  pathRewrite: {
    '^/api/messages': '/api/messages'
  },
  ws: true, // Enable WebSocket proxy
  onError: (err, req, res) => {
    res.status(503).json({
      success: false,
      error: 'Message service unavailable'
    });
  }
}));
```

## Performance Tips

1. **Index optimization** - Đã tạo compound indexes
2. **Pagination** - Luôn dùng limit/skip
3. **Soft delete** - Không xóa vật lý, chỉ đánh dấu
4. **Connection pooling** - MongoDB tự động quản lý
5. **Socket rooms** - Dùng rooms thay vì broadcast toàn bộ

## Bảo mật

- ✅ JWT authentication cho cả HTTP và WebSocket
- ✅ User chỉ thấy tin nhắn của mình
- ✅ Không thể giả mạo sender_id
- ✅ Soft delete thay vì hard delete
- ⚠️ TODO: Rate limiting cho spam prevention
- ⚠️ TODO: File upload validation

## Troubleshooting

### Socket không kết nối được
```javascript
// Check token format
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});
```

### Message không gửi được
- Kiểm tra token hợp lệ
- Kiểm tra receiver_id tồn tại
- Xem console logs ở server

### Không nhận được message realtime
- Check socket connected: `socket.connected`
- Check joined room: Server logs sẽ hiển thị
- Check network tab trong DevTools

## License
MIT
