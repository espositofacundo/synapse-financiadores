# Script para subir código a GitHub
# Ejecuta este script DESPUÉS de instalar Git

Write-Host "🚀 Preparando para subir a GitHub..." -ForegroundColor Cyan
Write-Host ""

# Verificar si Git está instalado
try {
    $gitVersion = git --version
    Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git no está instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor instala Git desde: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "O usa GitHub Desktop: https://desktop.github.com" -ForegroundColor Yellow
    exit 1
}

# Cambiar al directorio del proyecto
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = Split-Path -Parent $projectPath
Set-Location $projectPath

Write-Host "📁 Directorio: $projectPath" -ForegroundColor Cyan
Write-Host ""

# Verificar si ya es un repositorio Git
if (Test-Path .git) {
    Write-Host "✅ Git ya está inicializado" -ForegroundColor Green
} else {
    Write-Host "🔄 Inicializando Git..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git inicializado" -ForegroundColor Green
}

# Verificar remote
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "✅ Remote ya configurado: $remote" -ForegroundColor Green
} else {
    Write-Host "🔄 Configurando remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/espositofacundo/synapse-financiadores.git
    Write-Host "✅ Remote configurado" -ForegroundColor Green
}

# Agregar archivos
Write-Host ""
Write-Host "📦 Agregando archivos..." -ForegroundColor Yellow
git add .

# Verificar si hay cambios
$status = git status --porcelain
if ($status) {
    Write-Host "✅ Archivos agregados" -ForegroundColor Green
    Write-Host ""
    Write-Host "💾 Haciendo commit..." -ForegroundColor Yellow
    git commit -m "Preparado para producción - Synapse Financiadores"
    Write-Host "✅ Commit realizado" -ForegroundColor Green
} else {
    Write-Host "⚠️  No hay cambios para commitear" -ForegroundColor Yellow
}

# Configurar branch main
Write-Host ""
Write-Host "🌿 Configurando branch main..." -ForegroundColor Yellow
git branch -M main 2>$null
Write-Host "✅ Branch configurado" -ForegroundColor Green

# Push
Write-Host ""
Write-Host "📤 Subiendo a GitHub..." -ForegroundColor Yellow
Write-Host "⚠️  Si te pide autenticación, usa tu Personal Access Token" -ForegroundColor Yellow
Write-Host ""

try {
    git push -u origin main
    Write-Host ""
    Write-Host "✅ ¡Código subido exitosamente a GitHub!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔗 Repositorio: https://github.com/espositofacundo/synapse-financiadores" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "❌ Error al subir. Verifica:" -ForegroundColor Red
    Write-Host "   1. Tu conexión a internet" -ForegroundColor Yellow
    Write-Host "   2. Tus credenciales de GitHub" -ForegroundColor Yellow
    Write-Host "   3. Que tengas permisos en el repositorio" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Tip: Usa GitHub Desktop si tienes problemas: https://desktop.github.com" -ForegroundColor Cyan
}
