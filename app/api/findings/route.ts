import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/findings
 * Lista hallazgos con filtros
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission('audit:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = request.nextUrl
    const severity = searchParams.get('severity')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const auditId = searchParams.get('auditId')
    const consultationId = searchParams.get('consultationId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (severity && severity !== 'all') where.severity = severity
    if (category && category !== 'all') where.category = category
    if (status && status !== 'all') where.status = status
    if (auditId) where.auditId = auditId
    if (consultationId) where.consultationId = consultationId

    const [findings, total] = await Promise.all([
      prisma.auditFinding.findMany({
        where,
        include: {
          audit: { select: { id: true, auditType: true, createdAt: true } },
          consultation: { select: { id: true, displayName: true, especialidad: true } },
          invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
          resolvedBy: { select: { id: true, name: true } }
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset
      }),
      prisma.auditFinding.count({ where })
    ])

    return NextResponse.json({
      findings,
      total,
      limit,
      offset
    })
  } catch (error: any) {
    console.error('[findings] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
