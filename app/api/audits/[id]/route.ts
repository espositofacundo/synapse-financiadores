import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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
        populationModel: {
          include: { source: { select: { id: true, name: true, type: true } } }
        },
        createdBy: { select: { id: true, name: true, email: true } },
        findings: true
      }
    })
    if (!audit) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(audit)
  } catch (error: any) {
    console.error('[audits] GET [id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
