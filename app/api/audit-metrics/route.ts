import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/audit-metrics
 * Métricas para el dashboard de Auditoría IA (totales, por severidad, por categoría, ahorro mock).
 */
export async function GET() {
  try {
    await requirePermission('audit:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [audits, findings] = await Promise.all([
      prisma.audit.findMany({
        where: { status: 'COMPLETED' },
        include: { findings: true }
      }),
      prisma.auditFinding.findMany()
    ])

    const totalAudits = audits.length
    const totalFindings = findings.length

    const bySeverity = {
      LOW: findings.filter(f => f.severity === 'LOW').length,
      MEDIUM: findings.filter(f => f.severity === 'MEDIUM').length,
      HIGH: findings.filter(f => f.severity === 'HIGH').length
    }

    const byCategory = findings.reduce((acc, f) => {
      acc[f.category] = (acc[f.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    let estimatedSavings = 0
    for (const a of audits) {
      for (const f of a.findings) {
        const base = f.severity === 'HIGH' ? 15000 : f.severity === 'MEDIUM' ? 5000 : 1500
        estimatedSavings += base * f.confidence
      }
    }
    estimatedSavings = Math.round(estimatedSavings)

    const topAuditsByFindings = audits
      .map(a => ({
        id: a.id,
        auditType: a.auditType,
        createdAt: a.createdAt,
        findingsCount: a.findings.length,
        highCount: a.findings.filter(f => f.severity === 'HIGH').length
      }))
      .sort((a, b) => b.findingsCount - a.findingsCount)
      .slice(0, 10)

    return NextResponse.json({
      totalAudits,
      totalFindings,
      bySeverity,
      byCategory,
      estimatedSavings,
      topAuditsByFindings
    })
  } catch (error: any) {
    console.error('[audit-metrics] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
