# Script de Auditoria Pré-Banca (PowerShell)
Write-Host "🔍 [BANCA] Auditando ambiente do aplicativo mobile..." -ForegroundColor Cyan

Write-Host "1. Verificando TypeScript..."
npx tsc --noEmit

Write-Host "2. Testando comunicação com API local..."
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:8080/actuator/health" -TimeoutSec 3 -UseBasicParsing
    Write-Host "   ✅ API respondendo: Status $($resp.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ API local não detectada em http://localhost:8080. Inicie o backend antes da banca." -ForegroundColor Yellow
}
