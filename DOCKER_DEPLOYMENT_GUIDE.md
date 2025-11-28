# 🐋 Docker Deployment Guide - ViePropChain

## 📋 Prerequisites

- Docker Desktop installed (Windows/Mac) or Docker Engine (Linux)
- Docker Compose V2
- Minimum 8GB RAM allocated to Docker
- 20GB free disk space

## 🚀 Quick Start

### 1. Setup Environment Variables

```bash
cd database_viepropchain_microservice
cp .env.docker .env
```

Edit `.env` file and fill in required values:

- `GOOGLE_CLIENT_ID` - Get from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - Get from Google Cloud Console
- `PINATA_API_KEY` - Get from Pinata (for IPFS)
- `PINATA_SECRET_KEY` - Get from Pinata

### 2. Build and Start All Services

```bash
# Build all images
docker-compose build

# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

### 3. Check Service Health

```bash
# Check all containers
docker-compose ps

# Check specific service logs
docker-compose logs -f api-gateway
docker-compose logs -f auth-service
docker-compose logs -f mongodb

# Check health endpoints
curl http://localhost:4000/health  # API Gateway
curl http://localhost:4010/health  # Auth Service
curl http://localhost:4003/health  # Admin Service
```

## 🔧 Service Architecture

### Ports Mapping

| Service             | Internal Port | External Port | URL                       |
| ------------------- | ------------- | ------------- | ------------------------- |
| Frontend            | 3000          | 3000          | http://localhost:3000     |
| API Gateway         | 4000          | 4000          | http://localhost:4000     |
| IPFS Service        | 4002          | 4002          | http://localhost:4002     |
| Admin Service       | 4003          | 4003          | http://localhost:4003     |
| Blockchain Service  | 4004          | 4004          | http://localhost:4004     |
| Indexer Service     | 4005          | 4005          | http://localhost:4005     |
| User Service        | 4006          | 4006          | http://localhost:4006     |
| KYC Service         | 4007          | 4007          | http://localhost:4007     |
| Message Service     | 4008          | 4008          | http://localhost:4008     |
| Marketplace Service | 4009          | 4009          | http://localhost:4009     |
| Auth Service        | 4010          | 4010          | http://localhost:4010     |
| MongoDB             | 27017         | 27017         | mongodb://localhost:27017 |
| Ganache             | 8545          | 8545          | http://localhost:8545     |

### Docker Network

All services run in `viepropchain-network` bridge network for inter-service communication.

### Volumes

- `mongodb-data`: Persistent MongoDB data
- `ganache-data`: Persistent blockchain data
- `ipfs-data`: IPFS uploaded files

## 🛠️ Development Commands

### Start/Stop Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d auth-service

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v

# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart api-gateway
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service

# Last 100 lines
docker-compose logs --tail=100 api-gateway

# Since 10 minutes ago
docker-compose logs --since 10m
```

### Execute Commands Inside Container

```bash
# Open shell in container
docker-compose exec auth-service sh

# Run npm install
docker-compose exec auth-service npm install

# Check MongoDB connection
docker-compose exec mongodb mongosh -u admin -p viepropchain2025

# Check Node.js version
docker-compose exec api-gateway node --version
```

### Rebuild Services

```bash
# Rebuild all
docker-compose build

# Rebuild without cache
docker-compose build --no-cache

# Rebuild specific service
docker-compose build auth-service

# Rebuild and restart
docker-compose up -d --build
```

## 🔍 Monitoring & Debugging

### Check Container Status

```bash
# List all containers
docker-compose ps

# Inspect container
docker inspect viepropchain-auth

# Check resource usage
docker stats
```

### Database Access

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh -u admin -p viepropchain2025

# Inside MongoDB shell
use viepropchain
db.users.find().pretty()
db.properties.find().pretty()
```

### Network Debugging

```bash
# List networks
docker network ls

# Inspect network
docker network inspect database_viepropchain_microservice_viepropchain-network

# Test connectivity from one service to another
docker-compose exec api-gateway ping mongodb
docker-compose exec auth-service wget -qO- http://mongodb:27017
```

## 📊 Production Deployment

### Environment Variables for Production

1. Change all secrets in `.env`:

   ```bash
   JWT_SECRET=<strong-random-string>
   SESSION_SECRET=<strong-random-string>
   MONGO_ROOT_PASSWORD=<strong-password>
   ```

2. Set `NODE_ENV=production`

3. Configure proper Google OAuth URLs:
   ```bash
   GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
   FRONTEND_URL=https://yourdomain.com
   ```

### SSL/TLS Configuration

Add nginx reverse proxy or use Traefik:

```yaml
# docker-compose.prod.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
```

### Scaling Services

```bash
# Scale specific service
docker-compose up -d --scale user-service=3

# Load balancing with nginx upstream
```

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Remove old containers and restart
docker-compose down
docker-compose up -d

# Check port conflicts
netstat -ano | findstr :4000
```

### Database Connection Issues

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check MongoDB logs
docker-compose logs mongodb

# Verify connection string
docker-compose exec auth-service env | grep MONGODB_URI
```

### Build Failures

```bash
# Clean build cache
docker builder prune

# Remove old images
docker image prune -a

# Rebuild from scratch
docker-compose build --no-cache
```

### Network Issues

```bash
# Recreate network
docker-compose down
docker network prune
docker-compose up -d
```

### Out of Disk Space

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything (⚠️ careful!)
docker system prune -a --volumes
```

## 🔐 Security Best Practices

1. **Never commit `.env` file** - Use `.env.example` as template
2. **Use strong passwords** - Generate random secrets
3. **Limit exposed ports** - Only expose necessary ports
4. **Use secrets management** - For production, use Docker secrets or Vault
5. **Regular updates** - Keep base images updated
6. **Network isolation** - Use separate networks for different services
7. **Read-only containers** - Where possible, use read-only filesystem

## 📝 Useful Commands Reference

```bash
# View all images
docker images

# Remove specific image
docker rmi viepropchain-auth

# View all volumes
docker volume ls

# Remove specific volume
docker volume rm database_viepropchain_microservice_mongodb-data

# Export container logs
docker-compose logs > logs.txt

# Copy files from container
docker cp viepropchain-auth:/app/logs ./local-logs

# Update single service without downtime
docker-compose up -d --no-deps --build auth-service
```

## 🎯 Testing the Deployment

### 1. Health Checks

```bash
# Test all services
curl http://localhost:4000/health
curl http://localhost:4010/health
curl http://localhost:4003/health
```

### 2. Database Connection

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh -u admin -p viepropchain2025 --eval "db.adminCommand('ping')"
```

### 3. Blockchain Connection

```bash
# Check Ganache
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### 4. API Gateway

```bash
# Test routing
curl http://localhost:4000/api/auth/google
curl http://localhost:4000/api/admin/properties
```

### 5. Frontend

Open browser: http://localhost:3000

## 📖 Next Steps

1. Configure Google OAuth in Google Cloud Console
2. Setup Pinata account for IPFS
3. Deploy smart contracts to Ganache
4. Run migration script: `docker-compose exec api-gateway node migrate-to-utility-first.js`
5. Import Postman collection and start testing

---

🎉 **Ready to deploy!** Your ViePropChain platform is now running in Docker containers.
