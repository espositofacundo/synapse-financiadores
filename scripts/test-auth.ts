import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function testAuth() {
  console.log('🔍 Probando autenticación...')
  
  try {
    // Verificar usuarios
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['cotizador@demo.com', 'aprobador@demo.com', 'oficina@demo.com', 'admin@demo.com']
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        isActive: true
      }
    })
    
    console.log(`\n📊 Usuarios encontrados: ${users.length}`)
    
    for (const user of users) {
      console.log(`\n👤 Usuario: ${user.email}`)
      console.log(`   - ID: ${user.id}`)
      console.log(`   - Nombre: ${user.name}`)
      console.log(`   - Rol: ${user.role}`)
      console.log(`   - Activo: ${user.isActive}`)
      console.log(`   - PasswordHash: ${user.passwordHash.substring(0, 20)}...`)
      
      // Probar autenticación
      const testPassword = 'demo123'
      const isValid = await bcrypt.compare(testPassword, user.passwordHash)
      console.log(`   - Password 'demo123' válido: ${isValid ? '✅ SÍ' : '❌ NO'}`)
      
      // Generar nuevo hash y comparar
      const newHash = await bcrypt.hash(testPassword, 10)
      const isValidNew = await bcrypt.compare(testPassword, newHash)
      console.log(`   - Nuevo hash funciona: ${isValidNew ? '✅ SÍ' : '❌ NO'}`)
    }
    
    // Si no hay usuarios o alguno falla, recrearlos
    if (users.length < 4) {
      console.log('\n⚠️  Faltan usuarios, recreando...')
      await recreateUsers()
    } else {
      // Verificar si alguno falla la autenticación
      const failedUsers = []
      for (const user of users) {
        const isValid = await bcrypt.compare('demo123', user.passwordHash)
        if (!isValid) {
          failedUsers.push(user.email)
        }
      }
      
      if (failedUsers.length > 0) {
        console.log(`\n⚠️  Usuarios con password inválido: ${failedUsers.join(', ')}`)
        console.log('   Recreando usuarios...')
        await recreateUsers()
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

async function recreateUsers() {
  const { hashPassword } = await import('../lib/auth')
  
  // Obtener financiador
  let financiador = await prisma.financiador.findFirst()
  if (!financiador) {
    financiador = await prisma.financiador.create({
      data: {
        id: 'default-financiador',
        nombre: 'Obra Social Demo'
      }
    })
  }
  
  const passwordHash = await bcrypt.hash('demo123', 10)
  console.log(`   Hash generado: ${passwordHash.substring(0, 20)}...`)
  
  const users = [
    { email: 'cotizador@demo.com', name: 'Cotizador Demo', role: 'COTIZADOR' },
    { email: 'aprobador@demo.com', name: 'Aprobador Demo', role: 'APROBADOR' },
    { email: 'oficina@demo.com', name: 'Oficina Demo', role: 'OFICINA' },
    { email: 'admin@demo.com', name: 'Admin Demo', role: 'ADMIN' }
  ]
  
  for (const userData of users) {
    // Eliminar si existe
    await prisma.user.deleteMany({
      where: { email: userData.email }
    })
    
    // Crear nuevo
    const user = await prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        financiadorId: financiador.id,
        isActive: true
      }
    })
    
    // Verificar inmediatamente
    const isValid = await bcrypt.compare('demo123', user.passwordHash)
    console.log(`   ✓ ${userData.email} creado - Password válido: ${isValid ? '✅' : '❌'}`)
  }
  
  console.log('\n✅ Usuarios recreados')
}

testAuth()
