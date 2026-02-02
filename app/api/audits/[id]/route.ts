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
        createdBy: { select: { id: true, name: true, email: true } },
        targetConsultation: {
          select: { id: true, displayName: true, especialidad: true, costo: true }
        },
        findings: {
          include: {
            consultation: { select: { id: true, displayName: true } },
            invoice: { select: { id: true, invoiceNumber: true } }
          }
        }
      }
    })
    if (!audit) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    
    // Parse JSON payloads
    const result = {
      ...audit,
      filterPayload: audit.filterPayload ? JSON.parse(audit.filterPayload) : null,
      recommendedPayload: audit.recommendedPayload ? JSON.parse(audit.recommendedPayload) : null
    }
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[audits] GET [id] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
