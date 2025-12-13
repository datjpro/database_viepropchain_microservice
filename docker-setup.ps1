# ============================================================================
# Docker Quick Setup Script for Windows (PowerShell)
# ============================================================================

Write-Host "🐋 ViePropChain Docker Setup" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Check Docker installation
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
$composeInstalled = Get-Command docker-compose -ErrorAction SilentlyContinue

if (-not $dockerInstalled) {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

if (-not $composeInstalled) {
    Write-Host "❌ Docker Compose is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker is installed" -ForegroundColor Green
Write-Host "✅ Docker Compose is installed" -ForegroundColor Green
Write-Host ""

# Create .env if not exists
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.docker .env
    Write-Host ""
    Write-Host "⚠️  Please edit .env file and fill in required values:" -ForegroundColor Yellow
    Write-Host "   - GOOGLE_CLIENT_ID" -ForegroundColor White
    Write-Host "   - GOOGLE_CLIENT_SECRET" -ForegroundColor White
    Write-Host "   - PINATA_API_KEY (optional)" -ForegroundColor White
    Write-Host "   - PINATA_SECRET_KEY (optional)" -ForegroundColor White
    Write-Host ""
    
    # Open .env in default editor
    notepad .env
    
    Read-Host "Press Enter after editing .env file"
}

# Clean up old containers
Write-Host "🧹 Cleaning up old containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Build images
Write-Host "🔨 Building Docker images (this may take a few minutes)..." -ForegroundColor Yellow
docker-compose build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Please check the errors above." -ForegroundColor Red
    exit 1
}

# Start services
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services. Please check the errors above." -ForegroundColor Red
    exit 1
}

# Wait for services to start
Write-Host "⏳ Waiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Yellow

$services = @(
    @{Name="API Gateway"; URL="http://localhost:4000/health"},
    @{Name="Auth Service"; URL="http://localhost:4010/health"},
    @{Name="Admin Service"; URL="http://localhost:4003/health"},
    @{Name="MongoDB"; URL="http://localhost:27017"}
)

foreach ($service in $services) {
    try {
        $response = Invoke-WebRequest -Uri $service.URL -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ $($service.Name) is healthy" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $($service.Name) returned status $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  $($service.Name) may still be starting..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "🎉 ViePropChain is running!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Cyan
Write-Host "   🌐 Frontend:        http://localhost:3000" -ForegroundColor White
Write-Host "   🔌 API Gateway:     http://localhost:4000" -ForegroundColor White
Write-Host "   🔐 Auth Service:    http://localhost:4010" -ForegroundColor White
Write-Host "   💾 MongoDB:         mongodb://localhost:27017" -ForegroundColor White
Write-Host "   ⛓️  Ganache:         http://localhost:8545" -ForegroundColor White
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs:          docker-compose logs -f" -ForegroundColor White
Write-Host "   Stop services:      docker-compose down" -ForegroundColor White
Write-Host "   Restart:            docker-compose restart" -ForegroundColor White
Write-Host "   Check status:       docker-compose ps" -ForegroundColor White
Write-Host ""
Write-Host "📖 Full guide: See DOCKER_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

# Ask if user wants to open frontend
$openBrowser = Read-Host "Do you want to open the frontend in browser? (Y/N)"
if ($openBrowser -eq "Y" -or $openBrowser -eq "y") {
    Start-Process "http://localhost:3000"
}

# Ask if user wants to view logs
$viewLogs = Read-Host "Do you want to view service logs? (Y/N)"
if ($viewLogs -eq "Y" -or $viewLogs -eq "y") {
    docker-compose logs -f
}
