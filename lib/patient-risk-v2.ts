import { prisma } from '@/lib/prisma'

// ============================================================================
// TIPOS Y DEFINICIONES
// ============================================================================

export type RiskTrack = 'clinico' | 'uso' | 'fraude' | 'costo' | 'datos'
export type RiskLevel = 'bajo' | 'medio' | 'alto'

export interface Signal {
  signalId: string
  track: RiskTrack
  score: number // 0-1
  intensity: 'low' | 'medium' | 'high'
  why: string // Explicación legible
  evidence: Record<string, any> // Datos de soporte
  threshold?: number | string
  value?: number | string
}

export interface TrackScore {
  track: RiskTrack
  score: number // 0-100
  signals: Signal[]
  weight: number // Peso configurable para este track
}

export interface RiskAssessment {
  riskGlobalScore: number // 0-100
  riskGlobalLevel: RiskLevel
  trackScores: TrackScore[]
  topReasons: Array<{
    signalId: string
    track: RiskTrack
    why: string
    score: number
  }>
  evidence: Array<{
    feature: string
    value: any
    track: RiskTrack
  }>
  confidence: number // 0-1
  dataCoverage: number // 0-1 (% de campos/eventos presentes)
  riskVersion: string
  calculatedAt: Date
}

export interface RiskConfig {
  // Pesos por track (deben sumar ~1.0)
  trackWeights: {
    clinico: number
    uso: number
    fraude: number
    costo: number
    datos: number
  }
  
  // Thresholds por señal
  thresholds: {
    // Uso/Consumo
    maxConsultasEn7d: number
    maxConsultasEn30d: number
    maxUsoGuardiaEn30d: number
    maxMultiPrestadorEn7d: number
    zScoreFrecuenciaThreshold: number
    
    // Costo
    costPercentileThreshold: number // Percentil 90, 95, etc
    costGrowthThreshold: number // % crecimiento mes a mes
    expensiveSpecialtyShareThreshold: number
    
    // Fraude
    patientProviderConcentrationThreshold: number
    noEffectiveRateThreshold: number
    impossibleScheduleFlag: boolean
    
    // Clínico
    ageRiskThreshold: number
    chronicCountThreshold: number
    complexityIndexThreshold: number
    missingFollowupDays: number
    
    // Datos
    missingDataFieldsThreshold: number // % de campos faltantes
  }
  
  // Ventanas de tiempo
  windows: {
    short: number // días (7)
    medium: number // días (30)
    long: number // días (90)
  }
  
  // Enable/disable señales
  enabledSignals: string[]
  
  // Versión de configuración
  version: string
  financiadorId?: string
  planNombre?: string
}

export const defaultRiskConfig: RiskConfig = {
  trackWeights: {
    clinico: 0.20,
    uso: 0.25,
    fraude: 0.25,
    costo: 0.20,
    datos: 0.10
  },
  thresholds: {
    maxConsultasEn7d: 3,
    maxConsultasEn30d: 8,
    maxUsoGuardiaEn30d: 5,
    maxMultiPrestadorEn7d: 3,
    zScoreFrecuenciaThreshold: 2.0,
    costPercentileThreshold: 90,
    costGrowthThreshold: 0.3, // 30%
    expensiveSpecialtyShareThreshold: 0.5,
    patientProviderConcentrationThreshold: 0.8,
    noEffectiveRateThreshold: 0.4,
    impossibleScheduleFlag: true,
    ageRiskThreshold: 70,
    chronicCountThreshold: 2,
    complexityIndexThreshold: 5,
    missingFollowupDays: 30,
    missingDataFieldsThreshold: 0.3
  },
  windows: {
    short: 7,
    medium: 30,
    long: 90
  },
  enabledSignals: [
    'frecuencia_inusual',
    'reconsultas_rapidas',
    'guardia_repetida',
    'multi_prestador',
    'fragmentacion_atencion',
    'alta_tasa_no_efectivas',
    'costo_elevado',
    'costo_creciente',
    'costo_percentil_alto',
    'colusion_paciente_prestador',
    'doctor_shopping_pattern',
    'edad_extrema',
    'comorbilidad',
    'falta_seguimiento',
    'datos_incompletos'
  ],
  version: '2.0',
  financiadorId: 'default-financiador'
}

// ============================================================================
// MOTOR DE SEÑALES
// ============================================================================

export async function calcularRiesgoPacienteV2(
  patientId: string,
  config: RiskConfig = defaultRiskConfig
): Promise<RiskAssessment> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      consultas: {
        orderBy: { fecha: 'desc' },
        take: 200 // Más consultas para análisis
      },
      financiador: true
    }
  })

  if (!patient) {
    return createEmptyAssessment(config.version)
  }

  const ahora = new Date()
  const hace7dias = new Date(ahora.getTime() - config.windows.short * 24 * 60 * 60 * 1000)
  const hace30dias = new Date(ahora.getTime() - config.windows.medium * 24 * 60 * 60 * 1000)
  const hace90dias = new Date(ahora.getTime() - config.windows.long * 24 * 60 * 60 * 1000)

  // Calcular todas las señales
  const allSignals: Signal[] = []

  const consultas = patient.consultas || []

  // ===== SEÑALES DE USO/CONSUMO =====
  if (config.enabledSignals.some(s => s.includes('frecuencia') || s.includes('guardia') || s.includes('multi_prestador') || s.includes('fragmentacion') || s.includes('alta_tasa'))) {
    allSignals.push(...await calcularSenalesUso(patient, consultas, hace7dias, hace30dias, config))
  }

  // ===== SEÑALES DE COSTO =====
  if (config.enabledSignals.some(s => s.includes('costo'))) {
    allSignals.push(...await calcularSenalesCosto(patient, consultas, hace30dias, hace90dias, config))
  }

  // ===== SEÑALES DE FRAUDE =====
  if (config.enabledSignals.some(s => s.includes('colusion') || s.includes('doctor_shopping') || s.includes('horario'))) {
    allSignals.push(...await calcularSenalesFraude(patient, consultas, hace30dias, config))
  }

  // ===== SEÑALES CLÍNICAS =====
  if (config.enabledSignals.some(s => s.includes('edad') || s.includes('comorbilidad') || s.includes('falta_seguimiento'))) {
    allSignals.push(...await calcularSenalesClinicas(patient, consultas, hace30dias, config))
  }

  // ===== SEÑALES DE CALIDAD DE DATOS =====
  if (config.enabledSignals.some(s => s.includes('datos') || s.includes('diagnostico'))) {
    allSignals.push(...await calcularSenalesDatos(patient, consultas, config))
  }

  // Agrupar señales por track
  // El score del track es la SUMA de scores de señales (capped a 100), no el promedio
  const trackScores: TrackScore[] = [
    'clinico',
    'uso',
    'fraude',
    'costo',
    'datos'
  ].map(track => {
    const signals = allSignals.filter(s => s.track === track)
    // Sumar scores de señales (cada señal aporta 0-1, sumamos y multiplicamos por 100)
    // Pero aplicamos un cap para evitar que un track exceda 100
    const trackScore = Math.min(100, signals.reduce((sum, s) => sum + (s.score * 100), 0))
    return {
      track: track as RiskTrack,
      score: trackScore,
      signals,
      weight: config.trackWeights[track as RiskTrack]
    }
  })

  // Calcular riesgo global (combinación ponderada)
  const riskGlobalScore = trackScores.reduce(
    (sum, track) => sum + (track.score * track.weight),
    0
  )

  // Determinar nivel
  let riskGlobalLevel: RiskLevel = 'bajo'
  if (riskGlobalScore >= 70) riskGlobalLevel = 'alto'
  else if (riskGlobalScore >= 40) riskGlobalLevel = 'medio'

  // Top reasons (máx 5, ordenados por score)
  const topReasons = allSignals
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => ({
      signalId: s.signalId,
      track: s.track,
      why: s.why,
      score: s.score
    }))

  // Evidence (features y valores)
  const evidence = allSignals
    .filter(s => s.score > 0.3)
    .flatMap(s => 
      Object.entries(s.evidence).map(([feature, value]) => ({
        feature,
        value,
        track: s.track
      }))
    )

  // Confidence y data coverage
  const { confidence, dataCoverage } = calcularConfidenceYCoverage(patient, consultas)

  return {
    riskGlobalScore: Math.round(riskGlobalScore),
    riskGlobalLevel,
    trackScores,
    topReasons,
    evidence,
    confidence,
    dataCoverage,
    riskVersion: config.version,
    calculatedAt: ahora
  }
}

// ============================================================================
// FUNCIONES DE CÁLCULO DE SEÑALES POR TRACK
// ============================================================================

async function calcularSenalesUso(
  patient: any,
  consultas: any[],
  hace7dias: Date,
  hace30dias: Date,
  config: RiskConfig
): Promise<Signal[]> {
  const signals: Signal[] = []
  const ahora = new Date()
  const consultas7d = consultas.filter(c => {
    const fechaConsulta = new Date(c.fecha)
    return fechaConsulta >= hace7dias && fechaConsulta <= ahora
  })
  const consultas30d = consultas.filter(c => {
    const fechaConsulta = new Date(c.fecha)
    return fechaConsulta >= hace30dias && fechaConsulta <= ahora
  })

  // 1. Frecuencia inusual (7 días)
  if (consultas7d.length > config.thresholds.maxConsultasEn7d) {
    const intensity = consultas7d.length > config.thresholds.maxConsultasEn7d * 2 ? 'high' : 'medium'
    signals.push({
      signalId: 'frecuencia_inusual_7d',
      track: 'uso',
      score: Math.min(1.0, consultas7d.length / (config.thresholds.maxConsultasEn7d * 2)),
      intensity,
      why: `Exceso de consultas en 7 días: ${consultas7d.length} (umbral: ${config.thresholds.maxConsultasEn7d})`,
      evidence: {
        consultas_7d: consultas7d.length,
        threshold: config.thresholds.maxConsultasEn7d
      },
      threshold: config.thresholds.maxConsultasEn7d,
      value: consultas7d.length
    })
  }

  // 2. Frecuencia inusual (30 días)
  if (consultas30d.length > config.thresholds.maxConsultasEn30d) {
    signals.push({
      signalId: 'frecuencia_inusual_30d',
      track: 'uso',
      score: Math.min(1.0, consultas30d.length / (config.thresholds.maxConsultasEn30d * 2)),
      intensity: 'medium',
      why: `Exceso de consultas en 30 días: ${consultas30d.length} (umbral: ${config.thresholds.maxConsultasEn30d})`,
      evidence: {
        consultas_30d: consultas30d.length,
        threshold: config.thresholds.maxConsultasEn30d
      },
      threshold: config.thresholds.maxConsultasEn30d,
      value: consultas30d.length
    })
  }

  // 3. Guardia repetida
  const guardias30d = consultas30d.filter(c => c.canal === 'guardia')
  if (guardias30d.length > config.thresholds.maxUsoGuardiaEn30d) {
    signals.push({
      signalId: 'guardia_repetida',
      track: 'uso',
      score: Math.min(1.0, guardias30d.length / (config.thresholds.maxUsoGuardiaEn30d * 2)),
      intensity: guardias30d.length > config.thresholds.maxUsoGuardiaEn30d * 2 ? 'high' : 'medium',
      why: `Uso excesivo de guardia: ${guardias30d.length} veces en 30 días`,
      evidence: {
        guardias_30d: guardias30d.length,
        threshold: config.thresholds.maxUsoGuardiaEn30d
      },
      threshold: config.thresholds.maxUsoGuardiaEn30d,
      value: guardias30d.length
    })
  }

  // 4. Multi-prestador (doctor shopping) - también en 30 y 60 días
  const prestadores7d = new Set(consultas7d.map(c => c.prestadorId))
  const prestadores30d = new Set(consultas30d.map(c => c.prestadorId))
  const hace60dias = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000)
  const consultas60d = consultas.filter(c => {
    const fechaConsulta = new Date(c.fecha)
    return fechaConsulta >= hace60dias && fechaConsulta <= ahora
  })
  const prestadores60d = new Set(consultas60d.map(c => c.prestadorId))
  
  if (prestadores7d.size > config.thresholds.maxMultiPrestadorEn7d) {
    signals.push({
      signalId: 'multi_prestador_7d',
      track: 'uso',
      score: Math.min(1.0, prestadores7d.size / (config.thresholds.maxMultiPrestadorEn7d * 2)),
      intensity: 'high',
      why: `Múltiples prestadores en 7 días: ${prestadores7d.size} (posible doctor shopping)`,
      evidence: {
        unique_providers_7d: prestadores7d.size,
        threshold: config.thresholds.maxMultiPrestadorEn7d
      },
      threshold: config.thresholds.maxMultiPrestadorEn7d,
      value: prestadores7d.size
    })
  }

  // Multi-prestador en 60 días (fragmentación de atención)
  if (prestadores60d.size >= 9 && consultas60d.length >= 14) {
    signals.push({
      signalId: 'fragmentacion_atencion',
      track: 'uso',
      score: Math.min(1.0, prestadores60d.size / 15), // 9+ prestadores = alto score
      intensity: 'high',
      why: `Alta fragmentación: ${prestadores60d.size} prestadores distintos en 60 días (${consultas60d.length} consultas)`,
      evidence: {
        unique_providers_60d: prestadores60d.size,
        consultas_60d: consultas60d.length,
        fragmentacion_ratio: prestadores60d.size / consultas60d.length
      },
      value: prestadores60d.size
    })
  }

  // 5. Reconsultas rápidas (mismo motivo en 72h)
  const reconsultasRapidas = detectarReconsultasRapidas(consultas7d)
  if (reconsultasRapidas > 0) {
    signals.push({
      signalId: 'reconsultas_rapidas',
      track: 'uso',
      score: Math.min(1.0, reconsultasRapidas / 3),
      intensity: 'medium',
      why: `${reconsultasRapidas} reconsultas por mismo motivo en menos de 72h`,
      evidence: {
        reconsultas_72h: reconsultasRapidas
      },
      value: reconsultasRapidas
    })
  }

  // 6. Consultas no efectivas (alta tasa)
  if (consultas30d.length > 0) {
    const noEfectivas = consultas30d.filter(c => !c.efectiva).length
    const tasaNoEfectivas = noEfectivas / consultas30d.length
    if (tasaNoEfectivas > 0.3) { // Más del 30% no efectivas
      signals.push({
        signalId: 'alta_tasa_no_efectivas',
        track: 'uso',
        score: Math.min(1.0, tasaNoEfectivas), // 36% = score 0.36
        intensity: tasaNoEfectivas > 0.4 ? 'high' : 'medium',
        why: `Alta tasa de consultas no efectivas: ${(tasaNoEfectivas * 100).toFixed(0)}% (${noEfectivas}/${consultas30d.length})`,
        evidence: {
          no_efectivas: noEfectivas,
          total_consultas: consultas30d.length,
          tasa: tasaNoEfectivas
        },
        value: tasaNoEfectivas,
        threshold: 0.3
      })
    }
  }

  return signals
}

async function calcularSenalesCosto(
  patient: any,
  consultas: any[],
  hace30dias: Date,
  hace90dias: Date,
  config: RiskConfig
): Promise<Signal[]> {
  const signals: Signal[] = []
  const ahora = new Date()
  const consultas30d = consultas.filter(c => {
    const fechaConsulta = new Date(c.fecha)
    return fechaConsulta >= hace30dias && fechaConsulta <= ahora
  })
  const hace60dias = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000)
  const consultas60d = consultas.filter(c => {
    const fechaConsulta = new Date(c.fecha)
    return fechaConsulta >= hace60dias && fechaConsulta <= ahora
  })
  const consultas90d = consultas.filter(c => {
    const fechaConsulta = new Date(c.fecha)
    return fechaConsulta >= hace90dias && fechaConsulta <= ahora
  })

  // 1. Costo elevado (percentil) - también en 60 días
  const costo30d = consultas30d.reduce((sum, c) => sum + c.costo, 0)
  const costo60d = consultas60d.reduce((sum, c) => sum + c.costo, 0)
  const costoPromedio = await obtenerCostoPromedioCohorte(patient, config)
  
  if (costoPromedio > 0) {
    // Análisis en 30 días
    const costRatio30d = costo30d / costoPromedio
    if (costRatio30d > 1.5) {
      signals.push({
        signalId: 'costo_elevado_30d',
        track: 'costo',
        score: Math.min(1.0, (costRatio30d - 1.5) / 2),
        intensity: costRatio30d > 2.5 ? 'high' : 'medium',
        why: `Costo 30d ($${costo30d.toLocaleString()}) es ${(costRatio30d * 100).toFixed(0)}% del promedio de cohorte`,
        evidence: {
          costo_30d: costo30d,
          costo_promedio_cohorte: costoPromedio,
          ratio: costRatio30d
        },
        value: costo30d,
        threshold: costoPromedio
      })
    }

    // Análisis en 60 días (percentil 92)
    const costRatio60d = costo60d / (costoPromedio * 2) // Promedio de 60d sería ~2x el de 30d
    if (costRatio60d > 1.8) { // Percentil 92 sería ~1.8x
      const percentilEstimado = costRatio60d > 2.5 ? 95 : costRatio60d > 2.0 ? 92 : 90
      signals.push({
        signalId: 'costo_percentil_alto',
        track: 'costo',
        score: Math.min(1.0, (costRatio60d - 1.8) / 1.2), // Score alto si está en percentil 92+
        intensity: 'high',
        why: `Costo 60d ($${costo60d.toLocaleString()}) en percentil ${percentilEstimado}+ de cohorte`,
        evidence: {
          costo_60d: costo60d,
          costo_promedio_cohorte_60d: costoPromedio * 2,
          ratio: costRatio60d,
          percentil_estimado: percentilEstimado
        },
        value: costo60d,
        threshold: costoPromedio * 2 * 1.8
      })
    }
  }

  // 2. Crecimiento de costo
  const costoMes1 = consultas90d
    .filter(c => c.fecha >= new Date(hace90dias.getTime() + 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, c) => sum + c.costo, 0)
  const costoMes2 = consultas30d.reduce((sum, c) => sum + c.costo, 0)
  
  if (costoMes1 > 0) {
    const growth = (costoMes2 - costoMes1) / costoMes1
    if (growth > config.thresholds.costGrowthThreshold) {
      signals.push({
        signalId: 'costo_creciente',
        track: 'costo',
        score: Math.min(1.0, growth / (config.thresholds.costGrowthThreshold * 2)),
        intensity: 'medium',
        why: `Crecimiento de costo: +${(growth * 100).toFixed(0)}% mes a mes`,
        evidence: {
          costo_mes_anterior: costoMes1,
          costo_mes_actual: costoMes2,
          growth_rate: growth
        },
        value: growth,
        threshold: config.thresholds.costGrowthThreshold
      })
    }
  }

  return signals
}

async function calcularSenalesFraude(
  patient: any,
  consultas: any[],
  hace30dias: Date,
  config: RiskConfig
): Promise<Signal[]> {
  const signals: Signal[] = []
  const ahora = new Date()
  const consultas30d = consultas.filter(c => {
    const fechaConsulta = new Date(c.fecha)
    return fechaConsulta >= hace30dias && fechaConsulta <= ahora
  })
  const hace60dias = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000)
  const consultas60d = consultas.filter(c => {
    const fechaConsulta = new Date(c.fecha)
    return fechaConsulta >= hace60dias && fechaConsulta <= ahora
  })

  // 1. Colusión paciente-prestador
  const prestadores = consultas30d.reduce((acc, c) => {
    const pid = c.prestadorId || 'unknown'
    acc[pid] = (acc[pid] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const maxConcentration = consultas30d.length > 0 
    ? Math.max(...(Object.values(prestadores) as number[]), 0) / consultas30d.length 
    : 0
  const noEffectiveRate = consultas30d.length > 0
    ? consultas30d.filter(c => !c.efectiva).length / consultas30d.length
    : 0

  if (maxConcentration > config.thresholds.patientProviderConcentrationThreshold && 
      noEffectiveRate > config.thresholds.noEffectiveRateThreshold) {
    signals.push({
      signalId: 'colusion_paciente_prestador',
      track: 'fraude',
      score: (maxConcentration * 0.6 + noEffectiveRate * 0.4),
      intensity: 'high',
      why: `Alta concentración con un prestador (${(maxConcentration * 100).toFixed(0)}%) + baja efectividad (${(noEffectiveRate * 100).toFixed(0)}%)`,
      evidence: {
        provider_concentration: maxConcentration,
        no_effective_rate: noEffectiveRate,
        total_consultas: consultas30d.length
      },
      value: maxConcentration,
      threshold: config.thresholds.patientProviderConcentrationThreshold
    })
  }

  // 2. Fragmentación + baja efectividad (patrón de doctor shopping)
  if (consultas60d.length >= 14) {
    const prestadores60d = new Set(consultas60d.map(c => c.prestadorId))
    const noEfectivas60d = consultas60d.filter(c => !c.efectiva).length
    const tasaNoEfectivas60d = noEfectivas60d / consultas60d.length

    if (prestadores60d.size >= 9 && tasaNoEfectivas60d > 0.3) {
      signals.push({
        signalId: 'doctor_shopping_pattern',
        track: 'fraude',
        score: Math.min(1.0, (prestadores60d.size / 15) * 0.6 + (tasaNoEfectivas60d * 0.4)),
        intensity: 'high',
        why: `Patrón de doctor shopping: ${prestadores60d.size} prestadores + ${(tasaNoEfectivas60d * 100).toFixed(0)}% no efectivas en 60 días`,
        evidence: {
          unique_providers_60d: prestadores60d.size,
          consultas_60d: consultas60d.length,
          no_efectivas_60d: noEfectivas60d,
          tasa_no_efectivas: tasaNoEfectivas60d
        },
        value: prestadores60d.size
      })
    }
  }

  // 2. Horario inverosímil (consultas muy seguidas)
  if (config.thresholds.impossibleScheduleFlag) {
    const impossibleSchedule = detectarHorarioInverosimil(consultas30d)
    if (impossibleSchedule) {
      signals.push({
        signalId: 'horario_inverosimil',
        track: 'fraude',
        score: 0.7,
        intensity: 'high',
        why: 'Consultas con horarios físicamente imposibles (muy seguidas)',
        evidence: {
          consultas_imposibles: impossibleSchedule.count
        },
        value: true
      })
    }
  }

  return signals
}

async function calcularSenalesClinicas(
  patient: any,
  consultas: any[],
  hace30dias: Date,
  config: RiskConfig
): Promise<Signal[]> {
  const signals: Signal[] = []
  const ahora = new Date()
  const edad = Math.floor((ahora.getTime() - new Date(patient.fechaNac).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  const consultas30d = consultas.filter(c => {
    const fechaConsulta = new Date(c.fecha)
    return fechaConsulta >= hace30dias && fechaConsulta <= ahora
  })
  const hace60dias = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000)
  const consultas60d = consultas.filter(c => {
    const fechaConsulta = new Date(c.fecha)
    return fechaConsulta >= hace60dias && fechaConsulta <= ahora
  })

  // 1. Edad extrema + alta utilización
  if ((edad > config.thresholds.ageRiskThreshold || edad < 5) && consultas30d.length > 5) {
    signals.push({
      signalId: 'edad_extrema',
      track: 'clinico',
      score: 0.5,
      intensity: 'medium',
      why: `Edad extrema (${edad} años) con alta utilización (${consultas30d.length} consultas en 30d)`,
      evidence: {
        edad,
        consultas_30d: consultas30d.length
      },
      value: edad,
      threshold: config.thresholds.ageRiskThreshold
    })
  }

  // 2. Comorbilidad (patologías crónicas)
  const patologias = patient.patologias ? JSON.parse(patient.patologias) : []
  if (patologias.length >= config.thresholds.chronicCountThreshold) {
    signals.push({
      signalId: 'comorbilidad',
      track: 'clinico',
      score: Math.min(1.0, patologias.length / (config.thresholds.chronicCountThreshold * 2)),
      intensity: 'medium',
      why: `Múltiples patologías crónicas: ${patologias.length}`,
      evidence: {
        patologias_count: patologias.length,
        patologias: patologias
      },
      value: patologias.length,
      threshold: config.thresholds.chronicCountThreshold
    })
  }

  // 3. Falta de seguimiento (derivación sin seguimiento) - también en 60 días
  const derivaciones30d = consultas30d.filter(c => c.deriva)
  const derivaciones60d = consultas60d.filter(c => c.deriva)
  
  const seguimientos30d = consultas30d.filter(c => {
    return derivaciones30d.some(d => 
      d.fecha < c.fecha && 
      (new Date(c.fecha).getTime() - new Date(d.fecha).getTime()) / (24 * 60 * 60 * 1000) <= config.thresholds.missingFollowupDays
    )
  })

  const seguimientos60d = consultas60d.filter(c => {
    return derivaciones60d.some(d => 
      d.fecha < c.fecha && 
      (new Date(c.fecha).getTime() - new Date(d.fecha).getTime()) / (24 * 60 * 60 * 1000) <= config.thresholds.missingFollowupDays
    )
  })

  if (derivaciones30d.length > seguimientos30d.length) {
    signals.push({
      signalId: 'falta_seguimiento_30d',
      track: 'clinico',
      score: Math.min(1.0, (derivaciones30d.length - seguimientos30d.length) / Math.max(derivaciones30d.length, 1)),
      intensity: 'medium',
      why: `${derivaciones30d.length - seguimientos30d.length} derivaciones sin seguimiento en ${config.thresholds.missingFollowupDays} días`,
      evidence: {
        derivaciones: derivaciones30d.length,
        seguimientos: seguimientos30d.length
      },
      value: derivaciones30d.length - seguimientos30d.length
    })
  }

  // Falta de seguimiento en 60 días (más crítico)
  if (derivaciones60d.length > seguimientos60d.length) {
    const faltantes = derivaciones60d.length - seguimientos60d.length
    signals.push({
      signalId: 'falta_seguimiento_60d',
      track: 'clinico',
      score: Math.min(1.0, faltantes / Math.max(derivaciones60d.length, 1)),
      intensity: faltantes >= 3 ? 'high' : 'medium',
      why: `${faltantes} derivaciones sin seguimiento en 60 días (atención fragmentada)`,
      evidence: {
        derivaciones_60d: derivaciones60d.length,
        seguimientos_60d: seguimientos60d.length,
        faltantes
      },
      value: faltantes
    })
  }

  return signals
}

async function calcularSenalesDatos(
  patient: any,
  consultas: any[],
  config: RiskConfig
): Promise<Signal[]> {
  const signals: Signal[] = []

  // Campos críticos del paciente
  const camposCriticos = ['telefono', 'email', 'localidad', 'provincia', 'fechaNac']
  const camposFaltantes = camposCriticos.filter(campo => !patient[campo as keyof typeof patient])
  const porcentajeFaltante = camposFaltantes.length / camposCriticos.length

  if (porcentajeFaltante > config.thresholds.missingDataFieldsThreshold) {
    signals.push({
      signalId: 'datos_incompletos_paciente',
      track: 'datos',
      score: porcentajeFaltante,
      intensity: porcentajeFaltante > 0.5 ? 'high' : 'medium',
      why: `Perfil incompleto: faltan ${camposFaltantes.length} de ${camposCriticos.length} campos críticos`,
      evidence: {
        campos_faltantes: camposFaltantes,
        porcentaje_faltante: porcentajeFaltante
      },
      value: camposFaltantes.length,
      threshold: camposCriticos.length * config.thresholds.missingDataFieldsThreshold
    })
  }

  // Consultas sin diagnóstico
  const consultasSinDiagnostico = consultas.filter(c => !c.diagnostico).length
  const porcentajeSinDiagnostico = consultas.length > 0 ? consultasSinDiagnostico / consultas.length : 0

  if (porcentajeSinDiagnostico > 0.2) {
    signals.push({
      signalId: 'consultas_sin_diagnostico',
      track: 'datos',
      score: porcentajeSinDiagnostico,
      intensity: 'medium',
      why: `${(porcentajeSinDiagnostico * 100).toFixed(0)}% de consultas sin diagnóstico`,
      evidence: {
        consultas_sin_diagnostico: consultasSinDiagnostico,
        total_consultas: consultas.length,
        porcentaje: porcentajeSinDiagnostico
      },
      value: porcentajeSinDiagnostico
    })
  }

  return signals
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function detectarReconsultasRapidas(consultas: any[]): number {
  let count = 0
  for (let i = 0; i < consultas.length - 1; i++) {
    const c1 = consultas[i]
    const c2 = consultas[i + 1]
    const horasDiferencia = (new Date(c1.fecha).getTime() - new Date(c2.fecha).getTime()) / (1000 * 60 * 60)
    
    if (horasDiferencia <= 72 && c1.motivoConsulta === c2.motivoConsulta) {
      count++
    }
  }
  return count
}

function detectarHorarioInverosimil(consultas: any[]): { count: number } | null {
  let count = 0
  for (let i = 0; i < consultas.length - 1; i++) {
    const c1 = consultas[i]
    const c2 = consultas[i + 1]
    const horasDiferencia = (new Date(c1.fecha).getTime() - new Date(c2.fecha).getTime()) / (1000 * 60 * 60)
    
    // Si hay 2+ consultas en menos de 2 horas, es sospechoso
    if (horasDiferencia <= 2 && horasDiferencia > 0) {
      count++
    }
  }
  return count > 0 ? { count } : null
}

async function obtenerCostoPromedioCohorte(patient: any, config: RiskConfig): Promise<number> {
  // Simplificado: promedio por plan y financiador
  // En producción, esto debería considerar edad, región, etc.
  const cohorte = await prisma.consulta.aggregate({
    where: {
      financiadorId: patient.financiadorId,
      fecha: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    },
    _avg: {
      costo: true
    }
  })

  return cohorte._avg.costo || 0
}

function calcularConfidenceYCoverage(patient: any, consultas: any[]): { confidence: number; dataCoverage: number } {
  // Confidence: basado en cantidad de datos disponibles
  const camposCriticos = ['telefono', 'email', 'localidad', 'provincia', 'fechaNac', 'nroAfiliado']
  const camposPresentes = camposCriticos.filter(c => patient[c as keyof typeof patient]).length
  const dataCoverage = camposPresentes / camposCriticos.length

  // Confidence aumenta con más consultas y datos completos
  const consultasFactor = Math.min(1.0, consultas.length / 10)
  const confidence = (dataCoverage * 0.6 + consultasFactor * 0.4)

  return { confidence, dataCoverage }
}

function createEmptyAssessment(version: string): RiskAssessment {
  return {
    riskGlobalScore: 0,
    riskGlobalLevel: 'bajo',
    trackScores: [],
    topReasons: [],
    evidence: [],
    confidence: 0,
    dataCoverage: 0,
    riskVersion: version,
    calculatedAt: new Date()
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE PROCESAMIENTO (similar a v1)
// ============================================================================

export async function procesarRiesgoPacienteV2(
  patientId: string,
  config: RiskConfig = defaultRiskConfig
) {
  const assessment = await calcularRiesgoPacienteV2(patientId, config)
  
  // Guardar en paciente
  await prisma.patient.update({
    where: { id: patientId },
    data: {
      riskScore: assessment.riskGlobalScore,
      riskLevel: assessment.riskGlobalLevel,
      riskReasons: JSON.stringify(assessment.topReasons),
      lastRiskCalculationAt: assessment.calculatedAt,
      riskVersion: config.version
    }
  })

  // Guardar en historial (con más detalle)
  await prisma.patientRiskHistory.create({
    data: {
      patientId,
      riskScore: assessment.riskGlobalScore,
      riskLevel: assessment.riskGlobalLevel,
      riskReasons: JSON.stringify({
        topReasons: assessment.topReasons,
        trackScores: assessment.trackScores.map(t => ({
          track: t.track,
          score: t.score
        })),
        confidence: assessment.confidence,
        dataCoverage: assessment.dataCoverage
      }),
      riskVersion: config.version
    }
  })

  return assessment
}
