import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/findings/[id]
 * Detalle de un hallazgo
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

    const finding = await prisma.auditFinding.findUnique({
      where: { id },
      include: {
        audit: {
          select: { id: true, auditType: true, auditScope: true, createdAt: true }
        },
        consultation: true,
        invoice: true,
        resolvedBy: { select: { id: true, name: true, email: true } }
      }
    })

    if (!finding) {
      return NextResponse.json({ error: 'Hallazgo no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      ...finding,
      evidence: finding.evidence ? JSON.parse(finding.evidence) : null
    })
  } catch (error: any) {
    console.error('[findings] GET [id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/findings/[id]
 * Actualiza status de un hallazgo
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let user
  try {
    user = await requirePermission('audit:run')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body as { status?: string }

    if (!status) {
      return NextResponse.json({ error: 'status es requerido' }, { status: 400 })
    }

    const validStatuses = ['OPEN', 'IN_REVIEW', 'RESOLVED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'status debe ser OPEN | IN_REVIEW | RESOLVED' },
        { status: 400 }
      )
    }

    const finding = await prisma.auditFinding.findUnique({ where: { id } })
    if (!finding) {
      return NextResponse.json({ error: 'Hallazgo no encontrado' }, { status: 404 })
    }

    const updateData: any = { status }
    if (status === 'RESOLVED') {
      updateData.resolvedAt = new Date()
      updateData.resolvedByUserId = user.id
    } else {
      updateData.resolvedAt = null
      updateData.resolvedByUserId = null
    }

    const updated = await prisma.auditFinding.update({
      where: { id },
      data: updateData,
      include: {
        audit: { select: { id: true, auditType: true } },
        consultation: { select: { id: true, displayName: true } },
        resolvedBy: { select: { id: true, name: true } }
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('[findings] PATCH [id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
