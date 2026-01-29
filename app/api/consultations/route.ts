import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/consultations
 * Lista consultas/prácticas con filtros
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission('audit:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = request.nextUrl
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const especialidad = searchParams.get('especialidad')
    const canal = searchParams.get('canal')
    const riskLevel = searchParams.get('riskLevel')
    const importBatchId = searchParams.get('importBatchId')
    const auditStatus = searchParams.get('auditStatus')
    const hasInvoices = searchParams.get('hasInvoices')
    const hasFindings = searchParams.get('hasFindings')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}

    if (from || to) {
      where.fecha = {}
      if (from) where.fecha.gte = new Date(from)
      if (to) where.fecha.lte = new Date(to)
    }
    if (especialidad && especialidad !== 'all') where.especialidad = especialidad
    if (canal && canal !== 'all') where.canal = canal
    if (riskLevel && riskLevel !== 'all') where.riskLevel = riskLevel
    if (importBatchId) where.importBatchId = importBatchId
    if (auditStatus && auditStatus !== 'all') where.auditStatus = auditStatus
    if (hasFindings === 'true') where.auditStatus = 'HAS_FINDINGS'

    const [consultations, total] = await Promise.all([
      prisma.consulta.findMany({
        where,
        include: {
          prestador: { select: { id: true, nombre: true } },
          invoices: {
            include: { invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } } }
          },
          _count: { select: { auditFindings: true, targetedAudits: true } }
        },
        orderBy: { fecha: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.consulta.count({ where })
    ])

    // Filtrar por hasInvoices si se especificó
    let filtered = consultations
    if (hasInvoices === 'true') {
      filtered = consultations.filter(c => c.invoices.length > 0)
    } else if (hasInvoices === 'false') {
      filtered = consultations.filter(c => c.invoices.length === 0)
    }

    return NextResponse.json({
      consultations: filtered.map(c => ({
        ...c,
        invoicesCount: c.invoices.length,
        findingsCount: c._count.auditFindings,
        auditsCount: c._count.targetedAudits
      })),
      total,
      limit,
      offset
    })
  } catch (error: any) {
    console.error('[consultations] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
