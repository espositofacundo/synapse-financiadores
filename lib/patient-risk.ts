import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export interface PatientRiskRules {
  maxConsultasEn7d: number
  maxConsultasEn30d: number
  maxUsoGuardiaEn30d: number
  maxCostoEn30d: number
  maxDerivacionesRepetidas: number
  flagPacienteCronico: boolean
  flagPerfilIncompleto: boolean
  flagCoberturaInconsistente: boolean
}

export const defaultPatientRiskRules: PatientRiskRules = {
  maxConsultasEn7d: 3,
  maxConsultasEn30d: 8,
  maxUsoGuardiaEn30d: 5,
  maxCostoEn30d: 50000,
  maxDerivacionesRepetidas: 3,
  flagPacienteCronico: true,
  flagPerfilIncompleto: true,
  flagCoberturaInconsistente: true
}

export interface RiskReason {
  ruleId: string
  label: string
  details: string
  value: number | string | boolean
  threshold: number | string
}

export async function calcularRiesgoPaciente(
  patientId: string,
  rules: PatientRiskRules
): Promise<{ riskScore: number; riskLevel: string; riskReasons: RiskReason[] }> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      consultas: {
        orderBy: { fecha: 'desc' },
        take: 100 // Últimas 100 consultas para análisis
      }
    }
  })

  if (!patient) {
    return { riskScore: 0, riskLevel: 'bajo', riskReasons: [] }
  }

  let riskScore = 0
  const riskReasons: RiskReason[] = []

  const ahora = new Date()
  const hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
  const hace30dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)

  // 1. Reconsultas en 7 días
  const consultas7d = patient.consultas.filter(
    c => c.fecha >= hace7dias && c.fecha <= ahora
  ).length

  if (consultas7d > rules.maxConsultasEn7d) {
    riskScore += 25
    riskReasons.push({
      ruleId: 'maxConsultasEn7d',
      label: 'Exceso de consultas en 7 días',
      details: `Paciente tuvo ${consultas7d} consultas en 7 días`,
      value: consultas7d,
      threshold: rules.maxConsultasEn7d
    })
  }

  // 2. Reconsultas en 30 días
  const consultas30d = patient.consultas.filter(
    c => c.fecha >= hace30dias && c.fecha <= ahora
  ).length

  if (consultas30d > rules.maxConsultasEn30d) {
    riskScore += 20
    riskReasons.push({
      ruleId: 'maxConsultasEn30d',
      label: 'Exceso de consultas en 30 días',
      details: `Paciente tuvo ${consultas30d} consultas en 30 días`,
      value: consultas30d,
      threshold: rules.maxConsultasEn30d
    })
  }

  // 3. Uso excesivo de guardia
  const guardias30d = patient.consultas.filter(
    c => c.fecha >= hace30dias && c.canal === 'guardia'
  ).length

  if (guardias30d > rules.maxUsoGuardiaEn30d) {
    riskScore += 15
    riskReasons.push({
      ruleId: 'maxUsoGuardiaEn30d',
      label: 'Uso excesivo de guardia',
      details: `Paciente usó guardia ${guardias30d} veces en 30 días`,
      value: guardias30d,
      threshold: rules.maxUsoGuardiaEn30d
    })
  }

  // 4. Costo alto en 30 días
  const costo30d = patient.consultas
    .filter(c => c.fecha >= hace30dias)
    .reduce((sum, c) => sum + c.costo, 0)

  if (costo30d > rules.maxCostoEn30d) {
    riskScore += 20
    riskReasons.push({
      ruleId: 'maxCostoEn30d',
      label: 'Costo elevado en 30 días',
      details: `Costo total de $${costo30d.toLocaleString()} en 30 días`,
      value: costo30d,
      threshold: rules.maxCostoEn30d
    })
  }

  // 5. Derivaciones repetidas
  const derivaciones = patient.consultas.filter(c => c.deriva && c.prestadorDerivado)
  const derivacionesPorPrestador = derivaciones.reduce((acc, c) => {
    const prestadorId = c.prestadorDerivado || 'unknown'
    acc[prestadorId] = (acc[prestadorId] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const maxDerivaciones = Math.max(...Object.values(derivacionesPorPrestador), 0)
  if (maxDerivaciones > rules.maxDerivacionesRepetidas) {
    riskScore += 15
    riskReasons.push({
      ruleId: 'maxDerivacionesRepetidas',
      label: 'Patrón de derivación repetida',
      details: `Derivación repetida al mismo prestador (${maxDerivaciones} veces)`,
      value: maxDerivaciones,
      threshold: rules.maxDerivacionesRepetidas
    })
  }

  // 6. Paciente crónico
  if (rules.flagPacienteCronico && patient.esCronico) {
    riskScore += 10
    riskReasons.push({
      ruleId: 'flagPacienteCronico',
      label: 'Paciente crónico',
      details: 'Paciente marcado como crónico',
      value: true,
      threshold: 'flag activo'
    })
  }

  // 7. Perfil incompleto
  if (rules.flagPerfilIncompleto) {
    const camposRequeridos = ['telefono', 'email', 'localidad', 'provincia']
    const camposFaltantes = camposRequeridos.filter(campo => !patient[campo as keyof typeof patient])
    
    if (camposFaltantes.length > 2) {
      riskScore += 5
      riskReasons.push({
        ruleId: 'flagPerfilIncompleto',
        label: 'Perfil incompleto',
        details: `Faltan ${camposFaltantes.length} campos importantes`,
        value: camposFaltantes.length,
        threshold: 2
      })
    }
  }

  // 8. Cobertura inconsistente
  if (rules.flagCoberturaInconsistente && patient.estadoCobertura !== 'activa') {
    riskScore += 10
    riskReasons.push({
      ruleId: 'flagCoberturaInconsistente',
      label: 'Cobertura no activa',
      details: `Estado de cobertura: ${patient.estadoCobertura}`,
      value: patient.estadoCobertura,
      threshold: 'activa'
    })
  }

  // Clasificar riesgo
  let riskLevel = 'bajo'
  if (riskScore >= 70) {
    riskLevel = 'alto'
  } else if (riskScore >= 40) {
    riskLevel = 'medio'
  }

  return { riskScore, riskLevel, riskReasons }
}

export async function procesarRiesgoPaciente(
  patientId: string,
  rules: PatientRiskRules
) {
  const { riskScore, riskLevel, riskReasons } = await calcularRiesgoPaciente(patientId, rules)
  
  // Guardar en paciente
  await prisma.patient.update({
    where: { id: patientId },
    data: {
      riskScore,
      riskLevel,
      riskReasons: JSON.stringify(riskReasons),
      lastRiskCalculationAt: new Date(),
      riskVersion: '1.0'
    }
  })

  // Guardar en historial
  await prisma.patientRiskHistory.create({
    data: {
      patientId,
      riskScore,
      riskLevel,
      riskReasons: JSON.stringify(riskReasons),
      riskVersion: '1.0'
    }
  })

  return { riskScore, riskLevel, riskReasons }
}
