import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { isValidTransition, type OnboardingStatus } from '@/lib/onboarding-workflow'

/**
 * PATCH /api/onboarding-cases/[id]/move
 * Mueve un caso a otro estado (columna del Kanban)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { toStatus, note } = body
    
    if (!toStatus) {
      return NextResponse.json(
        { error: 'toStatus es requerido' },
        { status: 400 }
      )
    }
    
    // Obtener caso actual
    const currentCase = await prisma.onboardingCase.findUnique({
      where: { id: params.id },
      include: {
        quote: {
          select: {
            id: true,
            status: true
          }
        }
      }
    })
    
    if (!currentCase) {
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      )
    }
    
    // Validar transición
    const validation = isValidTransition(
      currentCase.status as OnboardingStatus,
      toStatus as OnboardingStatus,
      user.role as any,
      currentCase.quote?.status || null,
      !!currentCase.patientId
    )
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason || 'Transición no permitida' },
        { status: 400 }
      )
    }
    
    // Calcular duración en estado anterior (desde que entró al estado actual)
    const durationSeconds = Math.floor(
      (new Date().getTime() - currentCase.currentStatusEnteredAt.getTime()) / 1000
    )
    
    // Actualizar caso
    const updatedCase = await prisma.onboardingCase.update({
      where: { id: params.id },
      data: {
        status: toStatus,
        currentStatusEnteredAt: new Date()
      },
      include: {
        quote: {
          select: {
            id: true,
            status: true,
            riskScore: true,
            riskLevel: true,
            suggestedPriceMonthly: true
          }
        },
        patient: {
          select: {
            id: true,
            nombre: true,
            apellido: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    // Crear registro en history
    await prisma.onboardingCaseStatusHistory.create({
      data: {
        caseId: params.id,
        fromStatus: currentCase.status,
        toStatus: toStatus,
        changedByUserId: user.id,
        note: note || null,
        durationSeconds
      }
    })
    
    // Calcular días en columna
    const now = new Date()
    const enteredAt = new Date(updatedCase.currentStatusEnteredAt)
    const daysInColumn = Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24))
    
    return NextResponse.json({
      case: {
        ...updatedCase,
        daysInColumn,
        riskScore: updatedCase.quote?.riskScore || null,
        riskLevel: updatedCase.quote?.riskLevel || null,
        suggestedPriceMonthly: updatedCase.quote?.suggestedPriceMonthly || null
      }
    })
  } catch (error: any) {
    console.error('Error moviendo caso:', error)
    return NextResponse.json(
      { error: error.message || 'Error al mover caso' },
      { status: 500 }
    )
  }
}
