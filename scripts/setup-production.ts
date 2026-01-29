import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/auth'

const prisma = new PrismaClient()

/**
 * Script para configurar la base de datos en producción
 * Ejecutar después del primer deploy
 */
async function setupProduction() {
  console.log('🚀 Configurando base de datos para producción...\n')
  
  try {
    // Verificar conexión
    await prisma.$connect()
    console.log('✅ Conexión a base de datos exitosa\n')
    
    // Verificar si ya hay usuarios
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      console.log(`⚠️  Ya existen ${userCount} usuarios en la base de datos`)
      console.log('   Si quieres recrear los usuarios demo, ejecuta: npm run db:fix-users\n')
    } else {
      console.log('📝 Creando usuarios demo...')
      
      // Obtener o crear financiador
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
      
      const users = [
        { email: 'cotizador@demo.com', name: 'Cotizador Demo', role: 'COTIZADOR' },
        { email: 'aprobador@demo.com', name: 'Aprobador Demo', role: 'APROBADOR' },
        { email: 'oficina@demo.com', name: 'Oficina Demo', role: 'OFICINA' },
        { email: 'admin@demo.com', name: 'Admin Demo', role: 'ADMIN' }
      ]
      
      for (const userData of users) {
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
    
    // Verificar si hay casos de onboarding
    const caseCount = await prisma.onboardingCase.count()
    if (caseCount === 0) {
      console.log('\n📊 No hay casos de onboarding. Ejecuta: npm run db:seed para generar datos de prueba')
    } else {
      console.log(`\n📊 Existen ${caseCount} casos de onboarding`)
    }
    
    console.log('\n✅ Configuración completada')
    console.log('\n🔑 Credenciales de acceso:')
    console.log('   • cotizador@demo.com / demo123')
    console.log('   • aprobador@demo.com / demo123')
    console.log('   • oficina@demo.com / demo123')
    console.log('   • admin@demo.com / demo123')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setupProduction()
