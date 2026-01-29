import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2/audit-metrics
 * Métricas del dashboard de Auditoría IA
 */
export async function GET() {
  try {
    await requirePermission('audit:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [audits, findings, consultations] = await Promise.all([
      prisma.audit.findMany({
        where: { status: 'COMPLETED' },
        select: {
          id: true,
          auditType: true,
          auditScope: true,
          findingsCountTotal: true,
          findingsCountHigh: true,
          findingsCountMedium: true,
          findingsCountLow: true,
          estimatedSavings: true,
          consultationsAudited: true,
          createdAt: true
        }
      }),
      prisma.auditFinding.findMany({
        select: {
          id: true,
          severity: true,
          category: true,
          status: true
        }
      }),
      prisma.consulta.count()
    ])

    const totalAudits = audits.length
    const totalFindings = findings.length
    const totalConsultations = consultations
    const auditedConsultations = await prisma.consulta.count({
      where: { auditStatus: { not: 'NOT_AUDITED' } }
    })

    // Por severidad
    const bySeverity = {
      LOW: findings.filter(f => f.severity === 'LOW').length,
      MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
      HIGH: findings.filter(f => f.severity === 'HIGH').length
    }

    // Por categoría
    const byCategory = findings.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Por status
    const byStatus = {
      OPEN: findings.filter(f => f.status === 'OPEN').length,
      IN_REVIEW: findings.filter(f => f.status === 'IN_REVIEW').length,
      RESOLVED: findings.filter(f => f.status === 'RESOLVED').length
    }

    // Por scope
    const byScope = audits.reduce((acc, a) => {
      acc[a.auditScope] = (acc[a.auditScope] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Ahorro estimado total
    const estimatedSavings = audits.reduce((sum, a) => sum + a.estimatedSavings, 0)

    // Top auditorías por hallazgos
    const topAuditsByFindings = audits
      .sort((a, b) => b.findingsCountTotal - a.findingsCountTotal)
      .slice(0, 10)
      .map(a => ({
        id: a.id,
        auditType: a.auditType,
        auditScope: a.auditScope,
        createdAt: a.createdAt,
        findingsCount: a.findingsCountTotal,
        highCount: a.findingsCountHigh,
        estimatedSavings: a.estimatedSavings
      }))

    // Cobertura de auditoría
    const auditCoverage = totalConsultations > 0 
      ? Math.round((auditedConsultations / totalConsultations) * 100)
      : 0

    return NextResponse.json({
      totalAudits,
      totalFindings,
      totalConsultations,
      auditedConsultations,
      auditCoverage,
      bySeverity,
      byCategory,
      byStatus,
      byScope,
      estimatedSavings: Math.round(estimatedSavings),
      topAuditsByFindings,
      openHighSeverity: findings.filter(f => f.severity === 'HIGH' && f.status === 'OPEN').length
    })
  } catch (error: any) {
    console.error('[v2/audit-metrics] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
