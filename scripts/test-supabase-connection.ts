/**
 * Script para probar la conexión a Supabase
 * 
 * Uso:
 * 1. Crea .env.local con DATABASE_URL de Supabase
 * 2. Ejecuta: npx tsx scripts/test-supabase-connection.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { PrismaClient } from '@prisma/client'

// Cargar variables de entorno desde .env.local
try {
  const envPath = resolve(process.cwd(), '.env.local')
  const envFile = readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      // Remover comillas si existen
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
} catch (error) {
  // Si no existe .env.local, continuar (puede estar en variables de entorno del sistema)
}

const prisma = new PrismaClient()

async function testConnection() {
  console.log('🔍 Probando conexión a Supabase...\n')
  
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL no está configurada')
    console.error('   Crea un archivo .env.local con:')
    console.error('   DATABASE_URL="postgresql://postgres:password@host:5432/postgres"')
    process.exit(1)
  }
  
  // Ocultar password en el log
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@')
  console.log(`📡 Intentando conectar a: ${maskedUrl}\n`)
  
  try {
    // Probar conexión
    await prisma.$connect()
    console.log('✅ Conexión exitosa!\n')
    
    // Verificar tablas
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `
    
    console.log(`📊 Tablas encontradas: ${tables.length}`)
    if (tables.length > 0) {
      console.log('\n   Tablas:')
      tables.forEach(table => {
        console.log(`   - ${table.table_name}`)
      })
    } else {
      console.log('\n⚠️  No hay tablas. Ejecuta: npx prisma db push')
    }
    
    // Verificar usuarios
    try {
      const userCount = await prisma.user.count()
      console.log(`\n👥 Usuarios en la base de datos: ${userCount}`)
      
      if (userCount > 0) {
        const users = await prisma.user.findMany({
          select: {
            email: true,
            name: true,
            role: true,
            isActive: true
          },
          take: 5
        })
        console.log('\n   Primeros usuarios:')
        users.forEach(user => {
          console.log(`   - ${user.email} (${user.role})`)
        })
      } else {
        console.log('\n💡 Ejecuta: npm run db:setup-prod para crear usuarios demo')
      }
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('\n⚠️  La tabla User no existe aún')
        console.log('   Ejecuta: npx prisma db push')
      } else {
        throw error
      }
    }
    
    console.log('\n✅ Prueba completada exitosamente')
    
  } catch (error: any) {
    console.error('\n❌ Error de conexión:')
    
    if (error.code === 'P1001') {
      console.error('   No se puede conectar a la base de datos')
      console.error('\n   Posibles causas:')
      console.error('   1. DATABASE_URL incorrecta')
      console.error('   2. Contraseña incorrecta')
      console.error('   3. Firewall bloqueando la conexión')
      console.error('   4. Base de datos no existe o no está activa')
      console.error('\n   Solución:')
      console.error('   - Verifica la URI en Supabase Dashboard')
      console.error('   - Asegúrate de reemplazar [YOUR-PASSWORD] con tu contraseña real')
      console.error('   - Verifica que el proyecto esté activo en Supabase')
    } else if (error.code === 'P1000') {
      console.error('   Error de autenticación')
      console.error('   - Verifica que la contraseña sea correcta')
      console.error('   - Asegúrate de que la URI tenga el formato correcto')
    } else {
      console.error(`   ${error.message}`)
      if (error.code) {
        console.error(`   Código: ${error.code}`)
      }
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
