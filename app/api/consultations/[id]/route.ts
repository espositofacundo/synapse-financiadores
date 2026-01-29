import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/consultations/[id]
 * Detalle de consulta con facturas, auditorías y hallazgos
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

    const consultation = await prisma.consulta.findUnique({
      where: { id },
      include: {
        prestador: true,
        patient: { select: { id: true, nombre: true, apellido: true, nroDoc: true } },
        afiliado: { select: { id: true, nombre: true, apellido: true, dni: true } },
        importBatch: { select: { id: true, name: true, type: true } },
        invoices: {
          include: {
            invoice: true
          }
        },
        auditFindings: {
          include: {
            audit: { select: { id: true, auditType: true, createdAt: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        targetedAudits: {
          include: {
            createdBy: { select: { id: true, name: true } },
            _count: { select: { findings: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!consultation) {
      return NextResponse.json({ error: 'Consulta no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      consultation: {
        ...consultation,
        invoices: consultation.invoices.map(ci => ci.invoice),
        invoicesCount: consultation.invoices.length,
        findingsCount: consultation.auditFindings.length,
        auditsCount: consultation.targetedAudits.length
      }
    })
  } catch (error: any) {
    console.error('[consultations] GET [id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
