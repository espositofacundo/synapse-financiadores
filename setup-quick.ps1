# Script rápido de setup
Write-Host "🔧 Configurando proyecto..." -ForegroundColor Cyan

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
node --version

# Instalar dependencias si faltan
if (-not (Test-Path "node_modules\.prisma")) {
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    npm install
}

# Generar Prisma
Write-Host "Generando cliente de Prisma..." -ForegroundColor Yellow
npm run db:generate

# Crear base de datos
Write-Host "Creando base de datos..." -ForegroundColor Yellow
npm run db:push

# Seed (opcional, puede tardar)
Write-Host "Poblando base de datos..." -ForegroundColor Yellow
npm run db:seed

Write-Host "✅ Setup completado!" -ForegroundColor Green
Write-Host "Ejecuta 'npm run dev' para iniciar el servidor" -ForegroundColor Cyan
