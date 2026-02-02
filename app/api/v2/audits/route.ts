import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2/audits
 * Lista auditorías con nuevo modelo
 */
export async function GET() {
  try {
    await requirePermission('audit:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const audits = await prisma.audit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        targetConsultation: { select: { id: true, displayName: true, especialidad: true } },
        _count: { select: { findings: true } }
      }
    })

    return NextResponse.json(audits.map(a => ({
      ...a,
      maxSeverity: a.findingsCountHigh > 0 ? 'HIGH' : a.findingsCountMedium > 0 ? 'MEDIUM' : 'LOW'
    })))
  } catch (error: any) {
    console.error('[v2/audits] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/v2/audits
 * Crea y ejecuta auditoría con modo (SINGLE, BATCH_FILTER, RECOMMENDED_SET)
 */
export async function POST(request: NextRequest) {
  let user
  try {
    user = await requirePermission('audit:run')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const {
      auditType,
      auditScope,
      targetConsultationId,
      filterPayload,
      recommendedPayload,
      consultationIds // Para RECOMMENDED_SET, lista de IDs seleccionados
    } = body as {
      auditType: string
      auditScope: string
      targetConsultationId?: string
      filterPayload?: any
      recommendedPayload?: any
      consultationIds?: string[]
    }

    // Validaciones
    if (!auditType || !auditScope) {
      return NextResponse.json(
        { error: 'auditType y auditScope son requeridos' },
        { status: 400 }
      )
    }
    const validTypes = ['FACTURA', 'PRACTICA', 'ADMINISTRATIVA', 'CLINICA']
    const validScopes = ['SINGLE_CONSULTATION', 'BATCH_FILTER', 'RECOMMENDED_SET']
    if (!validTypes.includes(auditType)) {
      return NextResponse.json({ error: 'auditType inválido' }, { status: 400 })
    }
    if (!validScopes.includes(auditScope)) {
      return NextResponse.json({ error: 'auditScope inválido' }, { status: 400 })
    }

    // Crear auditoría
    const audit = await prisma.audit.create({
      data: {
        auditType,
        auditScope,
        status: 'RUNNING',
        startedAt: new Date(),
        targetConsultationId: auditScope === 'SINGLE_CONSULTATION' ? targetConsultationId : null,
        filterPayload: filterPayload ? JSON.stringify(filterPayload) : null,
        recommendedPayload: recommendedPayload ? JSON.stringify(recommendedPayload) : null,
        createdByUserId: user.id
      }
    })

    // Determinar consultas a auditar según scope
    let consultationsToAudit: { id: string; costo: number; riskLevel: string; especialidad: string }[] = []

    if (auditScope === 'SINGLE_CONSULTATION' && targetConsultationId) {
      const c = await prisma.consulta.findUnique({
        where: { id: targetConsultationId },
        select: { id: true, costo: true, riskLevel: true, especialidad: true }
      })
      if (c) consultationsToAudit = [c]
    } else if (auditScope === 'BATCH_FILTER') {
      // Si se enviaron IDs específicos, usarlos directamente
      if (consultationIds?.length) {
        consultationsToAudit = await prisma.consulta.findMany({
          where: { id: { in: consultationIds } },
          select: { id: true, costo: true, riskLevel: true, especialidad: true }
        })
      } else if (filterPayload) {
        // Construir where desde filterPayload
        const where: any = {}
        if (filterPayload.from) where.fecha = { ...where.fecha, gte: new Date(filterPayload.from) }
        if (filterPayload.to) where.fecha = { ...where.fecha, lte: new Date(filterPayload.to) }
        if (filterPayload.especialidad && filterPayload.especialidad !== 'all') where.especialidad = filterPayload.especialidad
        if (filterPayload.canal && filterPayload.canal !== 'all') where.canal = filterPayload.canal
        if (filterPayload.riskLevel && filterPayload.riskLevel !== 'all') where.riskLevel = filterPayload.riskLevel
        if (filterPayload.costAboveP95) where.costo = { gte: filterPayload.costThreshold || 10000 }

        consultationsToAudit = await prisma.consulta.findMany({
          where,
          select: { id: true, costo: true, riskLevel: true, especialidad: true },
          take: 100 // Limitar para POC
        })
      }
    } else if (auditScope === 'RECOMMENDED_SET' && consultationIds?.length) {
      consultationsToAudit = await prisma.consulta.findMany({
        where: { id: { in: consultationIds } },
        select: { id: true, costo: true, riskLevel: true, especialidad: true }
      })
    }

    // Ejecutar auditoría simulada y generar hallazgos
    const findings = await generateMockFindings(audit.id, auditType, consultationsToAudit)

    // Actualizar conteos
    const findingsCountHigh = findings.filter(f => f.severity === 'HIGH').length
    const findingsCountMedium = findings.filter(f => f.severity === 'MEDIUM').length
    const findingsCountLow = findings.filter(f => f.severity === 'LOW').length
    const estimatedSavings = findings.reduce((sum, f) => {
      const base = f.severity === 'HIGH' ? 15000 : f.severity === 'MEDIUM' ? 5000 : 1500
      return sum + base * f.confidence
    }, 0)

    // Actualizar consultas auditadas
    for (const c of consultationsToAudit) {
      const hasFinding = findings.some(f => f.consultationId === c.id)
      await prisma.consulta.update({
        where: { id: c.id },
        data: { auditStatus: hasFinding ? 'HAS_FINDINGS' : 'AUDITED' }
      })
    }

    // Completar auditoría
    const completedAudit = await prisma.audit.update({
      where: { id: audit.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        findingsCountTotal: findings.length,
        findingsCountHigh,
        findingsCountMedium,
        findingsCountLow,
        estimatedSavings: Math.round(estimatedSavings),
        consultationsAudited: consultationsToAudit.length
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        targetConsultation: { select: { id: true, displayName: true } },
        findings: true,
        _count: { select: { findings: true } }
      }
    })

    return NextResponse.json({
      audit: completedAudit,
      maxSeverity: findingsCountHigh > 0 ? 'HIGH' : findingsCountMedium > 0 ? 'MEDIUM' : 'LOW'
    })
  } catch (error: any) {
    console.error('[v2/audits] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function generateMockFindings(
  auditId: string,
  auditType: string,
  consultations: { id: string; costo: number; riskLevel: string; especialidad: string }[]
) {
  const findings: any[] = []
  
  const FINDING_TEMPLATES: Record<string, { title: string; category: string; description: string }[]> = {
    FACTURA: [
      { title: 'Posible factura duplicada', category: 'DUPLICADO', description: 'Se detectó una factura con características similares en el período.' },
      { title: 'Monto inconsistente', category: 'INCONSISTENCIA', description: 'El monto facturado no corresponde con la práctica registrada.' },
      { title: 'Factura sin prestación asociada', category: 'ADMIN', description: 'Factura sin prestación médica que la justifique.' }
    ],
    PRACTICA: [
      { title: 'Sobreutilización detectada', category: 'SOBREPRACTICA', description: 'Frecuencia de prácticas por encima del promedio para este perfil.' },
      { title: 'Práctica sin justificación clínica', category: 'CLINICA', description: 'No se encontró correlato clínico para esta práctica.' },
      { title: 'Posible duplicación de práctica', category: 'DUPLICADO', description: 'Práctica similar realizada en período cercano.' }
    ],
    ADMINISTRATIVA: [
      { title: 'Prestador sin matrícula vigente', category: 'ADMIN', description: 'El prestador no tiene matrícula activa al momento del acto.' },
      { title: 'Inconsistencia en datos del paciente', category: 'INCONSISTENCIA', description: 'Datos del paciente no coinciden entre sistemas.' }
    ],
    CLINICA: [
      { title: 'Brecha en tratamiento', category: 'CLINICA', description: 'Se detectó discontinuidad en tratamiento crónico.' },
      { title: 'Diagnóstico inconsistente', category: 'INCONSISTENCIA', description: 'El diagnóstico no correlaciona con las prácticas realizadas.' },
      { title: 'Medicación sin indicación', category: 'CLINICA', description: 'Medicación de alto costo sin registro de indicación clínica.' }
    ]
  }

  const templates = FINDING_TEMPLATES[auditType] || FINDING_TEMPLATES.FACTURA
  const severities = ['LOW', 'MEDIUM', 'HIGH']

  for (const consultation of consultations) {
    // Probabilidad de generar hallazgo: mayor si alto riesgo o alto costo
    const prob = consultation.riskLevel === 'alto' ? 0.7 :
                 consultation.riskLevel === 'medio' ? 0.4 : 0.2
    
    if (Math.random() < prob) {
      const template = templates[Math.floor(Math.random() * templates.length)]
      const severity = consultation.riskLevel === 'alto' ? 'HIGH' :
                      consultation.riskLevel === 'medio' ? 
                        (Math.random() > 0.5 ? 'MEDIUM' : 'HIGH') : 
                        severities[Math.floor(Math.random() * severities.length)]

      const finding = await prisma.auditFinding.create({
        data: {
          auditId,
          consultationId: consultation.id,
          severity,
          category: template.category,
          title: template.title,
          description: template.description,
          confidence: 0.6 + Math.random() * 0.35,
          suggestedAction: getSuggestedAction(template.category),
          evidence: JSON.stringify({
            costo: consultation.costo,
            riskLevel: consultation.riskLevel,
            especialidad: consultation.especialidad
          }),
          status: 'OPEN'
        }
      })
      findings.push(finding)
    }
  }

  return findings
}

function getSuggestedAction(category: string): string {
  const actions: Record<string, string> = {
    DUPLICADO: 'Solicitar acreditación al prestador o descontar del pago.',
    INCONSISTENCIA: 'Pedir documentación respaldatoria y revisar con área médica.',
    SOBREPRACTICA: 'Realizar auditoría médica del caso y contactar al prestador.',
    CLINICA: 'Solicitar historia clínica completa y evaluar con comité.',
    ADMIN: 'Verificar documentación y actualizar registros.'
  }
  return actions[category] || 'Revisar y tomar acción según protocolo.'
}
