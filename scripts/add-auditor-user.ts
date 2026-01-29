import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

/**
 * Script para agregar usuario Auditor demo
 * Ejecutar: npx tsx scripts/add-auditor-user.ts
 */
async function addAuditorUser() {
  console.log('🔐 Agregando usuario Auditor demo...\n')
  
  try {
    await prisma.$connect()
    
    // Verificar si ya existe
    const existing = await prisma.user.findUnique({
      where: { email: 'auditor@demo.com' }
    })
    
    if (existing) {
      console.log('⚠️  El usuario auditor@demo.com ya existe')
      return
    }
    
    // Obtener financiador
    const financiador = await prisma.financiador.findFirst()
    if (!financiador) {
      console.log('⚠️ No hay financiador. Ejecutá setup-production primero.')
      process.exit(1)
    }
    
    const passwordHash = await hashPassword('demo123')
    
    await prisma.user.create({
      data: {
        email: 'auditor@demo.com',
        name: 'Auditor Demo',
        role: 'AUDITOR',
        passwordHash,
        financiadorId: financiador.id,
        isActive: true
      }
    })
    
    console.log('✅ Usuario auditor@demo.com creado')
    console.log('\n🔑 Credenciales:')
    console.log('   Email: auditor@demo.com')
    console.log('   Password: demo123')
    console.log('\n📋 Permisos del rol AUDITOR:')
    console.log('   • Consultas / Prácticas (lectura + importar)')
    console.log('   • Auditoría IA (ejecutar auditorías)')
    console.log('   • Hallazgos (gestionar)')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

addAuditorUser()
