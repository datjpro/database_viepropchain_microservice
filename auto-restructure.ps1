# ========================================================================
# AUTO-RESTRUCTURE ALL SERVICES SCRIPT
# ========================================================================
# Script này sẽ tự động tái cấu trúc tất cả các service còn lại

Write-Host "🚀 Bắt đầu tái cấu trúc các services..." -ForegroundColor Green

# ========================================================================
# BLOCKCHAIN SERVICE
# ========================================================================

Write-Host "`n📦 Tạo Blockchain Service structure..." -ForegroundColor Cyan

# Config files đã có sẵn qua previous steps

# Tạo nốt các file còn lại sẽ được tạo manual hoặc copy từ index.js cũ

# ========================================================================
# AUTH, QUERY, INDEXER SERVICES
# ========================================================================

$services = @("auth-service", "query-service", "indexer-service")

foreach ($service in $services) {
    Write-Host "`n📦 Tạo $service structure..." -ForegroundColor Cyan
    
    $basePath = "services\$service\src"
    
    # Tạo directories
    New-Item -ItemType Directory -Force -Path "$basePath\config" | Out-Null
    New-Item -ItemType Directory -Force -Path "$basePath\controllers" | Out-Null
    New-Item -ItemType Directory -Force -Path "$basePath\services" | Out-Null
    New-Item -ItemType Directory -Force -Path "$basePath\routes" | Out-Null
    
    if ($service -eq "auth-service") {
        New-Item -ItemType Directory -Force -Path "$basePath\middleware" | Out-Null
    }
    
    Write-Host "  ✅ Created $service directories" -ForegroundColor Green
}

Write-Host "`n✅ Hoàn thành tạo cấu trúc folders!" -ForegroundColor Green
Write-Host "`n📝 Tiếp theo:" -ForegroundColor Yellow
Write-Host "  1. Copy code từ index.js cũ vào các module mới"
Write-Host "  2. Update package.json của từng service"
Write-Host "  3. Test từng service"
