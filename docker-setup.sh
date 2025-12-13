#!/bin/bash

# ============================================================================
# Docker Quick Setup Script
# ============================================================================

echo "🐋 ViePropChain Docker Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker is installed"
echo "✅ Docker Compose is installed"
echo ""

# Create .env if not exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.docker .env
    echo "⚠️  Please edit .env file and fill in required values:"
    echo "   - GOOGLE_CLIENT_ID"
    echo "   - GOOGLE_CLIENT_SECRET"
    echo "   - PINATA_API_KEY (optional)"
    echo "   - PINATA_SECRET_KEY (optional)"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Clean up old containers
echo "🧹 Cleaning up old containers..."
docker-compose down 2>/dev/null

# Build images
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
services=(
    "mongodb:27017"
    "ganache:8545"
    "api-gateway:4000"
    "auth-service:4010"
    "admin-service:4003"
)

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if docker-compose exec -T $name wget -q --spider http://localhost:$port/health 2>/dev/null; then
        echo "✅ $name is healthy"
    else
        echo "⚠️  $name may still be starting..."
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 ViePropChain is running!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Service URLs:"
echo "   🌐 Frontend:        http://localhost:3000"
echo "   🔌 API Gateway:     http://localhost:4000"
echo "   🔐 Auth Service:    http://localhost:4010"
echo "   💾 MongoDB:         mongodb://localhost:27017"
echo "   ⛓️  Ganache:         http://localhost:8545"
echo ""
echo "📋 Useful commands:"
echo "   View logs:          docker-compose logs -f"
echo "   Stop services:      docker-compose down"
echo "   Restart:            docker-compose restart"
echo ""
echo "📖 Full guide: See DOCKER_DEPLOYMENT_GUIDE.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
