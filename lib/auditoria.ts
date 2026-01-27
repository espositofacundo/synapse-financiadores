import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface AuditoriaRule {
  id: string
  label: string
  enabled: boolean
  value: number | boolean | Record<string, number>
}

export interface AuditoriaRules {
  maxConsultasPorAfiliadoEn7d: number
  maxCostoPorConsultaPorEspecialidad: Record<string, number>
  flagSiNoHayDiagnostico: boolean
  flagSiDuracionMin: number
  flagSiDerivaSiempreMismoPrestador: boolean
}

export const defaultRules: AuditoriaRules = {
  maxConsultasPorAfiliadoEn7d: 3,
  maxCostoPorConsultaPorEspecialidad: {
    clínica: 5000,
    pediatría: 5000,
    gineco: 6000,
    cardio: 12000,
    traumatología: 12000,
    psiquiatría: 10000
  },
  flagSiNoHayDiagnostico: true,
  flagSiDuracionMin: 3,
  flagSiDerivaSiempreMismoPrestador: true
}

export interface TriggeredRule {
  ruleId: string
  label: string
  details: string
  value: number | string
  threshold: number | string
}

export async function calcularRiskScore(
  consultaId: string,
  rules: AuditoriaRules
): Promise<{ riskScore: number; riskLevel: string; triggeredRules: TriggeredRule[] }> {
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

  if (!consulta) {
    return { riskScore: 0, riskLevel: 'bajo', triggeredRules: [] }
  }

  let riskScore = 0
  const triggeredRules: TriggeredRule[] = []

  // Regla 1: Reconsultas en 7 días
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

  // Regla 2: Costo alto por especialidad
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

  // Regla 3: Duración muy baja
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

  // Regla 4: Sin diagnóstico
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

  // Regla 5: Patrón de derivación repetida
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

  // Clasificar riesgo
  let riskLevel = 'bajo'
  if (riskScore >= 70) {
    riskLevel = 'alto'
  } else if (riskScore >= 40) {
    riskLevel = 'medio'
  }

  return { riskScore, riskLevel, triggeredRules }
}

export async function procesarAuditoriaParaConsulta(consultaId: string, rules: AuditoriaRules) {
  const { riskScore, riskLevel, triggeredRules } = await calcularRiskScore(consultaId, rules)
  
  await prisma.consulta.update({
    where: { id: consultaId },
    data: {
      riskScore,
      riskLevel,
      triggeredRules: JSON.stringify(triggeredRules)
    }
  })

  return { riskScore, riskLevel, triggeredRules }
}
