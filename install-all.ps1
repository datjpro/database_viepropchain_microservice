# Install dependencies for all microservices

Write-Host "
╔══════════════════════════════════════════════════════════════╗
║        INSTALLING DEPENDENCIES FOR ALL SERVICES              ║
╚══════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

$services = @(
    "shared",
    "services\api-gateway",
    "services\auth-service",
    "services\ipfs-service",
    "services\admin-service",
    "services\blockchain-service",
    "services\query-service",
    "services\indexer-service"
)

$total = $services.Count
$current = 0

foreach ($service in $services) {
    $current++
    Write-Host "[$current/$total] Installing $service..." -ForegroundColor Yellow
    
    if (Test-Path $service) {
        Push-Location $service
        npm install
        Pop-Location
        Write-Host "  ✅ $service completed" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $service not found" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "
╔══════════════════════════════════════════════════════════════╗
║  ✅ ALL DEPENDENCIES INSTALLED!                              ║
║                                                              ║
║  Next step: Configure .env files for each service           ║
║  See: SETUP_GUIDE.md                                         ║
╚══════════════════════════════════════════════════════════════╝
" -ForegroundColor Green
