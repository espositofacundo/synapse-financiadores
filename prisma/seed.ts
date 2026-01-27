import { PrismaClient } from '@prisma/client'
import { defaultRules } from '../lib/auditoria'
import { procesarRiesgoPacienteV2, defaultRiskConfig } from '../lib/patient-risk-v2'
import { hashPassword } from '../lib/auth'
import { calcularCotizacion } from '../lib/patient-quote-engine'

const prisma = new PrismaClient()

// Función simplificada para calcular risk score en el seed
async function calcularRiskScoreSimple(consultaId: string, rules: typeof defaultRules) {
  const consulta = await prisma.consulta.findUnique({
    where: { id: consultaId },
    include: {
      afiliado: {
        include: {
          consultas: true
        }
      },
      patient: {
        include: {
          consultas: true
        }
      }
    }
  })

  if (!consulta) return { riskScore: 0, riskLevel: 'bajo', triggeredRules: [] }

  let riskScore = 0
  const triggeredRules: any[] = []

  // Reconsultas en 7 días - usar paciente o afiliado
  const fecha7dAtras = new Date(consulta.fecha)
  fecha7dAtras.setDate(fecha7dAtras.getDate() - 7)
  
  let consultas7d = 0
  if (consulta.patient) {
    consultas7d = consulta.patient.consultas.filter(
      c => c.fecha >= fecha7dAtras && c.fecha <= consulta.fecha && c.id !== consulta.id
    ).length
  } else if (consulta.afiliado) {
    consultas7d = consulta.afiliado.consultas.filter(
      c => c.fecha >= fecha7dAtras && c.fecha <= consulta.fecha && c.id !== consulta.id
    ).length
  }

  if (consultas7d >= rules.maxConsultasPorAfiliadoEn7d) {
    riskScore += 25
    triggeredRules.push({
      ruleId: 'maxConsultasPorAfiliadoEn7d',
      label: 'Exceso de consultas en 7 días',
      details: `Afiliado tuvo ${consultas7d + 1} consultas en 7 días`,
      value: consultas7d + 1,
      threshold: rules.maxConsultasPorAfiliadoEn7d
    })
  }

  // Costo alto
  const maxCosto = rules.maxCostoPorConsultaPorEspecialidad[consulta.especialidad] || 10000
  if (consulta.costo > maxCosto) {
    riskScore += 25
    triggeredRules.push({
      ruleId: 'maxCostoPorConsultaPorEspecialidad',
      label: 'Costo excedido para especialidad',
      details: `Costo de $${consulta.costo.toLocaleString()} excede el máximo de $${maxCosto.toLocaleString()} para ${consulta.especialidad}`,
      value: consulta.costo,
      threshold: maxCosto
    })
  }

  // Duración baja
  if (consulta.duracion < rules.flagSiDuracionMin) {
    riskScore += 15
    triggeredRules.push({
      ruleId: 'flagSiDuracionMin',
      label: 'Duración de consulta muy baja',
      details: `Duración de ${consulta.duracion} minutos es menor a ${rules.flagSiDuracionMin} minutos`,
      value: consulta.duracion,
      threshold: rules.flagSiDuracionMin
    })
  }

  // Sin diagnóstico
  if (rules.flagSiNoHayDiagnostico && !consulta.diagnostico) {
    riskScore += 20
    triggeredRules.push({
      ruleId: 'flagSiNoHayDiagnostico',
      label: 'Consulta sin diagnóstico',
      details: 'La consulta no tiene diagnóstico registrado',
      value: 'sin diagnóstico',
      threshold: 'requerido'
    })
  }

  // Derivación repetida
  if (rules.flagSiDerivaSiempreMismoPrestador && consulta.deriva && consulta.prestadorDerivado) {
    let consultasConDerivacion: any[] = []
    if (consulta.patient) {
      consultasConDerivacion = consulta.patient.consultas.filter(
        c => c.deriva && c.prestadorDerivado === consulta.prestadorDerivado && c.id !== consulta.id
      )
    } else if (consulta.afiliado) {
      consultasConDerivacion = consulta.afiliado.consultas.filter(
        c => c.deriva && c.prestadorDerivado === consulta.prestadorDerivado && c.id !== consulta.id
      )
    }
    
    if (consultasConDerivacion.length >= 2) {
      riskScore += 15
      triggeredRules.push({
        ruleId: 'flagSiDerivaSiempreMismoPrestador',
        label: 'Patrón de derivación repetida',
        details: `Derivación repetida al mismo prestador (${consultasConDerivacion.length + 1} veces)`,
        value: consultasConDerivacion.length + 1,
        threshold: 2
      })
    }
  }

  let riskLevel = 'bajo'
  if (riskScore >= 70) riskLevel = 'alto'
  else if (riskScore >= 40) riskLevel = 'medio'

  return { riskScore, riskLevel, triggeredRules }
}

const especialidades = [
  'clínica',
  'pediatría',
  'gineco',
  'cardio',
  'traumatología',
  'psiquiatría'
]

const canales = ['guardia', 'programada', 'telemedicina']

const motivosNoEfectiva = [
  'paciente ausente',
  'corte',
  'cancelación',
  'reprogramación'
]

const diagnosticos = [
  'Hipertensión arterial',
  'Diabetes tipo 2',
  'Gripe',
  'Dolor de cabeza',
  'Control de rutina',
  'Ansiedad',
  'Depresión',
  'Fractura',
  'Esguince',
  'Infección urinaria',
  'Gastritis',
  'Asma',
  'Bronquitis',
  'Dermatitis',
  'Conjuntivitis',
  null // algunos sin diagnóstico
]

const motivosConsulta = [
  'Control de rutina',
  'Dolor',
  'Fiebre',
  'Malestar general',
  'Seguimiento',
  'Consulta urgente',
  'Control post operatorio',
  'Consulta preventiva'
]

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log('🌱 Iniciando seed...')

  // Limpiar datos existentes (orden correcto: primero las tablas con foreign keys)
  await prisma.onboardingCaseEvent.deleteMany()
  await prisma.onboardingCaseStatusHistory.deleteMany()
  await prisma.onboardingCase.deleteMany()
  await prisma.quoteApproval.deleteMany()
  await prisma.patientQuote.deleteMany()
  await prisma.patientRiskHistory.deleteMany()
  await prisma.consulta.deleteMany() // Debe ir antes de Prestador, Afiliado, Patient, Financiador
  await prisma.user.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.afiliado.deleteMany()
  await prisma.prestador.deleteMany() // Debe ir después de Consulta
  await prisma.financiador.deleteMany()

  // Crear financiador
  const financiador = await prisma.financiador.create({
    data: {
      id: 'default-financiador',
      nombre: 'Obra Social Demo'
    }
  })

  // Crear pacientes (50)
  const pacientes = []
  const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Laura', 'Pedro', 'Sofía', 'Diego', 'Carmen', 'Miguel', 'Elena']
  const apellidos = ['García', 'López', 'Martínez', 'González', 'Rodríguez', 'Fernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres']
  
  for (let i = 0; i < 50; i++) {
    const fechaNac = new Date(1950 + randomInt(0, 50), randomInt(0, 11), randomInt(1, 28))
    const paciente = await prisma.patient.create({
      data: {
        tipoDoc: 'DNI',
        nroDoc: String(20000000 + i).replace(/[.\-]/g, ''),
        nombre: nombres[i % nombres.length],
        apellido: apellidos[i % apellidos.length],
        fechaNac,
        sexo: i % 2 === 0 ? 'M' : 'F',
        telefono: `11${randomInt(1000, 9999)}${randomInt(1000, 9999)}`,
        email: `paciente${i}@example.com`,
        localidad: ['CABA', 'La Plata', 'Rosario', 'Córdoba', 'Mendoza'][i % 5],
        provincia: ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza'][i % 4],
        financiadorId: financiador.id,
        planNombre: i % 3 === 0 ? 'Plan Premium' : 'Plan Básico',
        nroAfiliado: `AF${String(10000 + i)}`,
        estadoCobertura: i % 10 === 0 ? 'pausada' : 'activa',
        esCronico: i % 5 === 0,
        patologias: i % 5 === 0 ? JSON.stringify(['Hipertensión', 'Diabetes']) : null,
        tags: i % 7 === 0 ? JSON.stringify(['caso sensible', 'gestión social']) : null
      }
    })
    pacientes.push(paciente)
  }

  // Crear afiliados (100) - mantener compatibilidad
  const afiliados = []
  for (let i = 0; i < 100; i++) {
    const afiliado = await prisma.afiliado.create({
      data: {
        dni: String(30000000 + i),
        nombre: `Nombre${i}`,
        apellido: `Apellido${i}`,
        edad: randomInt(18, 80),
        financiadorId: financiador.id
      }
    })
    afiliados.push(afiliado)
  }

  // Crear prestadores (30)
  const prestadores = []
  for (let i = 0; i < 30; i++) {
    const prestador = await prisma.prestador.create({
      data: {
        nombre: `Dr. ${['García', 'López', 'Martínez', 'González', 'Rodríguez', 'Fernández', 'Pérez', 'Sánchez'][i % 8]} ${['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Laura'][i % 6]}`,
        matricula: `MP${String(10000 + i)}`
      }
    })
    prestadores.push(prestador)
  }

  // Crear consultas (500+)
  const consultas = []
  const now = new Date()
  const startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) // últimos 90 días

  for (let i = 0; i < 550; i++) {
    const fecha = randomDate(startDate, now)
    const especialidad = randomElement(especialidades)
    const canal = randomElement(canales)
    const efectiva = Math.random() > 0.15 // 85% efectivas
    const deriva = Math.random() < 0.25 // 25% con derivación
    
    // Costo basado en especialidad y canal
    let costoBase = 0
    if (especialidad === 'cardio' || especialidad === 'traumatología') {
      costoBase = randomInt(8000, 15000)
    } else if (especialidad === 'psiquiatría') {
      costoBase = randomInt(6000, 12000)
    } else {
      costoBase = randomInt(3000, 8000)
    }
    
    if (canal === 'telemedicina') {
      costoBase = Math.floor(costoBase * 0.7) // 30% más barato
    } else if (canal === 'guardia') {
      costoBase = Math.floor(costoBase * 1.2) // 20% más caro
    }

    const duracion = randomInt(10, 60)
    const diagnostico = efectiva ? randomElement(diagnosticos) : null

    // Asignar a paciente (30%) o afiliado (70%) para mantener compatibilidad
    const usarPaciente = Math.random() < 0.3 && pacientes.length > 0
    const pacienteSeleccionado = usarPaciente ? randomElement(pacientes) : null
    const afiliadoSeleccionado = !usarPaciente ? randomElement(afiliados) : null

    const consulta = await prisma.consulta.create({
      data: {
        fecha,
        especialidad,
        canal,
        costo: costoBase,
        duracion,
        efectiva,
        motivoNoEfectiva: efectiva ? null : randomElement(motivosNoEfectiva),
        diagnostico,
        motivoConsulta: randomElement(motivosConsulta),
        deriva,
        tipoDerivacion: deriva ? randomElement(['especialista', 'estudios', 'internación']) : null,
        prestadorDerivado: deriva ? randomElement(prestadores).id : null,
        afiliadoId: afiliadoSeleccionado?.id || (pacienteSeleccionado ? null : afiliados[0].id),
        patientId: pacienteSeleccionado?.id || null,
        prestadorId: randomElement(prestadores).id,
        financiadorId: financiador.id,
        riskScore: 0, // se calculará después
        riskLevel: 'bajo',
        resumenClinico: efectiva ? `Consulta de ${especialidad} por ${randomElement(motivosConsulta)}. ${diagnostico ? `Diagnóstico: ${diagnostico}` : 'Sin diagnóstico registrado.'}` : null,
        trazabilidad: JSON.stringify([
          { evento: 'creada', fecha: new Date(fecha.getTime() - 60 * 60 * 1000), usuario: 'Sistema' },
          { evento: 'atendida', fecha, usuario: 'Prestador' },
          { evento: 'cerrada', fecha: new Date(fecha.getTime() + duracion * 60 * 1000), usuario: 'Sistema' }
        ])
      }
    })
    consultas.push(consulta)
  }

  console.log(`✅ Consultas creadas: ${consultas.length}`)
  console.log('🔄 Procesando auditoría...')

  // Procesar auditoría para todas las consultas
  let procesadas = 0
  for (const consulta of consultas) {
    const { riskScore, riskLevel, triggeredRules } = await calcularRiskScoreSimple(consulta.id, defaultRules)
    
    await prisma.consulta.update({
      where: { id: consulta.id },
      data: {
        riskScore,
        riskLevel,
        triggeredRules: JSON.stringify(triggeredRules)
      }
    })
    
    procesadas++
    if (procesadas % 50 === 0) {
      console.log(`   Procesadas ${procesadas}/${consultas.length} consultas...`)
    }
  }

  console.log('🔄 Calculando riesgo de pacientes (V2)...')
  
  // Calcular riesgo de pacientes usando motor V2
  const riskConfig = { ...defaultRiskConfig, financiadorId: financiador.id }
  let pacientesProcesados = 0
  for (const paciente of pacientes) {
    try {
      // Usar configuración específica si el paciente tiene plan
      const config = paciente.planNombre 
        ? { ...riskConfig, planNombre: paciente.planNombre }
        : riskConfig
      
      await procesarRiesgoPacienteV2(paciente.id, config)
      pacientesProcesados++
      if (pacientesProcesados % 10 === 0) {
        console.log(`   Procesados ${pacientesProcesados}/${pacientes.length} pacientes...`)
      }
    } catch (error) {
      console.error(`Error procesando paciente ${paciente.id}:`, error)
    }
  }

  // Crear usuarios demo
  console.log('🔄 Creando usuarios demo...')
  const { hashPassword } = await import('../lib/auth')
  const passwordHash = await hashPassword('demo123')
  
  const cotizador = await prisma.user.create({
    data: {
      name: 'Cotizador Demo',
      email: 'cotizador@demo.com',
      passwordHash,
      role: 'COTIZADOR',
      financiadorId: financiador.id,
      isActive: true
    }
  })
  
  const aprobador = await prisma.user.create({
    data: {
      name: 'Aprobador Demo',
      email: 'aprobador@demo.com',
      passwordHash,
      role: 'APROBADOR',
      financiadorId: financiador.id,
      isActive: true
    }
  })
  
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Demo',
      email: 'admin@demo.com',
      passwordHash,
      role: 'ADMIN',
      financiadorId: financiador.id,
      isActive: true
    }
  })
  
  const oficina = await prisma.user.create({
    data: {
      name: 'Oficina Demo',
      email: 'oficina@demo.com',
      passwordHash,
      role: 'OFICINA',
      financiadorId: financiador.id,
      isActive: true
    }
  })
  
  console.log(`✅ Usuarios creados: ${cotizador.email}, ${aprobador.email}, ${oficina.email}, ${admin.email}`)
  
  // Crear casos de onboarding con quotes reales y timestamps históricos
  console.log('🔄 Creando casos de onboarding con timestamps históricos...')
  
  const provincias = ['Buenos Aires', 'Córdoba', 'Santa Fe', 'Mendoza', 'Tucumán', 'Salta', 'Entre Ríos']
  const patologiasCronicas = [
    [],
    ['Hipertensión'],
    ['Diabetes tipo 2'],
    ['Hipertensión', 'Diabetes tipo 2'],
    ['EPOC'],
    ['Asma'],
    ['Cardiopatía'],
    ['Obesidad'],
    ['Artritis'],
    ['Depresión']
  ]
  
  // Distribución de casos por estado
  const caseDistribution = [
    { status: 'PENDIENTE_COTIZACION', count: randomInt(8, 12), owner: cotizador },
    { status: 'PENDIENTE_APROBACION', count: randomInt(6, 10), owner: aprobador },
    { status: 'APROBADO', count: randomInt(4, 8), owner: oficina },
    { status: 'PERFIL_COMPLETO', count: randomInt(5, 8), owner: oficina },
    { status: 'RECHAZADO', count: randomInt(2, 4), owner: cotizador }
  ]
  
  const onboardingCases = []
  let caseCounter = 1000
  
  // Función para generar timestamp histórico realista
  function generateHistoricalTimestamps(status: string, index: number, totalInStatus: number) {
    const now = new Date()
    
    // Para casos completados: distribuir en los últimos 90 días
    if (status === 'PERFIL_COMPLETO') {
      // Algunos recientes (últimos 7 días), algunos medios (7-30), algunos viejos (30-90)
      const ageGroup = index % 3
      let daysAgo: number
      if (ageGroup === 0) {
        daysAgo = randomInt(1, 7) // Recientes
      } else if (ageGroup === 1) {
        daysAgo = randomInt(8, 30) // Medios
      } else {
        daysAgo = randomInt(31, 90) // Viejos
      }
      
      const completedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      const approvedAt = new Date(completedAt.getTime() - randomInt(1, 3) * 24 * 60 * 60 * 1000)
      const submittedAt = new Date(approvedAt.getTime() - randomInt(1, 2) * 24 * 60 * 60 * 1000)
      const createdAt = new Date(submittedAt.getTime() - randomInt(1, 3) * 24 * 60 * 60 * 1000)
      
      return {
        createdAt,
        enteredPendienteCotizacion: createdAt,
        enteredPendienteAprobacion: submittedAt,
        enteredAprobado: approvedAt,
        enteredPerfilCompleto: completedAt,
        currentStatusEnteredAt: completedAt
      }
    }
    
    // Para casos aprobados: algunos recientes, algunos con días de antigüedad
    if (status === 'APROBADO') {
      const daysAgo = index < totalInStatus / 2 
        ? randomInt(1, 7)  // Recientes
        : randomInt(8, 30) // Con antigüedad
      const approvedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      const submittedAt = new Date(approvedAt.getTime() - randomInt(1, 2) * 24 * 60 * 60 * 1000)
      const createdAt = new Date(submittedAt.getTime() - randomInt(1, 3) * 24 * 60 * 60 * 1000)
      
      return {
        createdAt,
        enteredPendienteCotizacion: createdAt,
        enteredPendienteAprobacion: submittedAt,
        enteredAprobado: approvedAt,
        enteredPerfilCompleto: null,
        currentStatusEnteredAt: approvedAt
      }
    }
    
    // Para casos en PENDIENTE_APROBACION: algunos recientes, algunos viejos (para aging)
    if (status === 'PENDIENTE_APROBACION') {
      const daysAgo = index < totalInStatus / 2
        ? randomInt(1, 3)   // Recientes
        : randomInt(4, 15)  // Viejos (para probar aging)
      const submittedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      const createdAt = new Date(submittedAt.getTime() - randomInt(1, 3) * 24 * 60 * 60 * 1000)
      
      return {
        createdAt,
        enteredPendienteCotizacion: createdAt,
        enteredPendienteAprobacion: submittedAt,
        enteredAprobado: null,
        enteredPerfilCompleto: null,
        currentStatusEnteredAt: submittedAt
      }
    }
    
    // Para casos en PENDIENTE_COTIZACION: algunos recientes, algunos viejos
    if (status === 'PENDIENTE_COTIZACION') {
      const daysAgo = index < totalInStatus / 2
        ? randomInt(0, 2)   // Recientes
        : randomInt(3, 10)  // Viejos
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      
      return {
        createdAt,
        enteredPendienteCotizacion: createdAt,
        enteredPendienteAprobacion: null,
        enteredAprobado: null,
        enteredPerfilCompleto: null,
        currentStatusEnteredAt: createdAt
      }
    }
    
    // Para casos RECHAZADOS: algunos recientes, algunos viejos
    if (status === 'RECHAZADO') {
      const daysAgo = randomInt(1, 20)
      const rejectedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
      const submittedAt = new Date(rejectedAt.getTime() - randomInt(1, 2) * 24 * 60 * 60 * 1000)
      const createdAt = new Date(submittedAt.getTime() - randomInt(1, 3) * 24 * 60 * 60 * 1000)
      
      return {
        createdAt,
        enteredPendienteCotizacion: createdAt,
        enteredPendienteAprobacion: submittedAt,
        enteredAprobado: null,
        enteredPerfilCompleto: null,
        currentStatusEnteredAt: rejectedAt
      }
    }
    
    // Default
    const createdAt = new Date(now.getTime() - randomInt(1, 7) * 24 * 60 * 60 * 1000)
    return {
      createdAt,
      enteredPendienteCotizacion: createdAt,
      enteredPendienteAprobacion: null,
      enteredAprobado: null,
      enteredPerfilCompleto: null,
      currentStatusEnteredAt: createdAt
    }
  }
  
  // Crear casos por cada estado
  for (const dist of caseDistribution) {
    const { status, count, owner } = dist
    
    for (let i = 0; i < count; i++) {
      const timestamps = generateHistoricalTimestamps(status, i, count)
      
      // Generar datos realistas para la cotización
      const edad = randomInt(25, 75)
      const sexo = randomElement(['M', 'F'])
      const provincia = randomElement(provincias)
      const patologias = randomElement(patologiasCronicas)
      const medicamentosCronicos = patologias.length * randomInt(1, 4)
      const consultasTotales = randomInt(1, 25)
      const consultasGuardia = Math.floor(consultasTotales * (0.1 + Math.random() * 0.3))
      const internaciones = Math.random() < 0.3 ? randomInt(0, 2) : 0
      const especialidadesDistintas = randomInt(1, 6)
      const reconsultasRapidas = Math.random() < 0.25
      const tasaNoEfectivas = Math.random() * 0.15
      const planNombre = randomElement(['Plan Premium', 'Plan Básico', 'Plan Estándar'])
      
      // Calcular cotización real
      const quoteInputs = {
        edad,
        sexo,
        provincia,
        patologiasCronicas: patologias,
        medicamentosCronicos,
        consultasTotales,
        consultasGuardia,
        internaciones,
        especialidadesDistintas,
        reconsultasRapidas,
        tasaNoEfectivas
      }
      
      const quoteResult = calcularCotizacion(quoteInputs, planNombre)
      
      // Determinar status de la quote según el estado del caso
      let quoteStatus = 'DRAFT'
      let approvedAt: Date | null = null
      let rejectedAt: Date | null = null
      let approvedByUserId: string | null = null
      
      if (status === 'PENDIENTE_APROBACION') {
        quoteStatus = 'SUBMITTED'
      } else if (status === 'APROBADO' || status === 'PERFIL_COMPLETO') {
        quoteStatus = 'APPROVED'
        approvedAt = timestamps.enteredAprobado || timestamps.currentStatusEnteredAt
        approvedByUserId = aprobador.id
      } else if (status === 'RECHAZADO') {
        quoteStatus = 'REJECTED'
        rejectedAt = timestamps.currentStatusEnteredAt
      }
      
      // Crear quote
      const quote = await prisma.patientQuote.create({
        data: {
          inputs: JSON.stringify(quoteInputs),
          riskScore: quoteResult.riskScore,
          riskLevel: quoteResult.riskLevel,
          expectedCost12m: quoteResult.expectedCost12m,
          expectedCostP95: quoteResult.expectedCostP95,
          priceCategory: quoteResult.priceCategory,
          riskFactor: quoteResult.riskFactor,
          confidence: quoteResult.confidence,
          reasons: JSON.stringify(quoteResult.reasons),
          suggestedPriceMonthly: quoteResult.pricing?.suggestedPriceMonthly || null,
          priceRangeMin: quoteResult.pricing?.range.min || null,
          priceRangeMax: quoteResult.pricing?.range.max || null,
          pricingBreakdown: quoteResult.pricing ? JSON.stringify(quoteResult.pricing.breakdown) : null,
          pricingConfig: quoteResult.pricingConfig ? JSON.stringify(quoteResult.pricingConfig) : null,
          pricingFlags: quoteResult.pricing ? JSON.stringify(quoteResult.pricing.flags) : null,
          status: quoteStatus,
          createdByUserId: cotizador.id,
          approvedByUserId,
          approvedAt,
          rejectedAt,
          rejectionReason: status === 'RECHAZADO' ? 'Caso rechazado - requiere revisión de cotización' : null,
          submittedAt: status !== 'PENDIENTE_COTIZACION' ? (timestamps.enteredPendienteAprobacion || timestamps.createdAt) : null,
          modelVersion: '1.0'
        }
      })
      
      // Crear paciente si el caso está completo
      let patientId: string | null = null
      if (status === 'PERFIL_COMPLETO' && Math.random() < 0.7) {
        // 70% de casos completos tienen paciente
        const nombre = randomElement(nombres)
        const apellido = randomElement(apellidos)
        const fechaNac = new Date(new Date().getFullYear() - edad, randomInt(0, 11), randomInt(1, 28))
        
        const patient = await prisma.patient.create({
          data: {
            tipoDoc: 'DNI',
            nroDoc: String(30000000 + caseCounter),
            nombre,
            apellido,
            fechaNac,
            sexo,
            telefono: `11${randomInt(1000, 9999)}${randomInt(1000, 9999)}`,
            email: `${nombre.toLowerCase()}.${apellido.toLowerCase()}@example.com`,
            localidad: randomElement(['CABA', 'La Plata', 'Rosario', 'Córdoba', 'Mendoza']),
            provincia,
            financiadorId: financiador.id,
            planNombre,
            nroAfiliado: `AF${String(10000 + caseCounter)}`,
            estadoCobertura: 'activa',
            esCronico: patologias.length > 0,
            patologias: patologias.length > 0 ? JSON.stringify(patologias) : null
          }
        })
        patientId = patient.id
      }
      
      // Display name
      const displayName = patientId 
        ? `Caso #${String(caseCounter).padStart(4, '0')} - ${randomElement(nombres)} ${randomElement(apellidos)}, ${edad} años`
        : `Caso #${String(caseCounter).padStart(4, '0')} - ${sexo === 'M' ? 'Masculino' : 'Femenino'}, ${edad} años`
      
      // Determinar asignación
      let assignedToUserId: string | null = null
      if (status === 'APROBADO' || status === 'PERFIL_COMPLETO') {
        assignedToUserId = oficina.id
      } else if (status === 'PENDIENTE_APROBACION') {
        assignedToUserId = aprobador.id
      }
      
      // Crear caso de onboarding
      const caseItem = await prisma.onboardingCase.create({
        data: {
          displayName,
          financiadorId: financiador.id,
          patientId,
          quoteId: quote.id,
          status,
          riskScore: quoteResult.riskScore,
          riskLevel: quoteResult.riskLevel,
          suggestedPriceMonthly: quoteResult.pricing?.suggestedPriceMonthly || null,
          createdByUserId: cotizador.id,
          assignedToUserId,
          currentStatusEnteredAt: timestamps.currentStatusEnteredAt,
          createdAt: timestamps.createdAt
        }
      })
      
      onboardingCases.push(caseItem)
      
      // Crear historial de estados con timestamps reales
      const historyEntries: Array<{
        fromStatus: string | null
        toStatus: string
        changedAt: Date
        changedBy: typeof cotizador
        note: string
        durationSeconds?: number
      }> = []
      
      // Estado inicial
      historyEntries.push({
        fromStatus: null,
        toStatus: 'PENDIENTE_COTIZACION',
        changedAt: timestamps.enteredPendienteCotizacion,
        changedBy: cotizador,
        note: 'Caso creado'
      })
      
      // Transiciones según estado final
      if (status !== 'PENDIENTE_COTIZACION') {
        const duration1 = Math.floor(
          (timestamps.enteredPendienteAprobacion!.getTime() - timestamps.enteredPendienteCotizacion.getTime()) / 1000
        )
        historyEntries.push({
          fromStatus: 'PENDIENTE_COTIZACION',
          toStatus: 'PENDIENTE_APROBACION',
          changedAt: timestamps.enteredPendienteAprobacion!,
          changedBy: cotizador,
          note: 'Cotización completada y enviada a aprobación',
          durationSeconds: duration1
        })
        
        if (status === 'RECHAZADO') {
          const duration2 = Math.floor(
            (timestamps.currentStatusEnteredAt.getTime() - timestamps.enteredPendienteAprobacion!.getTime()) / 1000
          )
          historyEntries.push({
            fromStatus: 'PENDIENTE_APROBACION',
            toStatus: 'RECHAZADO',
            changedAt: timestamps.currentStatusEnteredAt,
            changedBy: aprobador,
            note: 'Caso rechazado por aprobador',
            durationSeconds: duration2
          })
        } else if (status === 'APROBADO' || status === 'PERFIL_COMPLETO') {
          const duration2 = Math.floor(
            ((timestamps.enteredAprobado || timestamps.currentStatusEnteredAt).getTime() - timestamps.enteredPendienteAprobacion!.getTime()) / 1000
          )
          historyEntries.push({
            fromStatus: 'PENDIENTE_APROBACION',
            toStatus: 'APROBADO',
            changedAt: timestamps.enteredAprobado || timestamps.currentStatusEnteredAt,
            changedBy: aprobador,
            note: 'Caso aprobado',
            durationSeconds: duration2
          })
          
          if (status === 'PERFIL_COMPLETO') {
            const duration3 = Math.floor(
              (timestamps.currentStatusEnteredAt.getTime() - (timestamps.enteredAprobado || timestamps.currentStatusEnteredAt).getTime()) / 1000
            )
            historyEntries.push({
              fromStatus: 'APROBADO',
              toStatus: 'PERFIL_COMPLETO',
              changedAt: timestamps.currentStatusEnteredAt,
              changedBy: oficina,
              note: 'Perfil completado por oficina',
              durationSeconds: duration3
            })
          }
        }
      }
      
      // Guardar historial
      for (const entry of historyEntries) {
        await prisma.onboardingCaseStatusHistory.create({
          data: {
            caseId: caseItem.id,
            fromStatus: entry.fromStatus,
            toStatus: entry.toStatus,
            changedByUserId: entry.changedBy.id,
            changedAt: entry.changedAt,
            durationSeconds: entry.durationSeconds || null,
            note: entry.note
          }
        })
      }
      
      caseCounter++
    }
  }
  
  const totalCases = onboardingCases.length
  const byStatus = caseDistribution.reduce((acc, d) => {
    acc[d.status] = d.count
    return acc
  }, {} as Record<string, number>)
  
  console.log(`✅ Casos de onboarding creados: ${totalCases}`)
  console.log(`   - PENDIENTE_COTIZACION: ${byStatus['PENDIENTE_COTIZACION']}`)
  console.log(`   - PENDIENTE_APROBACION: ${byStatus['PENDIENTE_APROBACION']}`)
  console.log(`   - APROBADO: ${byStatus['APROBADO']}`)
  console.log(`   - PERFIL_COMPLETO: ${byStatus['PERFIL_COMPLETO']}`)
  console.log(`   - RECHAZADO: ${byStatus['RECHAZADO']}`)
  console.log(`✅ Seed completado: ${pacientes.length} pacientes, ${afiliados.length} afiliados, ${prestadores.length} prestadores, ${consultas.length} consultas, ${onboardingCases.length} casos onboarding`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
