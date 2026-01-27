/**
 * Motor de Cotización Pre-Alta de Pacientes
 * 
 * Calcula riesgo y costo esperado basado en datos demográficos,
 * historia clínica y patrones de uso antes del alta del paciente.
 */

export interface QuoteInputs {
  // Datos demográficos
  edad: number
  sexo: 'M' | 'F' | 'Otro'
  provincia?: string
  
  // Historia clínica
  patologiasCronicas: string[] // ej: ['diabetes', 'HTA', 'EPOC']
  medicamentosCronicos: number // cantidad
  
  // Uso reciente (últimos 12 meses)
  consultasTotales: number
  consultasGuardia: number
  internaciones: number
  especialidadesDistintas: number
  
  // Señales adicionales
  reconsultasRapidas: boolean // reconsultas < 72h
  tasaNoEfectivas: number // % estimado (0-1)
}

import { calcularPrecioSugerido, getPricingConfigForPlan, PricingResult, PlanPricingConfig } from './plan-pricing-engine'

export interface QuoteResult {
  riskScore: number // 0-100
  riskLevel: 'bajo' | 'medio' | 'alto'
  expectedCost12m: number
  expectedCostP95: number
  priceCategory: 'BAJO RIESGO' | 'MEDIO RIESGO' | 'ALTO RIESGO'
  riskFactor: number
  confidence: 'Alta' | 'Media' | 'Baja'
  reasons: string[]
  modelVersion: string
  pricing?: PricingResult
  pricingConfig?: PlanPricingConfig
}

/**
 * Calcula el baseline de costo por cohorte (edad + región)
 */
function calcularBaselineCosto(inputs: QuoteInputs): number {
  // Baseline por edad
  let baseline = 50000 // Base anual
  
  if (inputs.edad < 5) {
    baseline = 60000 // Niños
  } else if (inputs.edad >= 65) {
    baseline = 80000 // Adultos mayores
  } else if (inputs.edad >= 18 && inputs.edad < 65) {
    baseline = 50000 // Adultos
  } else {
    baseline = 40000 // Adolescentes
  }
  
  // Ajuste por región (simplificado)
  // En producción, esto vendría de datos históricos
  if (inputs.provincia) {
    const provinciasCaras = ['Buenos Aires', 'CABA', 'Córdoba']
    if (provinciasCaras.includes(inputs.provincia)) {
      baseline *= 1.2
    }
  }
  
  return baseline
}

/**
 * Calcula el risk score (0-100)
 */
function calcularRiskScore(inputs: QuoteInputs): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  
  // 1. Edad > 65
  if (inputs.edad > 65) {
    score += 15
    reasons.push(`Edad avanzada (${inputs.edad} años) aumenta el riesgo`)
  }
  
  // 2. Patologías crónicas
  const patologiasCount = inputs.patologiasCronicas.length
  if (patologiasCount > 0) {
    const puntosPatologias = Math.min(30, patologiasCount * 10)
    score += puntosPatologias
    reasons.push(`${patologiasCount} patología(s) crónica(s): ${inputs.patologiasCronicas.join(', ')}`)
  }
  
  // 3. Alta frecuencia de consultas
  if (inputs.consultasTotales > 12) {
    const exceso = inputs.consultasTotales - 12
    const puntos = Math.min(20, exceso * 2)
    score += puntos
    reasons.push(`Alta frecuencia de consultas: ${inputs.consultasTotales} en 12 meses`)
  }
  
  // 4. Uso de guardia repetido
  if (inputs.consultasGuardia > 5) {
    const puntos = Math.min(15, (inputs.consultasGuardia - 5) * 3)
    score += puntos
    reasons.push(`Uso frecuente de guardia: ${inputs.consultasGuardia} consultas`)
  }
  
  // 5. Internaciones recientes
  if (inputs.internaciones > 0) {
    const puntos = Math.min(20, inputs.internaciones * 10)
    score += puntos
    reasons.push(`${inputs.internaciones} internación(es) en últimos 12 meses`)
  }
  
  // 6. Múltiples especialidades (fragmentación)
  if (inputs.especialidadesDistintas > 5) {
    const puntos = Math.min(10, (inputs.especialidadesDistintas - 5) * 2)
    score += puntos
    reasons.push(`Alta fragmentación: ${inputs.especialidadesDistintas} especialidades distintas`)
  }
  
  // 7. Reconsultas rápidas
  if (inputs.reconsultasRapidas) {
    score += 10
    reasons.push('Patrón de reconsultas rápidas (< 72h) detectado')
  }
  
  // 8. Alta tasa de consultas no efectivas
  if (inputs.tasaNoEfectivas > 0.3) {
    const puntos = Math.min(10, (inputs.tasaNoEfectivas - 0.3) * 20)
    score += puntos
    reasons.push(`Alta tasa de consultas no efectivas: ${(inputs.tasaNoEfectivas * 100).toFixed(0)}%`)
  }
  
  // Cap a 100
  score = Math.min(100, score)
  
  return { score, reasons }
}

/**
 * Calcula el costo esperado ajustado
 */
function calcularCostoEsperado(inputs: QuoteInputs, baseline: number): { expected: number; p95: number } {
  let costo = baseline
  
  // Ajustes por patologías
  const ajustePatologias = inputs.patologiasCronicas.length * 0.15 // +15% por patología
  costo *= (1 + ajustePatologias)
  
  // Ajuste por internaciones
  if (inputs.internaciones > 0) {
    costo += inputs.internaciones * 150000 // ~$150k por internación
  }
  
  // Ajuste por uso de guardia
  if (inputs.consultasGuardia > 5) {
    const excesoGuardia = inputs.consultasGuardia - 5
    costo += excesoGuardia * 8000 // ~$8k por guardia extra
  }
  
  // Ajuste por alta frecuencia
  if (inputs.consultasTotales > 12) {
    const excesoConsultas = inputs.consultasTotales - 12
    costo += excesoConsultas * 5000 // ~$5k por consulta extra
  }
  
  // Ajuste por fragmentación
  if (inputs.especialidadesDistintas > 5) {
    costo *= 1.1 // +10% por fragmentación
  }
  
  // Escenario P95 (percentil 95) = expected * 1.5
  const p95 = costo * 1.5
  
  return { expected: Math.round(costo), p95: Math.round(p95) }
}

/**
 * Determina la categoría de precio y factor de riesgo
 */
function determinarCategoria(riskScore: number): { category: 'BAJO RIESGO' | 'MEDIO RIESGO' | 'ALTO RIESGO'; factor: number } {
  if (riskScore >= 70) {
    return { category: 'ALTO RIESGO', factor: 1.6 }
  } else if (riskScore >= 40) {
    return { category: 'MEDIO RIESGO', factor: 1.3 }
  } else {
    return { category: 'BAJO RIESGO', factor: 1.0 }
  }
}

/**
 * Calcula el nivel de confianza basado en datos disponibles
 */
function calcularConfidence(inputs: QuoteInputs): 'Alta' | 'Media' | 'Baja' {
  let datosCompletos = 0
  const totalCampos = 10
  
  // Datos demográficos
  if (inputs.edad > 0) datosCompletos++
  if (inputs.sexo) datosCompletos++
  if (inputs.provincia) datosCompletos++
  
  // Historia clínica
  if (inputs.patologiasCronicas.length > 0) datosCompletos++
  if (inputs.medicamentosCronicos >= 0) datosCompletos++
  
  // Uso reciente
  if (inputs.consultasTotales >= 0) datosCompletos++
  if (inputs.consultasGuardia >= 0) datosCompletos++
  if (inputs.internaciones >= 0) datosCompletos++
  if (inputs.especialidadesDistintas >= 0) datosCompletos++
  
  const porcentaje = datosCompletos / totalCampos
  
  if (porcentaje >= 0.8) return 'Alta'
  if (porcentaje >= 0.5) return 'Media'
  return 'Baja'
}

/**
 * Función principal de cotización
 */
export function calcularCotizacion(
  inputs: QuoteInputs,
  planNombre?: string
): QuoteResult {
  // Validar inputs
  if (inputs.edad <= 0 || inputs.edad > 120) {
    throw new Error('Edad inválida')
  }
  
  if (inputs.consultasTotales < 0 || inputs.consultasGuardia < 0 || inputs.internaciones < 0) {
    throw new Error('Valores de uso no pueden ser negativos')
  }
  
  // Calcular risk score
  const { score: riskScore, reasons } = calcularRiskScore(inputs)
  
  // Determinar nivel de riesgo
  let riskLevel: 'bajo' | 'medio' | 'alto' = 'bajo'
  if (riskScore >= 70) riskLevel = 'alto'
  else if (riskScore >= 40) riskLevel = 'medio'
  
  // Calcular baseline y costo esperado
  const baseline = calcularBaselineCosto(inputs)
  const { expected: expectedCost12m, p95: expectedCostP95 } = calcularCostoEsperado(inputs, baseline)
  
  // Determinar categoría y factor
  const { category: priceCategory, factor: riskFactor } = determinarCategoria(riskScore)
  
  // Calcular confianza
  const confidence = calcularConfidence(inputs)
  
  // Calcular pricing sugerido
  const pricingConfig = getPricingConfigForPlan(planNombre)
  const pricing = calcularPrecioSugerido(
    expectedCost12m,
    expectedCostP95,
    confidence,
    riskLevel,
    pricingConfig
  )
  
  // Agregar explicaciones adicionales
  const allReasons = [
    ...reasons,
    `Baseline de costo: $${baseline.toLocaleString()} (cohorte: ${inputs.edad} años, ${inputs.provincia || 'región no especificada'})`,
    `Costo esperado ajustado: $${expectedCost12m.toLocaleString()} (escenario alto: $${expectedCostP95.toLocaleString()})`,
    `Factor de riesgo aplicado: ${riskFactor}x`,
    `Precio mensual sugerido: $${pricing.suggestedPriceMonthly.toLocaleString()} (rango: $${pricing.range.min.toLocaleString()} - $${pricing.range.max.toLocaleString()})`
  ]
  
  return {
    riskScore,
    riskLevel,
    expectedCost12m,
    expectedCostP95,
    priceCategory,
    riskFactor,
    confidence,
    reasons: allReasons,
    modelVersion: '1.0',
    pricing,
    pricingConfig
  }
}
