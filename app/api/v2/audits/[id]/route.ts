import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2/audits/[id]
 * Detalle de auditoría con hallazgos
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('audit:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params

    const audit = await prisma.audit.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        targetConsultation: {
          select: { id: true, displayName: true, especialidad: true, costo: true, riskLevel: true }
        },
        findings: {
          include: {
            consultation: { select: { id: true, displayName: true, especialidad: true } },
            invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } }
          },
          orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }]
        }
      }
    })

    if (!audit) {
      return NextResponse.json({ error: 'Auditoría no encontrada' }, { status: 404 })
    }

    // Parse JSON fields
    const response = {
      ...audit,
      filterPayload: audit.filterPayload ? JSON.parse(audit.filterPayload) : null,
      recommendedPayload: audit.recommendedPayload ? JSON.parse(audit.recommendedPayload) : null,
      maxSeverity: audit.findingsCountHigh > 0 ? 'HIGH' : 
                   audit.findingsCountMedium > 0 ? 'MEDIUM' : 'LOW',
      findingsByCategory: audit.findings.reduce((acc, f) => {
        acc[f.category] = (acc[f.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('[v2/audits] GET [id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
