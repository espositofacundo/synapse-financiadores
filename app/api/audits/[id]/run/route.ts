import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { runMockAudit, estimateSavings } from '@/lib/audit-ia'

export const dynamic = 'force-dynamic'

/**
 * POST /api/audits/[id]/run
 * Ejecuta la auditoría (simula IA) y crea hallazgos.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('audit:run')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const audit = await prisma.audit.findUnique({
      where: { id },
      include: { populationModel: true }
    })
    if (!audit) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    if (audit.status === 'RUNNING') {
      return NextResponse.json({ error: 'La auditoría ya está en ejecución' }, { status: 400 })
    }
    if (audit.status === 'COMPLETED') {
      return NextResponse.json({ error: 'La auditoría ya fue completada' }, { status: 400 })
    }

    await prisma.audit.update({
      where: { id },
      data: { status: 'RUNNING' }
    })

    const mockFindings = runMockAudit(
      audit.auditType as 'FACTURA' | 'PRACTICA' | 'ADMINISTRATIVA' | 'CLINICA',
      audit.populationModelId,
      audit.populationModel.entitiesCount
    )

    for (const f of mockFindings) {
      await prisma.auditFinding.create({
        data: {
          auditId: id,
          severity: f.severity,
          category: f.category,
          description: f.description,
          confidence: f.confidence,
          suggestedAction: f.suggestedAction
        }
      })
    }

    const completedAt = new Date()
    await prisma.audit.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt }
    })

    const auditWithFindings = await prisma.audit.findUnique({
      where: { id },
      include: {
        populationModel: { include: { source: { select: { id: true, name: true, type: true } } } },
        createdBy: { select: { id: true, name: true, email: true } },
        findings: true
      }
    })

    const savings = estimateSavings(mockFindings)

    return NextResponse.json({
      audit: auditWithFindings,
      estimatedSavings: savings
    })
  } catch (error: any) {
    console.error('[audits] run error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
