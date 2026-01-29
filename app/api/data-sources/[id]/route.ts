import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission('data_sources:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const source = await prisma.dataSource.findUnique({
      where: { id },
      include: { populationModels: true }
    })
    if (!source) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(source)
  } catch (error: any) {
    console.error('[data-sources] GET [id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
