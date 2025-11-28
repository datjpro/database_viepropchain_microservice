# 🐋 Docker Setup - Complete Guide

## ✅ Đã tạo các file:

1. **`Dockerfile`** (Backend) - Multi-service Node.js image
2. **`Dockerfile`** (Frontend) - React production build với Nginx
3. **`docker-compose.yml`** - Full microservices orchestration
4. **`.env.docker`** - Environment variables template
5. **`.dockerignore`** - Exclude unnecessary files
6. **`nginx.conf`** - Frontend reverse proxy configuration
7. **`docker-setup.ps1`** - Automated setup script (Windows)
8. **`docker-setup.sh`** - Automated setup script (Linux/Mac)

---

## 🚀 Quick Start (Windows)

```powershell
cd d:\DACN\RE-Chain\database_viepropchain_microservice

# Run automated setup
.\docker-setup.ps1
```

Hoặc manual:

```powershell
# 1. Copy environment file
Copy-Item .env.docker .env

# 2. Edit .env file (fill in Google OAuth credentials)
notepad .env

# 3. Build và start
docker-compose build
docker-compose up -d

# 4. Check logs
docker-compose logs -f
```

---

## 📋 Kiến trúc Docker

### Services (11 containers):

| Service             | Container Name           | Port  | Purpose           |
| ------------------- | ------------------------ | ----- | ----------------- |
| MongoDB             | viepropchain-mongodb     | 27017 | Database          |
| Ganache             | viepropchain-ganache     | 8545  | Blockchain        |
| Auth Service        | viepropchain-auth        | 4010  | Gmail OAuth + JWT |
| IPFS Service        | viepropchain-ipfs        | 4002  | File upload       |
| Admin Service       | viepropchain-admin       | 4003  | Property approval |
| Blockchain Service  | viepropchain-blockchain  | 4004  | Smart contracts   |
| Indexer Service     | viepropchain-indexer     | 4005  | Event listener    |
| User Service        | viepropchain-user        | 4006  | User management   |
| KYC Service         | viepropchain-kyc         | 4007  | KYC verification  |
| Message Service     | viepropchain-message     | 4008  | E2EE messaging    |
| Marketplace Service | viepropchain-marketplace | 4009  | Orders            |
| API Gateway         | viepropchain-gateway     | 4000  | Route aggregator  |
| Frontend            | viepropchain-frontend    | 3000  | React UI          |

### Volumes:

- `mongodb-data`: Persistent MongoDB storage
- `ganache-data`: Persistent blockchain data
- `ipfs-data`: Uploaded files

### Network:

- `viepropchain-network`: Bridge network for inter-service communication

---

## ⚙️ Environment Variables (Required)

Edit `.env` file:

```env
# Google OAuth (REQUIRED)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Pinata IPFS (Optional - for public IPFS)
PINATA_API_KEY=your-api-key
PINATA_SECRET_KEY=your-secret-key

# Security (Auto-generated, can customize)
JWT_SECRET=viepropchain-super-secret-jwt-key-2025
SESSION_SECRET=viepropchain-session-secret-2025

# Database (Auto-configured)
MONGODB_URI=mongodb://admin:viepropchain2025@mongodb:27017/viepropchain?authSource=admin

# Blockchain (Auto-configured)
OPERATOR_WALLET_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
OPERATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Google OAuth Setup:

1. Go to: https://console.cloud.google.com/
2. Create new project: "ViePropChain"
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI:
   ```
   http://localhost:4000/api/auth/google/callback
   ```
6. Copy Client ID and Client Secret to `.env`

---

## 📊 Commands Cheat Sheet

### Start/Stop

```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v

# Restart all
docker-compose restart

# Restart specific service
docker-compose restart auth-service
```

### Logs

```powershell
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f api-gateway

# Last 100 lines
docker-compose logs --tail=100 auth-service
```

### Build

```powershell
# Build all
docker-compose build

# Build without cache
docker-compose build --no-cache

# Rebuild and restart
docker-compose up -d --build
```

### Status

```powershell
# Check running containers
docker-compose ps

# Check resource usage
docker stats

# Check network
docker network inspect database_viepropchain_microservice_viepropchain-network
```

### Database

```powershell
# Connect to MongoDB
docker-compose exec mongodb mongosh -u admin -p viepropchain2025

# Inside MongoDB shell:
use viepropchain
db.users.find().pretty()
db.properties.find().pretty()
```

### Execute Commands

```powershell
# Open shell in container
docker-compose exec auth-service sh

# Run migration
docker-compose exec api-gateway node migrate-to-utility-first.js

# Check Node version
docker-compose exec auth-service node --version
```

---

## 🔍 Health Checks

```powershell
# Test all services
curl http://localhost:4000/health  # API Gateway
curl http://localhost:4010/health  # Auth Service
curl http://localhost:4003/health  # Admin Service
curl http://localhost:4004/health  # Blockchain Service
curl http://localhost:4009/health  # Marketplace Service

# Test MongoDB
docker-compose exec mongodb mongosh -u admin -p viepropchain2025 --eval "db.adminCommand('ping')"

# Test Ganache
curl -X POST http://localhost:8545 -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

---

## 🐛 Troubleshooting

### Services won't start

```powershell
# Check logs
docker-compose logs

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port conflicts

```powershell
# Check what's using port
netstat -ano | findstr :4000

# Kill process
taskkill /F /PID <PID>
```

### MongoDB connection issues

```powershell
# Check MongoDB is running
docker-compose ps mongodb

# Check logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

### Out of disk space

```powershell
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Clean everything (⚠️ careful!)
docker system prune -a --volumes
```

### Services show "unhealthy"

```powershell
# Wait 30 seconds for startup
Start-Sleep -Seconds 30

# Check specific service logs
docker-compose logs auth-service

# Restart unhealthy service
docker-compose restart auth-service
```

---

## 🎯 Testing After Deployment

### 1. Check Frontend

Open browser: http://localhost:3000

### 2. Test API Gateway

```powershell
curl http://localhost:4000/api/auth/google
```

### 3. Test Authentication

Open browser: http://localhost:4010/auth/google

### 4. Test Database

```powershell
docker-compose exec mongodb mongosh -u admin -p viepropchain2025
```

### 5. Import Postman Collection

Import: `ViePropChain_Utility_First.postman_collection.json`

Set environment:

- `base_url`: `http://localhost:4000`

### 6. Run Migration

```powershell
docker-compose exec api-gateway node migrate-to-utility-first.js
```

---

## 🔐 Production Deployment

### 1. Update .env for production

```env
NODE_ENV=production
JWT_SECRET=<generate-strong-random-string>
SESSION_SECRET=<generate-strong-random-string>
MONGO_ROOT_PASSWORD=<strong-password>
FRONTEND_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
```

### 2. Use docker-compose.prod.yml

Create separate production config with:

- SSL certificates
- Nginx reverse proxy
- Health checks
- Restart policies
- Resource limits

### 3. Deploy to server

```bash
# On server
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📖 Full Documentation

- **DOCKER_DEPLOYMENT_GUIDE.md** - Complete Docker guide
- **POSTMAN_TESTING_GUIDE.md** - API testing guide
- **MIGRATION_UTILITY_FIRST.md** - Architecture migration guide

---

## ⚡ Performance Tips

1. **Allocate more RAM to Docker** (Settings → Resources → 8GB+)
2. **Use volumes for node_modules** (faster builds)
3. **Enable BuildKit**: `$env:DOCKER_BUILDKIT=1`
4. **Use multi-stage builds** (already implemented)
5. **Prune regularly**: `docker system prune`

---

## 🎉 Success!

Your ViePropChain platform is now running in Docker containers!

**Access URLs:**

- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- API Docs: See `POSTMAN_TESTING_GUIDE.md`

**Next Steps:**

1. Login via Gmail: http://localhost:4010/auth/google
2. Import Postman collection
3. Start testing API endpoints
4. Deploy smart contracts (if needed)

---

**Questions?** Check `DOCKER_DEPLOYMENT_GUIDE.md` for detailed troubleshooting.
