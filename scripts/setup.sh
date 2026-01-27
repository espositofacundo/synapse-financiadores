#!/bin/bash

echo "🚀 Configurando proyecto Financiadores POC..."

echo "📦 Instalando dependencias..."
npm install

echo "🗄️ Generando cliente de Prisma..."
npm run db:generate

echo "📊 Creando base de datos..."
npm run db:push

echo "🌱 Poblando base de datos con datos de prueba..."
npm run db:seed

echo "✅ Setup completado! Ejecuta 'npm run dev' para iniciar el servidor."
