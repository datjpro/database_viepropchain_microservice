# ViePropChain Microservices - Start All Services

Write-Host "
╔══════════════════════════════════════════════════════════════╗
║           VIEPROPCHAIN MICROSERVICES STARTER                 ║
╚══════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Check if MongoDB is running
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoTest = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($mongoTest) {
        Write-Host "✅ MongoDB is running on port 27017" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB is NOT running. Please start MongoDB first!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "⚠️  Cannot check MongoDB status" -ForegroundColor Yellow
}

# Check if Ganache is running
Write-Host "Checking Ganache..." -ForegroundColor Yellow
try {
    $ganacheTest = Test-NetConnection -ComputerName localhost -Port 8545 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($ganacheTest) {
        Write-Host "✅ Ganache is running on port 8545" -ForegroundColor Green
    } else {
        Write-Host "❌ Ganache is NOT running. Please start Ganache first!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "⚠️  Cannot check Ganache status" -ForegroundColor Yellow
}

Write-Host ""

# Start services in separate windows
$services = @(
    @{Name="API Gateway"; Port=4000; Path="services\api-gateway"},
    @{Name="Auth Service"; Port=4001; Path="services\auth-service"},
    @{Name="IPFS Service"; Port=4002; Path="services\ipfs-service"},
    @{Name="Admin Service"; Port=4003; Path="services\admin-service"},
    @{Name="Blockchain Service"; Port=4004; Path="services\blockchain-service"},
    @{Name="Query Service"; Port=4005; Path="services\query-service"},
    @{Name="Indexer Service"; Port="Worker"; Path="services\indexer-service"}
)

foreach ($service in $services) {
    Write-Host "Starting $($service.Name)..." -ForegroundColor Yellow
    
    # Check if .env exists, if not copy from .env.example
    $envPath = Join-Path $service.Path ".env"
    $envExamplePath = Join-Path $service.Path ".env.example"
    
    if (-not (Test-Path $envPath) -and (Test-Path $envExamplePath)) {
        Write-Host "  Creating .env from .env.example" -ForegroundColor Gray
        Copy-Item $envExamplePath $envPath
    }
    
    # Start service in new window
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$($service.Path)'; Write-Host '[$($service.Name)]' -ForegroundColor Cyan; npm start"
    
    Write-Host "✅ $($service.Name) started (Port: $($service.Port))" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  All services started!                                       ║" -ForegroundColor Cyan
Write-Host "║                                                              ║" -ForegroundColor Cyan
Write-Host "║  API Gateway:        http://localhost:4000                   ║" -ForegroundColor Cyan
Write-Host "║  Auth Service:       http://localhost:4001                   ║" -ForegroundColor Cyan
Write-Host "║  IPFS Service:       http://localhost:4002                   ║" -ForegroundColor Cyan
Write-Host "║  Admin Service:      http://localhost:4003                   ║" -ForegroundColor Cyan
Write-Host "║  Blockchain Service: http://localhost:4004                   ║" -ForegroundColor Cyan
Write-Host "║  Query Service:      http://localhost:4005                   ║" -ForegroundColor Cyan
Write-Host "║  Indexer Service:    Background Worker                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to stop all services..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
