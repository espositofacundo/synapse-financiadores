# Script de setup para Windows PowerShell

Write-Host "🚀 Configurando proyecto Financiadores POC..." -ForegroundColor Cyan

Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
npm install

Write-Host "🗄️ Generando cliente de Prisma..." -ForegroundColor Yellow
npm run db:generate

Write-Host "📊 Creando base de datos..." -ForegroundColor Yellow
npm run db:push

Write-Host "🌱 Poblando base de datos con datos de prueba..." -ForegroundColor Yellow
npm run db:seed

Write-Host "✅ Setup completado! Ejecuta 'npm run dev' para iniciar el servidor." -ForegroundColor Green
