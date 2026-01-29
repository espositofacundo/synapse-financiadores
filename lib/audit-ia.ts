/**
 * Simulación de agente IA para auditoría (POC).
 * No usa APIs externas ni ML real; genera hallazgos determinísticos/mock.
 */

export type AuditType = 'FACTURA' | 'PRACTICA' | 'ADMINISTRATIVA' | 'CLINICA'
export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH'
export type FindingCategory = 'DUPLICADO' | 'INCONSISTENCIA' | 'SOBREPRACTICA' | 'CLINICA'

export interface MockFinding {
  severity: FindingSeverity
  category: FindingCategory
  description: string
  confidence: number
  suggestedAction: string
}

const SEVERITIES: FindingSeverity[] = ['LOW', 'MEDIUM', 'HIGH']
const CATEGORIES: FindingCategory[] = ['DUPLICADO', 'INCONSISTENCIA', 'SOBREPRACTICA', 'CLINICA']

const DESCRIPTIONS: Record<FindingCategory, string[]> = {
  DUPLICADO: [
    'Factura duplicada detectada para el mismo prestador y fecha.',
    'Posible doble facturación en período de 7 días.',
    'Mismo concepto facturado dos veces en el mes.'
  ],
  INCONSISTENCIA: [
    'Inconsistencia entre diagnóstico y práctica facturada.',
    'Prestador sin matrícula vigente al momento del acto.',
    'Fecha de factura fuera del período de cobertura.'
  ],
  SOBREPRACTICA: [
    'Frecuencia de consultas por encima del promedio del grupo.',
    'Posible sobreutilización de estudios complementarios.',
    'Múltiples consultas en mismo día sin justificación clínica.'
  ],
  CLINICA: [
    'Brecha en continuidad de tratamiento crónico.',
    'Estudio solicitado sin correlato en historia clínica.',
    'Medicación de alto costo sin registro de indicación.'
  ]
}

const SUGGESTED_ACTIONS: Record<FindingCategory, string[]> = {
  DUPLICADO: ['Solicitar acreditación al prestador.', 'Descontar del pago y notificar.', 'Validar con sistema de facturación.'],
  INCONSISTENCIA: ['Pedir documentación respaldatoria.', 'Revisar con área médica.', 'Solicitar corrección al prestador.'],
  SOBREPRACTICA: ['Auditoría médica del caso.', 'Contactar al prestador para explicación.', 'Monitorear próximos períodos.'],
  CLINICA: ['Solicitar historia clínica completa.', 'Evaluar con comité de auditoría.', 'Pedir justificación clínica.']
}

/**
 * Genera hallazgos mock para una auditoría (determinístico según auditId).
 */
export function runMockAudit(auditType: AuditType, populationModelId: string, entitiesCount: number): MockFinding[] {
  const findings: MockFinding[] = []
  const seed = hashString(`${populationModelId}-${auditType}`)
  const rng = seededRandom(seed)

  const numFindings = Math.min(3 + Math.floor(rng() * 5), 8)
  const usedCategories = new Set<FindingCategory>()

  for (let i = 0; i < numFindings; i++) {
    const category = CATEGORIES[Math.floor(rng() * CATEGORIES.length)]
    const severity = SEVERITIES[Math.floor(rng() * SEVERITIES.length)]
    const descs = DESCRIPTIONS[category]
    const actions = SUGGESTED_ACTIONS[category]
    findings.push({
      severity,
      category,
      description: descs[Math.floor(rng() * descs.length)],
      confidence: 0.6 + rng() * 0.35,
      suggestedAction: actions[Math.floor(rng() * actions.length)]
    })
  }

  return findings
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i) | 0
  }
  return Math.abs(h)
}

function seededRandom(seed: number): () => number {
  let s = seed
  return function () {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

/**
 * Estima ahorro potencial (mock) en pesos según hallazgos.
 */
export function estimateSavings(findings: MockFinding[]): number {
  let total = 0
  for (const f of findings) {
    const base = f.severity === 'HIGH' ? 15000 : f.severity === 'MEDIUM' ? 5000 : 1500
    total += base * f.confidence
  }
  return Math.round(total)
}
