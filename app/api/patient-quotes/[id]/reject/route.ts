import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

/**
 * POST /api/patient-quotes/[id]/reject
 * Rechaza una cotización (solo APROBADOR o ADMIN)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission('quote:reject')
    
    const body = await request.json()
    const { reason } = body
    
    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'El motivo de rechazo es requerido' },
        { status: 400 }
      )
    }
    
    const quote = await prisma.patientQuote.findUnique({
      where: { id: params.id }
    })
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }
    
    // Solo se puede rechazar si está SUBMITTED
    if (quote.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: `No se puede rechazar una cotización con status ${quote.status}` },
        { status: 400 }
      )
    }
    
    // Actualizar quote
    const updated = await prisma.patientQuote.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason,
        approvedByUserId: user.id
      }
    })
    
    // Crear registro de rechazo
    await prisma.quoteApproval.create({
      data: {
        quoteId: params.id,
        decision: 'REJECTED',
        reason,
        decidedByUserId: user.id
      }
    })
    
    // Mover caso de onboarding a RECHAZADO
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
          status: 'RECHAZADO',
          currentStatusEnteredAt: new Date()
        }
      })
      
      await prisma.onboardingCaseStatusHistory.create({
        data: {
          caseId: onboardingCase.id,
          fromStatus: onboardingCase.status,
          toStatus: 'RECHAZADO',
          changedByUserId: user.id,
          note: reason,
          durationSeconds
        }
      })
    }
    
    return NextResponse.json({ quote: updated })
  } catch (error: any) {
    console.error('Error rechazando cotización:', error)
    return NextResponse.json(
      { error: error.message || 'Error al rechazar cotización' },
      { status: error.message === 'Unauthorized' || error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}
