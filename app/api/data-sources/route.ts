import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/data-sources
 * Lista fuentes de datos (requiere data_sources:read o audit:run).
 */
export async function GET() {
  try {
    await requirePermission('data_sources:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const sources = await prisma.dataSource.findMany({
      orderBy: { uploadedAt: 'desc' },
      include: {
        populationModels: { select: { id: true, modelType: true, entitiesCount: true } }
      }
    })
    return NextResponse.json(sources)
  } catch (error: any) {
    console.error('[data-sources] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/data-sources
 * Crea una fuente (mock upload: sin archivo real, solo metadata).
 */
export async function POST(request: NextRequest) {
  try {
    await requirePermission('audit:run')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, type } = body as { name?: string; type?: string }
    if (!name || !type) {
      return NextResponse.json(
        { error: 'name y type son requeridos' },
        { status: 400 }
      )
    }
    const validTypes = ['FACTURAS', 'HISTORIA_CLINICA', 'PRACTICAS']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'type debe ser FACTURAS | HISTORIA_CLINICA | PRACTICAS' },
        { status: 400 }
      )
    }

    const recordsCount = Math.floor(100 + Math.random() * 900)
    const source = await prisma.dataSource.create({
      data: {
        name: name.trim(),
        type,
        status: 'READY',
        recordsCount,
        processedAt: new Date(),
        metadata: JSON.stringify({ mock: true, uploadedAt: new Date().toISOString() })
      }
    })
    return NextResponse.json(source)
  } catch (error: any) {
    console.error('[data-sources] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
