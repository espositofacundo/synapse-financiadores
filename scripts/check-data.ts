import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkData() {
  try {
    const cases = await prisma.onboardingCase.count()
    const patients = await prisma.patient.count()
    const quotes = await prisma.patientQuote.count()
    const users = await prisma.user.count()
    
    console.log('\n📊 Datos en Supabase:')
    console.log(`   OnboardingCases: ${cases}`)
    console.log(`   Patients: ${patients}`)
    console.log(`   PatientQuotes: ${quotes}`)
    console.log(`   Users: ${users}\n`)
    
    if (cases === 0 && patients === 0 && quotes === 0) {
      console.log('⚠️  No hay datos. El seed probablemente se ejecutó contra SQLite local.')
      console.log('   Ejecuta: $env:DATABASE_URL="..."; npm run db:seed\n')
    } else {
      console.log('✅ Hay datos en la base de datos!\n')
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()
