import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

/**
 * POST /api/patient-quotes/[id]/submit
 * Envía una cotización a aprobación (solo COTIZADOR)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission('quote:submit')
    
    const quote = await prisma.patientQuote.findUnique({
      where: { id: params.id }
    })
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }
    
    // Verificar que el usuario es el creador o es ADMIN
    if (quote.createdByUserId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permiso para enviar esta cotización' },
        { status: 403 }
      )
    }
    
    // Solo se puede enviar si está en DRAFT o REJECTED
    if (quote.status !== 'DRAFT' && quote.status !== 'REJECTED') {
      return NextResponse.json(
        { error: `No se puede enviar una cotización con status ${quote.status}` },
        { status: 400 }
      )
    }
    
    // Actualizar status
    const updated = await prisma.patientQuote.update({
      where: { id: params.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date()
      }
    })
    
    // Mover caso de onboarding a PENDIENTE_APROBACION
    const onboardingCase = await prisma.onboardingCase.findFirst({
      where: { quoteId: params.id }
    })
    
    if (onboardingCase && onboardingCase.status === 'PENDIENTE_COTIZACION') {
      const durationSeconds = Math.floor(
        (new Date().getTime() - onboardingCase.currentStatusEnteredAt.getTime()) / 1000
      )
      
      await prisma.onboardingCase.update({
        where: { id: onboardingCase.id },
        data: {
          status: 'PENDIENTE_APROBACION',
          currentStatusEnteredAt: new Date()
        }
      })
      
      await prisma.onboardingCaseStatusHistory.create({
        data: {
          caseId: onboardingCase.id,
          fromStatus: onboardingCase.status,
          toStatus: 'PENDIENTE_APROBACION',
          changedByUserId: user.id,
          note: 'Cotización enviada a aprobación',
          durationSeconds
        }
      })
    }
    
    return NextResponse.json({ quote: updated })
  } catch (error: any) {
    console.error('Error enviando cotización:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar cotización' },
      { status: error.message === 'Unauthorized' || error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}
