import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/audits
 * Lista auditorías (requiere audit:read).
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission('audit:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const audits = await prisma.audit.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        populationModel: {
          include: { source: { select: { id: true, name: true, type: true } } }
        },
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { findings: true } }
      }
    })
    return NextResponse.json(audits)
  } catch (error: any) {
    console.error('[audits] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/audits
 * Crea una auditoría (PENDING). Luego se ejecuta con POST /api/audits/[id]/run.
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
    const { populationModelId, auditType } = body as { populationModelId?: string; auditType?: string }
    if (!populationModelId || !auditType) {
      return NextResponse.json(
        { error: 'populationModelId y auditType son requeridos' },
        { status: 400 }
      )
    }
    const validTypes = ['FACTURA', 'PRACTICA', 'ADMINISTRATIVA', 'CLINICA']
    if (!validTypes.includes(auditType)) {
      return NextResponse.json(
        { error: 'auditType debe ser FACTURA | PRACTICA | ADMINISTRATIVA | CLINICA' },
        { status: 400 }
      )
    }

    const model = await prisma.populationModel.findUnique({
      where: { id: populationModelId },
      include: { source: true }
    })
    if (!model) return NextResponse.json({ error: 'Modelo no encontrado' }, { status: 404 })

    const audit = await prisma.audit.create({
      data: {
        populationModelId,
        auditType,
        status: 'PENDING',
        createdByUserId: user.id
      },
      include: {
        populationModel: {
          include: { source: { select: { id: true, name: true, type: true } } }
        },
        createdBy: { select: { id: true, name: true, email: true } }
      }
    })
    return NextResponse.json(audit)
  } catch (error: any) {
    console.error('[audits] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
