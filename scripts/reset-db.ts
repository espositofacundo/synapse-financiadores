import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log('🗑️  Reseteando base de datos...')
  
  try {
    // Cerrar conexión de Prisma
    await prisma.$disconnect()
    
    // Eliminar archivo de SQLite si existe
    const dbPath = path.join(__dirname, '../prisma/dev.db')
    const dbPathWAL = path.join(__dirname, '../prisma/dev.db-wal')
    const dbPathSHM = path.join(__dirname, '../prisma/dev.db-shm')
    
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath)
      console.log('   ✓ Archivo dev.db eliminado')
    }
    
    if (fs.existsSync(dbPathWAL)) {
      fs.unlinkSync(dbPathWAL)
      console.log('   ✓ Archivo dev.db-wal eliminado')
    }
    
    if (fs.existsSync(dbPathSHM)) {
      fs.unlinkSync(dbPathSHM)
      console.log('   ✓ Archivo dev.db-shm eliminado')
    }
    
    // Regenerar Prisma Client
    console.log('   🔄 Regenerando Prisma Client...')
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    // Aplicar schema
    console.log('   🔄 Aplicando schema...')
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
    
    // Ejecutar seed
    console.log('   🌱 Ejecutando seed...')
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' })
    
    console.log('✅ Base de datos reseteada exitosamente')
  } catch (error) {
    console.error('❌ Error reseteando base de datos:', error)
    process.exit(1)
  }
}

resetDatabase()
