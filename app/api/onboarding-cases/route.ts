import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCurrentUser } from '@/lib/auth'
import type { OnboardingStatus } from '@/lib/onboarding-workflow'

/**
 * GET /api/onboarding-cases
 * Lista todos los casos de onboarding
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const financiadorId = searchParams.get('financiadorId')
    
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (financiadorId) {
      where.financiadorId = financiadorId
    } else if (user.financiadorId) {
      where.financiadorId = user.financiadorId
    }
    
    const cases = await prisma.onboardingCase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
            apellido: true,
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
    
    // Calcular días en columna actual
    const now = new Date()
    const casesWithAging = cases.map(c => {
      const enteredAt = new Date(c.currentStatusEnteredAt)
      const daysInColumn = Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...c,
        daysInColumn,
        // Sincronizar datos de quote si existen
        riskScore: c.riskScore || c.quote?.riskScore || null,
        riskLevel: c.riskLevel || c.quote?.riskLevel || null,
        suggestedPriceMonthly: c.suggestedPriceMonthly || c.quote?.suggestedPriceMonthly || null
      }
    })
    
    return NextResponse.json({ cases: casesWithAging })
  } catch (error: any) {
    console.error('Error obteniendo casos:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener casos' },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}

/**
 * POST /api/onboarding-cases
 * Crea un nuevo caso de onboarding
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Validar permisos: solo COTIZADOR y ADMIN pueden crear casos
    if (user.role !== 'COTIZADOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permiso para crear casos' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    // Generar shortId para displayName si no se proporciona
    const shortId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const displayName = body.displayName || `Caso #${shortId}`
    
    // Crear quote en DRAFT primero (si no se proporciona quoteId)
    let quoteId = body.quoteId || null
    let newQuote = null
    
    if (!quoteId) {
      newQuote = await prisma.patientQuote.create({
        data: {
          inputs: JSON.stringify({}),
          riskScore: 0,
          riskLevel: 'bajo',
          expectedCost12m: 0,
          expectedCostP95: 0,
          priceCategory: 'BAJO RIESGO',
          riskFactor: 1.0,
          confidence: 'Baja',
          reasons: JSON.stringify([]),
          modelVersion: '1.0',
          status: 'DRAFT',
          createdByUserId: user.id
        }
      })
      quoteId = newQuote.id
    }
    
    // Crear caso vinculado a la quote
    const newCase = await prisma.onboardingCase.create({
      data: {
        displayName,
        financiadorId: body.financiadorId || user.financiadorId || 'default-financiador',
        quoteId,
        patientId: body.patientId || null,
        status: 'PENDIENTE_COTIZACION',
        riskScore: null,
        riskLevel: null,
        suggestedPriceMonthly: null,
        assignedToUserId: body.assignedToUserId || null,
        createdByUserId: user.id,
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    // Crear primer registro en status history
    await prisma.onboardingCaseStatusHistory.create({
      data: {
        caseId: newCase.id,
        fromStatus: null,
        toStatus: 'PENDIENTE_COTIZACION',
        changedByUserId: user.id,
        note: 'Caso creado'
      }
    })
    
    return NextResponse.json({ 
      case: newCase,
      caseId: newCase.id,
      quote: newCase.quote || (newQuote ? {
        id: newQuote.id,
        status: newQuote.status
      } : null),
      quoteId: quoteId
    })
  } catch (error: any) {
    console.error('Error creando caso:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear caso' },
      { status: 500 }
    )
  }
}
