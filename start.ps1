# ============================================================================
# Quick Start Scripts
# ============================================================================

Write-Host "🚀 ViePropChain Quick Start Options" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""

Write-Host "Choose deployment mode:" -ForegroundColor Yellow
Write-Host ""
Write-Host "[1] Development Mode (FAST - Recommended)" -ForegroundColor Green
Write-Host "    - Only MongoDB + Ganache in Docker" -ForegroundColor White
Write-Host "    - Services run on host with node run.js" -ForegroundColor White
Write-Host "    - Build time: ~30 seconds" -ForegroundColor White
Write-Host "    - Hot reload supported" -ForegroundColor White
Write-Host ""
Write-Host "[2] Production Mode (Full Docker)" -ForegroundColor Yellow
Write-Host "    - All services in Docker containers" -ForegroundColor White
Write-Host "    - Build time: ~5-10 minutes (first time)" -ForegroundColor White
Write-Host "    - Isolated environments" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1 or 2)"

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "🚀 Starting Development Mode..." -ForegroundColor Green
    Write-Host ""
    
    # Start only MongoDB and Ganache
    Write-Host "📦 Starting MongoDB + Ganache..." -ForegroundColor Yellow
    docker-compose -f docker-compose.dev.yml up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Infrastructure started!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Wait 10 seconds for MongoDB to start" -ForegroundColor White
        Write-Host "   2. Run: cd D:\DACN\RE-Chain" -ForegroundColor White
        Write-Host "   3. Run: node run.js" -ForegroundColor White
        Write-Host ""
        Write-Host "🔍 Service URLs:" -ForegroundColor Cyan
        Write-Host "   MongoDB: mongodb://localhost:27017" -ForegroundColor White
        Write-Host "   Ganache: http://localhost:8545" -ForegroundColor White
        Write-Host ""
        
        $runNow = Read-Host "Do you want to start microservices now? (Y/N)"
        if ($runNow -eq "Y" -or $runNow -eq "y") {
            Start-Sleep -Seconds 10
            Write-Host ""
            Write-Host "🚀 Starting microservices..." -ForegroundColor Green
            cd D:\DACN\RE-Chain
            node run.js
        }
    } else {
        Write-Host "❌ Failed to start infrastructure" -ForegroundColor Red
    }
    
} elseif ($choice -eq "2") {
    Write-Host ""
    Write-Host "🚀 Starting Production Mode (Full Docker)..." -ForegroundColor Yellow
    Write-Host "⚠️  This will take 5-10 minutes on first build..." -ForegroundColor Yellow
    Write-Host ""
    
    # Check .env file
    if (-not (Test-Path .env)) {
        Write-Host "📝 Creating .env file..." -ForegroundColor Yellow
        Copy-Item .env.docker .env
        Write-Host ""
        Write-Host "⚠️  Please edit .env file and add:" -ForegroundColor Yellow
        Write-Host "   - GOOGLE_CLIENT_ID" -ForegroundColor White
        Write-Host "   - GOOGLE_CLIENT_SECRET" -ForegroundColor White
        Write-Host ""
        notepad .env
        Read-Host "Press Enter after editing .env"
    }
    
    # Build and start
    Write-Host "🔨 Building Docker images..." -ForegroundColor Yellow
    docker-compose build --parallel
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🚀 Starting all services..." -ForegroundColor Yellow
        docker-compose up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ All services started!" -ForegroundColor Green
            Write-Host ""
            Write-Host "⏳ Waiting for services to be ready (60 seconds)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 60
            Write-Host ""
            Write-Host "🔍 Checking service health..." -ForegroundColor Yellow
            docker-compose ps
            Write-Host ""
            Write-Host "📊 Service URLs:" -ForegroundColor Cyan
            Write-Host "   Frontend:      http://localhost:3000" -ForegroundColor White
            Write-Host "   API Gateway:   http://localhost:4000" -ForegroundColor White
            Write-Host "   Auth Service:  http://localhost:4010" -ForegroundColor White
        }
    } else {
        Write-Host "❌ Build failed" -ForegroundColor Red
    }
    
} else {
    Write-Host "❌ Invalid choice" -ForegroundColor Red
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
