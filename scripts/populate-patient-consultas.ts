import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Script para poblar consultas de prueba para un paciente específico
 * Basado en el escenario descrito: 14 consultas en 60 días, 7 guardias, 9 prestadores, 36% no efectivas
 */
async function main() {
  const patientNroDoc = '36383630' // Facundo Esposito
  
  // Buscar paciente
  const patient = await prisma.patient.findFirst({
    where: {
      nroDoc: patientNroDoc,
      financiadorId: 'default-financiador'
    },
    include: {
      financiador: true
    }
  })

  if (!patient) {
    console.error('❌ Paciente no encontrado con DNI:', patientNroDoc)
    process.exit(1)
  }

  console.log(`✅ Paciente encontrado: ${patient.nombre} ${patient.apellido}`)
  console.log(`📊 Consultas actuales: ${await prisma.consulta.count({ where: { patientId: patient.id } })}`)

  // Obtener prestadores existentes
  const prestadores = await prisma.prestador.findMany({ take: 30 })
  if (prestadores.length < 9) {
    console.error('❌ Se necesitan al menos 9 prestadores. Ejecuta el seed primero.')
    process.exit(1)
  }

  // Crear 14 consultas en los últimos 60 días
  const ahora = new Date()
  const hace60dias = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000)
  
  const especialidades = ['clínica', 'cardio', 'gineco', 'traumatología', 'psiquiatría']
  const canales = ['guardia', 'programada', 'telemedicina']
  const motivosConsulta = ['Dolor', 'Fiebre', 'Control', 'Seguimiento', 'Urgencia']
  
  // Distribución: 7 guardias, resto programadas/telemedicina
  const consultasData = []
  const prestadoresUsados = new Set<string>()
  
  for (let i = 0; i < 14; i++) {
    const diasAtras = Math.random() * 60 // Últimos 60 días
    const fecha = new Date(ahora.getTime() - diasAtras * 24 * 60 * 60 * 1000)
    
    // 7 guardias (50%)
    const canal = i < 7 ? 'guardia' : Math.random() > 0.5 ? 'programada' : 'telemedicina'
    const especialidad = especialidades[Math.floor(Math.random() * especialidades.length)]
    
    // Costo variable (algunas más caras para llegar a percentil 92)
    let costo = 0
    if (especialidad === 'cardio' || especialidad === 'traumatología') {
      costo = Math.floor(8000 + Math.random() * 7000) // 8000-15000
    } else if (especialidad === 'psiquiatría') {
      costo = Math.floor(6000 + Math.random() * 6000) // 6000-12000
    } else {
      costo = Math.floor(3000 + Math.random() * 5000) // 3000-8000
    }
    
    // 36% no efectivas (5 de 14)
    const efectiva = i >= 9 // Últimas 5 no efectivas
    
    // Seleccionar prestador diferente (9 prestadores distintos)
    let prestadorId = prestadores[Math.floor(Math.random() * prestadores.length)].id
    if (prestadoresUsados.size < 9) {
      // Asegurar que usemos 9 prestadores distintos
      while (prestadoresUsados.has(prestadorId) && prestadoresUsados.size < prestadores.length) {
        prestadorId = prestadores[Math.floor(Math.random() * prestadores.length)].id
      }
      prestadoresUsados.add(prestadorId)
    }
    
    // Algunas con derivación sin seguimiento
    const deriva = Math.random() < 0.4 && i < 10 // 40% derivan, pero no las últimas
    const prestadorDerivado = deriva ? prestadores[Math.floor(Math.random() * prestadores.length)].id : null
    
    consultasData.push({
      fecha,
      especialidad,
      canal,
      costo,
      duracion: Math.floor(15 + Math.random() * 45), // 15-60 min
      efectiva,
      motivoNoEfectiva: efectiva ? null : 'paciente ausente',
      diagnostico: efectiva && Math.random() > 0.2 ? `${especialidad} - Control` : null, // 20% sin diagnóstico
      motivoConsulta: motivosConsulta[Math.floor(Math.random() * motivosConsulta.length)],
      deriva,
      tipoDerivacion: deriva ? 'especialista' : null,
      prestadorDerivado,
      patientId: patient.id,
      afiliadoId: null,
      prestadorId,
      financiadorId: patient.financiadorId,
      riskScore: 0,
      riskLevel: 'bajo',
      resumenClinico: efectiva ? `Consulta de ${especialidad} por ${motivosConsulta[Math.floor(Math.random() * motivosConsulta.length)]}` : null,
      trazabilidad: JSON.stringify([
        { evento: 'creada', fecha: new Date(fecha.getTime() - 60 * 60 * 1000), usuario: 'Sistema' },
        { evento: efectiva ? 'atendida' : 'cancelada', fecha, usuario: 'Prestador' }
      ])
    })
  }

  // Crear consultas
  console.log('🔄 Creando 14 consultas...')
  for (const data of consultasData) {
    await prisma.consulta.create({ data })
  }

  console.log(`✅ ${consultasData.length} consultas creadas`)
  console.log(`   - Guardias: ${consultasData.filter(c => c.canal === 'guardia').length}`)
  console.log(`   - Prestadores distintos: ${prestadoresUsados.size}`)
  console.log(`   - No efectivas: ${consultasData.filter(c => !c.efectiva).length} (${(consultasData.filter(c => !c.efectiva).length / consultasData.length * 100).toFixed(0)}%)`)
  console.log(`   - Con derivación: ${consultasData.filter(c => c.deriva).length}`)
  
  // Recalcular riesgo
  console.log('🔄 Recalculando riesgo...')
  const { procesarRiesgoPacienteV2, defaultRiskConfig } = await import('../lib/patient-risk-v2')
  const riskConfig = { ...defaultRiskConfig, financiadorId: patient.financiadorId }
  if (patient.planNombre) {
    riskConfig.planNombre = patient.planNombre
  }
  
  const assessment = await procesarRiesgoPacienteV2(patient.id, riskConfig)
  
  console.log(`\n📊 Resultado del cálculo de riesgo:`)
  console.log(`   - Risk Score: ${assessment.riskGlobalScore}/100`)
  console.log(`   - Risk Level: ${assessment.riskGlobalLevel.toUpperCase()}`)
  console.log(`   - Confidence: ${(assessment.confidence * 100).toFixed(0)}%`)
  console.log(`   - Data Coverage: ${(assessment.dataCoverage * 100).toFixed(0)}%`)
  console.log(`\n📈 Tracks:`)
  assessment.trackScores.forEach(track => {
    console.log(`   - ${track.track}: ${track.score.toFixed(1)}/100 (peso: ${track.weight})`)
  })
  console.log(`\n🔍 Top Reasons:`)
  assessment.topReasons.slice(0, 5).forEach((reason, idx) => {
    console.log(`   ${idx + 1}. [${reason.track}] ${reason.why} (score: ${(reason.score * 100).toFixed(1)})`)
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
