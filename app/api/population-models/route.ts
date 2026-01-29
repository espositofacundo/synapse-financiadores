import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/population-models
 * Lista modelos de población (opcional: ?sourceId=xxx).
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission('data_sources:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const sourceId = request.nextUrl.searchParams.get('sourceId')
    const models = await prisma.populationModel.findMany({
      where: sourceId ? { sourceId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: { source: { select: { id: true, name: true, type: true } } }
    })
    return NextResponse.json(models)
  } catch (error: any) {
    console.error('[population-models] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/population-models
 * Crea un modelo a partir de una fuente READY (mock: sin procesamiento real).
 */
export async function POST(request: NextRequest) {
  try {
    await requirePermission('audit:run')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { sourceId, modelType } = body as { sourceId?: string; modelType?: string }
    if (!sourceId || !modelType) {
      return NextResponse.json(
        { error: 'sourceId y modelType son requeridos' },
        { status: 400 }
      )
    }
    const validTypes = ['POBLACION', 'FACTURAS']
    if (!validTypes.includes(modelType)) {
      return NextResponse.json(
        { error: 'modelType debe ser POBLACION | FACTURAS' },
        { status: 400 }
      )
    }

    const source = await prisma.dataSource.findUnique({ where: { id: sourceId } })
    if (!source) return NextResponse.json({ error: 'Fuente no encontrada' }, { status: 404 })
    if (source.status !== 'READY') {
      return NextResponse.json(
        { error: 'La fuente debe estar en estado READY' },
        { status: 400 }
      )
    }

    const entitiesCount = source.recordsCount
    const model = await prisma.populationModel.create({
      data: {
        sourceId,
        modelType,
        status: 'READY',
        entitiesCount
      },
      include: { source: { select: { id: true, name: true, type: true } } }
    })
    return NextResponse.json(model)
  } catch (error: any) {
    console.error('[population-models] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
