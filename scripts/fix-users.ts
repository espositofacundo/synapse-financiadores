import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

async function fixUsers() {
  console.log('🔧 Verificando y corrigiendo usuarios demo...')
  
  try {
    // Obtener financiador
    let financiador = await prisma.financiador.findFirst()
    if (!financiador) {
      financiador = await prisma.financiador.create({
        data: {
          id: 'default-financiador',
          nombre: 'Obra Social Demo'
        }
      })
      console.log('   ✓ Financiador creado')
    }
    
    const passwordHash = await hashPassword('demo123')
    
    // Verificar y crear/actualizar usuarios
    const users = [
      { email: 'cotizador@demo.com', name: 'Cotizador Demo', role: 'COTIZADOR' },
      { email: 'aprobador@demo.com', name: 'Aprobador Demo', role: 'APROBADOR' },
      { email: 'oficina@demo.com', name: 'Oficina Demo', role: 'OFICINA' },
      { email: 'admin@demo.com', name: 'Admin Demo', role: 'ADMIN' }
    ]
    
    for (const userData of users) {
      const existing = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      
      if (existing) {
        // Actualizar si el passwordHash está mal o el usuario está inactivo
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            isActive: true,
            financiadorId: financiador.id
          }
        })
        console.log(`   ✓ Usuario ${userData.email} actualizado`)
      } else {
        // Crear si no existe
        await prisma.user.create({
          data: {
            ...userData,
            passwordHash,
            financiadorId: financiador.id,
            isActive: true
          }
        })
        console.log(`   ✓ Usuario ${userData.email} creado`)
      }
    }
    
    console.log('✅ Usuarios verificados y corregidos')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixUsers()
