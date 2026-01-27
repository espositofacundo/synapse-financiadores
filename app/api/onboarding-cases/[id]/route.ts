import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

/**
 * GET /api/onboarding-cases/:id
 * Obtiene un caso de onboarding por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    
    const caseData = await prisma.onboardingCase.findUnique({
      where: { id: params.id },
      include: {
        quote: {
          select: {
            id: true,
            status: true,
            inputs: true,
            riskScore: true,
            riskLevel: true,
            priceCategory: true,
            riskFactor: true,
            suggestedPriceMonthly: true,
            expectedCost12m: true,
            expectedCostP95: true,
            confidence: true,
            reasons: true
          }
        },
        patient: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            telefono: true,
            email: true,
            localidad: true,
            provincia: true,
            nroAfiliado: true,
            planNombre: true,
            notas: true,
            nroDoc: true
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
    
    if (!caseData) {
      return NextResponse.json(
        { error: 'Caso no encontrado' },
        { status: 404 }
      )
    }
    
    // Calcular días en columna actual
    const now = new Date()
    const enteredAt = new Date(caseData.currentStatusEnteredAt)
    const daysInColumn = Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24))
    
    return NextResponse.json({
      case: {
        ...caseData,
        daysInColumn,
        // Sincronizar datos de quote si existen
        riskScore: caseData.riskScore || caseData.quote?.riskScore || null,
        riskLevel: caseData.riskLevel || caseData.quote?.riskLevel || null,
        suggestedPriceMonthly: caseData.suggestedPriceMonthly || caseData.quote?.suggestedPriceMonthly || null
      }
    })
  } catch (error: any) {
    console.error('Error obteniendo caso:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener caso' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
