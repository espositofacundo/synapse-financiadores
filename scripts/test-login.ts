import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testLogin() {
  console.log('🔍 Probando login completo...\n')
  
  try {
    const testUsers = [
      { email: 'cotizador@demo.com', password: 'demo123' },
      { email: 'aprobador@demo.com', password: 'demo123' },
      { email: 'oficina@demo.com', password: 'demo123' },
      { email: 'admin@demo.com', password: 'demo123' }
    ]
    
    for (const test of testUsers) {
      console.log(`\n📧 Probando: ${test.email}`)
      
      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { email: test.email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          isActive: true,
          role: true
        }
      })
      
      if (!user) {
        console.log('   ❌ Usuario no encontrado')
        continue
      }
      
      console.log(`   ✓ Usuario encontrado (ID: ${user.id})`)
      console.log(`   ✓ Activo: ${user.isActive}`)
      console.log(`   ✓ Rol: ${user.role}`)
      console.log(`   ✓ Hash: ${user.passwordHash.substring(0, 30)}...`)
      
      // Probar contraseña
      const isValid = await bcrypt.compare(test.password, user.passwordHash)
      console.log(`   ${isValid ? '✅' : '❌'} Password válido: ${isValid}`)
      
      if (!isValid) {
        console.log('   ⚠️  Regenerando hash...')
        const newHash = await bcrypt.hash(test.password, 10)
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: newHash }
        })
        console.log('   ✓ Hash regenerado')
        
        // Verificar de nuevo
        const isValidAfter = await bcrypt.compare(test.password, newHash)
        console.log(`   ${isValidAfter ? '✅' : '❌'} Password válido después de regenerar: ${isValidAfter}`)
      }
    }
    
    console.log('\n✅ Prueba completada')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testLogin()
