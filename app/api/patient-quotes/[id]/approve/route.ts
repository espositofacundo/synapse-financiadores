import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

/**
 * POST /api/patient-quotes/[id]/approve
 * Aprueba una cotización (solo APROBADOR o ADMIN)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission('quote:approve')
    
    const body = await request.json()
    const { reason } = body
    
    const quote = await prisma.patientQuote.findUnique({
      where: { id: params.id }
    })
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }
    
    // Solo se puede aprobar si está SUBMITTED
    if (quote.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: `No se puede aprobar una cotización con status ${quote.status}` },
        { status: 400 }
      )
    }
    
    // Actualizar quote
    const updated = await prisma.patientQuote.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedByUserId: user.id
      }
    })
    
    // Crear registro de aprobación
    await prisma.quoteApproval.create({
      data: {
        quoteId: params.id,
        decision: 'APPROVED',
        reason: reason || 'Aprobado',
        decidedByUserId: user.id
      }
    })
    
    // Mover caso de onboarding a APROBADO
    const onboardingCase = await prisma.onboardingCase.findFirst({
      where: { quoteId: params.id }
    })
    
    if (onboardingCase && onboardingCase.status === 'PENDIENTE_APROBACION') {
      const durationSeconds = Math.floor(
        (new Date().getTime() - onboardingCase.currentStatusEnteredAt.getTime()) / 1000
      )
      
      await prisma.onboardingCase.update({
        where: { id: onboardingCase.id },
        data: {
          status: 'APROBADO',
          currentStatusEnteredAt: new Date()
        }
      })
      
      await prisma.onboardingCaseStatusHistory.create({
        data: {
          caseId: onboardingCase.id,
          fromStatus: onboardingCase.status,
          toStatus: 'APROBADO',
          changedByUserId: user.id,
          note: reason || 'Cotización aprobada',
          durationSeconds
        }
      })
    }
    
    return NextResponse.json({ quote: updated })
  } catch (error: any) {
    console.error('Error aprobando cotización:', error)
    return NextResponse.json(
      { error: error.message || 'Error al aprobar cotización' },
      { status: error.message === 'Unauthorized' || error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}
