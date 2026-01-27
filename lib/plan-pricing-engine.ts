/**
 * Motor de Pricing para Planes de Salud
 * 
 * Calcula el precio mensual sugerido basado en:
 * - Costo esperado (expected_cost_12m y expected_cost_p95)
 * - Nivel de confianza
 * - Configuración de pricing del plan
 */

export interface PlanPricingConfig {
  // Porcentajes de ajuste
  adminLoadPct: number          // % de carga administrativa (ej: 0.15 = 15%)
  marginPct: number             // % de margen (ej: 0.20 = 20%)
  riskPoolingPct: number          // % para pooling de riesgo (ej: 0.10 = 10%)
  p95BlendPct: number           // % de peso del escenario P95 (ej: 0.30 = 30%)
  lowConfidenceSurchargePct: number // % recargo por baja confianza (ej: 0.15 = 15%)
  
  // Límites
  minPrice: number               // Precio mínimo mensual
  maxPrice: number               // Precio máximo mensual
  roundingStep: number           // Paso de redondeo (ej: 100 = redondea a múltiplos de $100)
}

export interface PricingBreakdown {
  baseCost: number               // Costo base (expected_cost_12m / 12)
  p95Adjustment: number          // Ajuste por escenario P95
  blendedCost: number            // Costo combinado (base + p95)
  adminLoad: number              // Carga administrativa
  margin: number                 // Margen
  riskPooling: number            // Pooling de riesgo
  confidenceSurcharge: number    // Recargo por baja confianza
  subtotal: number               // Subtotal antes de límites
  clamped: boolean               // Si fue ajustado por min/max
  finalPrice: number             // Precio final mensual
}

export interface PricingResult {
  suggestedPriceMonthly: number
  range: {
    min: number
    max: number
  }
  breakdown: PricingBreakdown
  flags: {
    clamped: boolean
    lowConfidence: boolean
    highRisk: boolean
  }
}

/**
 * Configuración por defecto de pricing
 */
export const defaultPricingConfig: PlanPricingConfig = {
  adminLoadPct: 0.15,           // 15% carga administrativa
  marginPct: 0.20,              // 20% margen
  riskPoolingPct: 0.10,         // 10% pooling de riesgo
  p95BlendPct: 0.30,            // 30% peso del escenario P95
  lowConfidenceSurchargePct: 0.15, // 15% recargo por baja confianza
  minPrice: 5000,               // $5,000 mínimo mensual
  maxPrice: 50000,              // $50,000 máximo mensual
  roundingStep: 100             // Redondeo a múltiplos de $100
}

/**
 * Calcula el precio mensual sugerido del plan
 */
export function calcularPrecioSugerido(
  expectedCost12m: number,
  expectedCostP95: number,
  confidence: 'Alta' | 'Media' | 'Baja',
  riskLevel: 'bajo' | 'medio' | 'alto',
  config: PlanPricingConfig = defaultPricingConfig
): PricingResult {
  // 1. Costo base mensual
  const baseCostMonthly = expectedCost12m / 12
  
  // 2. Ajuste por escenario P95 (blend)
  const p95CostMonthly = expectedCostP95 / 12
  const p95Adjustment = (p95CostMonthly - baseCostMonthly) * config.p95BlendPct
  const blendedCost = baseCostMonthly + p95Adjustment
  
  // 3. Carga administrativa
  const adminLoad = blendedCost * config.adminLoadPct
  
  // 4. Margen
  const costWithAdmin = blendedCost + adminLoad
  const margin = costWithAdmin * config.marginPct
  
  // 5. Pooling de riesgo
  const costWithMargin = costWithAdmin + margin
  const riskPooling = costWithMargin * config.riskPoolingPct
  
  // 6. Recargo por baja confianza
  let confidenceSurcharge = 0
  if (confidence === 'Baja') {
    confidenceSurcharge = costWithMargin * config.lowConfidenceSurchargePct
  } else if (confidence === 'Media') {
    confidenceSurcharge = costWithMargin * (config.lowConfidenceSurchargePct * 0.5)
  }
  
  // 7. Subtotal
  const subtotal = costWithMargin + riskPooling + confidenceSurcharge
  
  // 8. Aplicar límites (clamp)
  let finalPrice = subtotal
  let clamped = false
  
  if (finalPrice < config.minPrice) {
    finalPrice = config.minPrice
    clamped = true
  } else if (finalPrice > config.maxPrice) {
    finalPrice = config.maxPrice
    clamped = true
  }
  
  // 9. Redondeo
  finalPrice = Math.round(finalPrice / config.roundingStep) * config.roundingStep
  
  // 10. Calcular rango (basado en ±20% del precio sugerido)
  const rangeMin = Math.max(
    config.minPrice,
    Math.round((finalPrice * 0.8) / config.roundingStep) * config.roundingStep
  )
  const rangeMax = Math.min(
    config.maxPrice,
    Math.round((finalPrice * 1.2) / config.roundingStep) * config.roundingStep
  )
  
  // 11. Flags
  const flags = {
    clamped,
    lowConfidence: confidence === 'Baja',
    highRisk: riskLevel === 'alto'
  }
  
  // 12. Breakdown
  const breakdown: PricingBreakdown = {
    baseCost: baseCostMonthly,
    p95Adjustment,
    blendedCost,
    adminLoad,
    margin,
    riskPooling,
    confidenceSurcharge,
    subtotal,
    clamped,
    finalPrice
  }
  
  return {
    suggestedPriceMonthly: finalPrice,
    range: {
      min: rangeMin,
      max: rangeMax
    },
    breakdown,
    flags
  }
}

/**
 * Obtiene configuración de pricing por plan
 * En producción, esto vendría de la BD o configuración
 */
export function getPricingConfigForPlan(planNombre?: string): PlanPricingConfig {
  // Por ahora, retornamos la configuración por defecto
  // En producción, esto podría variar por plan
  const config = { ...defaultPricingConfig }
  
  // Ejemplo: planes premium podrían tener mayor margen
  if (planNombre?.toLowerCase().includes('premium')) {
    config.marginPct = 0.25 // 25% para premium
    config.minPrice = 8000
    config.maxPrice = 60000
  } else if (planNombre?.toLowerCase().includes('básico')) {
    config.marginPct = 0.15 // 15% para básico
    config.minPrice = 3000
    config.maxPrice = 30000
  }
  
  return config
}
