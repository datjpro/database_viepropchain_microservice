# 🚀 Quick Start Guide - Chọn chế độ phù hợp

## ⚡ TL;DR - Chạy ngay

```powershell
cd d:\DACN\RE-Chain\database_viepropchain_microservice
.\start.ps1
```

Chọn option:

- **[1] Development** - Nhanh, hot reload ✅ **RECOMMENDED**
- **[2] Production** - Full Docker, chậm hơn

---

## 🎯 Option 1: Development Mode (FAST - 30 giây)

### Cách hoạt động:

- ✅ MongoDB + Ganache chạy trong Docker
- ✅ 9 Microservices chạy trên host (node run.js)
- ✅ Hot reload tự động
- ✅ Build time: ~30 giây
- ✅ Logs dễ đọc hơn

### Commands:

```powershell
# 1. Start infrastructure only
docker-compose -f docker-compose.dev.yml up -d

# 2. Wait 10 seconds
Start-Sleep -Seconds 10

# 3. Start microservices
cd D:\DACN\RE-Chain
node run.js
```

### Service URLs:

- 🌐 Frontend: http://localhost:3000 (React dev server)
- 🔌 API Gateway: http://localhost:4000
- 💾 MongoDB: mongodb://localhost:27017
- ⛓️ Ganache: http://localhost:8545

### Ưu điểm:

- ⚡ Cực nhanh (chỉ build 2 containers)
- 🔥 Hot reload code
- 📊 Logs rõ ràng trong terminal riêng
- 💻 Dễ debug
- 🛠️ Dễ modify code

### Nhược điểm:

- ❌ Cần Node.js cài trên máy
- ❌ Ports phải free (3000, 4000-4010, 8545)

---

## 🐋 Option 2: Production Mode (Full Docker - 5-10 phút)

### Cách hoạt động:

- ✅ Tất cả services trong Docker
- ✅ Isolated environments
- ✅ Giống production
- ⚠️ Build time: 5-10 phút (lần đầu)

### Commands:

```powershell
# 1. Setup .env
Copy-Item .env.docker .env
notepad .env  # Fill GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# 2. Build (takes 5-10 minutes first time)
docker-compose build --parallel

# 3. Start
docker-compose up -d

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f
```

### Service URLs:

- 🌐 Frontend: http://localhost:3000 (Nginx)
- 🔌 API Gateway: http://localhost:4000
- 💾 MongoDB: mongodb://localhost:27017
- ⛓️ Ganache: http://localhost:8545

### Ưu điểm:

- ✅ Giống production
- ✅ Isolated environments
- ✅ Không cần Node.js trên máy
- ✅ Easy deploy lên server

### Nhược điểm:

- ⏱️ Build lâu (5-10 phút lần đầu)
- ⏱️ Restart chậm hơn
- 📊 Logs khó đọc hơn (phải dùng docker-compose logs)
- 🐞 Debug khó hơn

---

## 🔥 Recommended: Development Mode

**Cho development hàng ngày:**

```powershell
# Terminal 1: Infrastructure
cd d:\DACN\RE-Chain\database_viepropchain_microservice
docker-compose -f docker-compose.dev.yml up -d

# Terminal 2: Microservices
cd D:\DACN\RE-Chain
node run.js
```

**Khi cần test production build:**

```powershell
docker-compose build --parallel
docker-compose up -d
```

---

## 📊 So sánh

| Feature          | Development Mode | Production Mode |
| ---------------- | ---------------- | --------------- |
| Build time       | ~30 seconds      | 5-10 minutes    |
| Hot reload       | ✅ Yes           | ❌ No           |
| Debug            | ✅ Easy          | ⚠️ Harder       |
| Logs             | ✅ Clear         | ⚠️ Complex      |
| Isolation        | ⚠️ Partial       | ✅ Full         |
| Production-like  | ❌ No            | ✅ Yes          |
| Node.js required | ✅ Yes           | ❌ No           |

---

## 🛠️ Troubleshooting

### Development Mode issues:

```powershell
# MongoDB not starting
docker-compose -f docker-compose.dev.yml restart mongodb

# Ganache not starting
docker-compose -f docker-compose.dev.yml restart ganache

# Port conflicts
netstat -ano | findstr :27017
taskkill /F /PID <PID>
```

### Production Mode issues:

```powershell
# Build too slow
docker-compose build --parallel --no-cache

# Services not healthy
docker-compose ps
docker-compose logs <service-name>

# Restart everything
docker-compose down
docker-compose up -d --build
```

---

## 💡 Pro Tips

### Development Mode:

1. **Keep infrastructure running:**

   ```powershell
   # Start once per day
   docker-compose -f docker-compose.dev.yml up -d

   # Restart microservices anytime
   node run.js
   ```

2. **Hot reload frontend:**

   ```powershell
   cd viepropchain
   npm start  # Auto reload on code change
   ```

3. **Debug specific service:**
   ```powershell
   # In service folder
   cd services/auth-service
   npm start  # Run only this service
   ```

### Production Mode:

1. **Use build cache:**

   ```powershell
   # First build: 10 minutes
   docker-compose build

   # Rebuild with cache: 2 minutes
   docker-compose build

   # Force rebuild: 10 minutes
   docker-compose build --no-cache
   ```

2. **Selective rebuild:**

   ```powershell
   # Rebuild only one service
   docker-compose build auth-service
   docker-compose up -d --no-deps auth-service
   ```

3. **Monitor resources:**
   ```powershell
   docker stats
   ```

---

## 🎯 Best Practices

**Daily Development:**

```powershell
# Morning: Start infrastructure
docker-compose -f docker-compose.dev.yml up -d

# Work: Run microservices
node run.js

# Evening: Keep infrastructure running
# (Just stop microservices with Ctrl+C)
```

**Testing Production Build:**

```powershell
# Weekly: Test full Docker build
docker-compose build --parallel
docker-compose up -d
docker-compose ps  # Check all healthy
docker-compose down
```

**Deploying to Server:**

```powershell
# Use production mode
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d
```

---

## 🚀 Next Steps

1. Choose your mode (Development recommended)
2. Run `.\start.ps1`
3. Wait for services to start
4. Open http://localhost:3000
5. Test with Postman collection

---

**Questions?**

- Development issues → Check `node run.js` logs
- Production issues → Check `docker-compose logs`
- Build too slow → Use Development Mode!
