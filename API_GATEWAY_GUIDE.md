# 🚪 API GATEWAY - ENTRY POINT VÀO HỆ THỐNG

## 📖 API Gateway là gì?

**API Gateway** là **single entry point** (cổng vào duy nhất) cho tất cả requests từ frontend/mobile app vào hệ thống microservices.

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend/Mobile App                       │
│              (React, Vue, React Native, etc.)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ All requests đi qua 1 URL duy nhất
                       │ https://api.viepropchain.com
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY                             │
│                    (Port 4001/4005)                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ • Authentication (JWT, Wallet Signature)             │    │
│  │ • Rate Limiting (1000 req/hour/user)                 │    │
│  │ • Logging (Winston, Morgan)                          │    │
│  │ • CORS Handling                                      │    │
│  │ • Request Routing                                    │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┬──────────────┐
         │             │             │              │
         ▼             ▼             ▼              ▼
    ┌────────┐   ┌─────────┐   ┌────────┐   ┌──────────┐
    │ Admin  │   │  IPFS   │   │  User  │   │   KYC    │
    │Service │   │ Service │   │Service │   │ Service  │
    │ :4003  │   │  :4002  │   │ :4006  │   │  :4007   │
    └────────┘   └─────────┘   └────────┘   └──────────┘
```

---

## 🎯 Chức năng chính của API Gateway

### 1. **Request Routing** - Điều hướng requests

Map từ 1 URL public → các internal services:

```javascript
// Frontend chỉ gọi 1 domain
https://api.viepropchain.com/properties → Admin Service :4003
https://api.viepropchain.com/ipfs      → IPFS Service  :4002
https://api.viepropchain.com/users     → User Service  :4006
https://api.viepropchain.com/kyc       → KYC Service   :4007
```

**Lợi ích:**

- Frontend không cần biết internal ports
- Dễ scale: thêm/bớt service instances không ảnh hưởng frontend
- Security: che giấu internal architecture

---

### 2. **Authentication & Authorization** - Xác thực

Kiểm tra **JWT token** hoặc **wallet signature** trước khi forward request:

```javascript
// Frontend gửi request với JWT
GET /properties
Headers: {
  Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// API Gateway verify JWT
if (valid) {
  forward to Admin Service with user info
} else {
  return 401 Unauthorized
}
```

**Protected endpoints:**

- `/properties/mint` - Chỉ admin
- `/properties/:id/update` - Chỉ owner
- `/nfts/:tokenId/price` - Chỉ NFT owner

---

### 3. **Rate Limiting** - Giới hạn requests

Ngăn spam, DDoS:

```javascript
// Giới hạn 1000 requests/hour/user
{
  "error": "Rate limit exceeded",
  "retryAfter": "3600 seconds"
}
```

**Rate limit tiers:**

- Public endpoints: 100 req/hour
- Authenticated users: 1000 req/hour
- Premium users: 10000 req/hour
- Internal services: Unlimited

---

### 4. **Logging & Monitoring** - Ghi log

Log tất cả requests qua gateway:

```javascript
[2025-10-22 10:15:30] POST /properties/mint
  IP: 118.70.xxx.xxx
  User: 0xC6890b26A32d9d92aefbc8635C4588247529CdfE
  Duration: 1250ms
  Status: 200 OK
```

**Metrics tracked:**

- Request count by endpoint
- Average response time
- Error rate
- User activity patterns

---

### 5. **Load Balancing** - Phân tải

Nếu có nhiều instances của 1 service:

```
API Gateway
     │
     ├─► Admin Service #1 (10.0.0.1:4003)
     ├─► Admin Service #2 (10.0.0.2:4003)
     └─► Admin Service #3 (10.0.0.3:4003)
```

**Strategies:**

- Round-robin: xoay vòng
- Least connections: ít kết nối nhất
- IP hash: same user → same instance

---

### 6. **CORS Handling** - Cross-Origin

Xử lý CORS để frontend (domain khác) có thể gọi API:

```javascript
Access-Control-Allow-Origin: https://viepropchain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

---

## 🔧 Triển khai API Gateway

### Option 1: Custom Express Gateway (đơn giản)

```javascript
// services/api-gateway/index.js
const express = require("express");
const proxy = require("express-http-proxy");

const app = express();

// Route to services
app.use("/properties", proxy("http://localhost:4003"));
app.use("/ipfs", proxy("http://localhost:4002"));
app.use("/users", proxy("http://localhost:4006"));
app.use("/kyc", proxy("http://localhost:4007"));

app.listen(4001);
```

**Pros:** Đơn giản, dễ customize

**Cons:** Phải tự implement authentication, rate limiting

---

### Option 2: Kong API Gateway (production-ready)

Kong là API Gateway framework phổ biến nhất.

**Setup:**

```bash
# Install Kong
docker run -d --name kong \
  -e "KONG_DATABASE=postgres" \
  -e "KONG_PG_HOST=postgres" \
  -p 8000:8000 -p 8001:8001 \
  kong:latest

# Add service
curl -X POST http://localhost:8001/services \
  --data "name=admin-service" \
  --data "url=http://localhost:4003"

# Add route
curl -X POST http://localhost:8001/services/admin-service/routes \
  --data "paths[]=/properties"

# Add JWT plugin
curl -X POST http://localhost:8001/services/admin-service/plugins \
  --data "name=jwt"
```

**Pros:**

- Production-ready
- 100+ plugins (JWT, rate limiting, logging...)
- Dashboard UI
- High performance

**Cons:** Phức tạp hơn, cần học thêm

---

### Option 3: AWS API Gateway (cloud)

Nếu deploy trên AWS.

**Setup:**

1. Create API Gateway REST API
2. Create resources: `/properties`, `/ipfs`, `/users`
3. Link to Lambda/ECS services
4. Enable Cognito authorizer
5. Deploy to stage

**Pros:** Serverless, auto-scale, built-in auth

**Cons:** Vendor lock-in, AWS-specific

---

## 🚀 Hiện tại trong project của bạn

### Folder structure:

```
services/
  api-gateway/
    index.js         # Gateway server
    package.json
    config/
      routes.js      # Service routing config
      auth.js        # JWT middleware
```

### Code hiện tại (services/api-gateway/index.js):

```javascript
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

// Middleware
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// TODO: Implement routing to services
// TODO: Implement JWT authentication
// TODO: Implement rate limiting

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
```

**⚠️ Chưa được implement đầy đủ!**

---

## 📋 TODO: Implement API Gateway

### 1. Add routing to services

```javascript
const proxy = require("express-http-proxy");

app.use("/api/properties", proxy("http://localhost:4003"));
app.use("/api/ipfs", proxy("http://localhost:4002"));
app.use("/api/users", proxy("http://localhost:4006"));
app.use("/api/kyc", proxy("http://localhost:4007"));
app.use("/api/nfts", proxy("http://localhost:4003/nfts"));
```

---

### 2. Add JWT authentication middleware

```javascript
const jwt = require("jsonwebtoken");

const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};

// Protected routes
app.use("/api/properties/mint", authenticateJWT);
app.use("/api/nfts/:tokenId/price", authenticateJWT);
```

---

### 3. Add rate limiting

```javascript
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  message: "Too many requests, please try again later",
});

app.use("/api/", limiter);
```

---

### 4. Add logging

```javascript
const winston = require("winston");

const logger = winston.createLogger({
  transports: [new winston.transports.File({ filename: "gateway.log" })],
});

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - User: ${req.user?.walletAddress}`);
  next();
});
```

---

## 🧪 Test API Gateway

### Trước khi có Gateway (hiện tại):

```javascript
// Frontend gọi trực tiếp từng service
fetch("http://localhost:4003/properties");
fetch("http://localhost:4002/upload/image");
fetch("http://localhost:4006/profiles");
```

**❌ Problems:**

- Frontend biết internal ports
- Không có authentication centralized
- Khó scale

---

### Sau khi có Gateway:

```javascript
// Frontend chỉ gọi 1 domain
const API_URL = "https://api.viepropchain.com"; // Production
// const API_URL = "http://localhost:4001"; // Development

fetch(`${API_URL}/api/properties`, {
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
});
```

**✅ Benefits:**

- Clean, professional
- Dễ deploy, dễ maintain
- Centralized auth, logging, rate limiting

---

## 📊 So sánh: Có vs Không có Gateway

| Aspect            | Không có Gateway                    | Có Gateway                         |
| ----------------- | ----------------------------------- | ---------------------------------- |
| **Frontend code** | Nhiều URLs, ports                   | 1 base URL duy nhất                |
| **Security**      | Mỗi service tự handle auth          | Centralized authentication         |
| **Monitoring**    | Log rải rác ở từng service          | Centralized logging                |
| **Rate limiting** | Khó control                         | Dễ implement                       |
| **CORS**          | Config ở từng service               | Config 1 lần ở gateway             |
| **Deploy**        | Phải expose nhiều ports             | Expose 1 port duy nhất             |
| **Scalability**   | Frontend phải update code khi scale | Gateway handle load balancing      |
| **Professional**  | ❌ Không professional (hobby level) | ✅ Professional (production-ready) |

---

## 🎯 Recommendation cho project của bạn

### Phase 1: Testing (hiện tại)

- **Gọi trực tiếp vào services** (localhost:4003, 4002...)
- Tập trung implement business logic
- Gateway chưa cần thiết

### Phase 2: Implement simple gateway

```javascript
// services/api-gateway/index.js
const proxy = require("express-http-proxy");

app.use("/api/properties", proxy("http://localhost:4003"));
app.use("/api/ipfs", proxy("http://localhost:4002"));
app.use("/api/users", proxy("http://localhost:4006"));
app.use("/api/kyc", proxy("http://localhost:4007"));
app.use("/api/nfts", proxy("http://localhost:4003/nfts"));
```

Test: `http://localhost:4001/api/properties`

### Phase 3: Add authentication

```javascript
const authenticateJWT = require("./middleware/auth");

app.use("/api/properties/mint", authenticateJWT);
app.use("/api/nfts/:tokenId/price", authenticateJWT);
```

### Phase 4: Production với Kong/AWS

Khi deploy production, migrate sang Kong hoặc AWS API Gateway.

---

## 📚 Resources

- [Kong API Gateway](https://konghq.com/)
- [AWS API Gateway](https://aws.amazon.com/api-gateway/)
- [Express HTTP Proxy](https://www.npmjs.com/package/express-http-proxy)
- [API Gateway Pattern](https://microservices.io/patterns/apigateway.html)

---

## ✅ Summary

**API Gateway = Cổng vào duy nhất cho hệ thống microservices**

**Chức năng:**

1. Request routing
2. Authentication
3. Rate limiting
4. Logging
5. Load balancing
6. CORS handling

**Hiện tại:** Test trực tiếp vào services (OK cho development)

**Tương lai:** Implement Gateway cho production-ready system

---

Chúc bạn thành công! 🚀
