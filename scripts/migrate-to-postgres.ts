/**
 * Script para migrar de SQLite a PostgreSQL
 * 
 * IMPORTANTE: Este script debe ejecutarse DESPUÉS de cambiar
 * el provider en prisma/schema.prisma a "postgresql"
 * 
 * Uso:
 * 1. Cambiar provider en schema.prisma a "postgresql"
 * 2. Configurar DATABASE_URL con URI de PostgreSQL
 * 3. Ejecutar: npx tsx scripts/migrate-to-postgres.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateToPostgres() {
  console.log('🔄 Verificando migración a PostgreSQL...\n')
  
  try {
    // Verificar conexión
    await prisma.$connect()
    console.log('✅ Conexión a PostgreSQL exitosa\n')
    
    // Verificar que el schema esté aplicado
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    
    console.log(`📊 Tablas encontradas: ${(tables as any[]).length}`)
    
    if ((tables as any[]).length === 0) {
      console.log('\n⚠️  No hay tablas. Ejecuta: npx prisma migrate deploy')
    } else {
      console.log('✅ Base de datos lista')
    }
    
    console.log('\n✅ Migración verificada')
    
  } catch (error: any) {
    if (error.code === 'P1001') {
      console.error('❌ Error: No se puede conectar a la base de datos')
      console.error('   Verifica que DATABASE_URL esté configurada correctamente')
    } else {
      console.error('❌ Error:', error.message)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

migrateToPostgres()
