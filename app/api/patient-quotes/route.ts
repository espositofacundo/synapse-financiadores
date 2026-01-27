import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calcularCotizacion, QuoteInputs } from '@/lib/patient-quote-engine'
import { requirePermission, getCurrentUser } from '@/lib/auth'

/**
 * GET /api/patient-quotes
 * Lista cotizaciones (filtradas por usuario según rol)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePermission('quote:read')
    
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    const where: any = {}
    
    // COTIZADOR solo ve sus propias cotizaciones
    if (user.role === 'COTIZADOR') {
      where.createdByUserId = user.id
    }
    
    // APROBADOR ve todas las SUBMITTED y las que aprobó/rechazó
    if (user.role === 'APROBADOR') {
      where.OR = [
        { status: 'SUBMITTED' },
        { approvedByUserId: user.id }
      ]
    }
    
    // OFICINA ve todas las APPROVED sin patientId
    if (user.role === 'OFICINA') {
      where.AND = [
        { status: 'APPROVED' },
        { patientId: null }
      ]
    }
    
    // ADMIN ve todas
    
    if (status) {
      where.status = status
    }
    
    const quotes = await prisma.patientQuote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        approvedBy: {
          select: { id: true, name: true, email: true }
        },
        patient: {
          select: { id: true, nombre: true, apellido: true }
        }
      }
    })
    
    // Parsear JSON fields y formatear respuesta
    const quotesFormatted = quotes.map(quote => ({
      ...quote,
      inputs: JSON.parse(quote.inputs),
      patientId: quote.patientId
    }))
    
    return NextResponse.json({ quotes: quotesFormatted })
  } catch (error: any) {
    console.error('Error obteniendo cotizaciones:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener cotizaciones' },
      { status: error.message === 'Unauthorized' || error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}

/**
 * POST /api/patient-quotes
 * Calcula una cotización pre-alta para un paciente
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar permiso
    const user = await requirePermission('quote:create')
    
    const body = await request.json()
    
    // Validar inputs requeridos
    if (!body.edad || !body.sexo) {
      return NextResponse.json(
        { error: 'Edad y sexo son requeridos' },
        { status: 400 }
      )
    }
    
    const inputs: QuoteInputs = {
      edad: parseInt(body.edad),
      sexo: body.sexo,
      provincia: body.provincia,
      patologiasCronicas: Array.isArray(body.patologiasCronicas) ? body.patologiasCronicas : [],
      medicamentosCronicos: parseInt(body.medicamentosCronicos || '0'),
      consultasTotales: parseInt(body.consultasTotales || '0'),
      consultasGuardia: parseInt(body.consultasGuardia || '0'),
      internaciones: parseInt(body.internaciones || '0'),
      especialidadesDistintas: parseInt(body.especialidadesDistintas || '0'),
      reconsultasRapidas: body.reconsultasRapidas === true,
      tasaNoEfectivas: parseFloat(body.tasaNoEfectivas || '0')
    }
    
    // Calcular cotización (con planNombre si está disponible)
    const planNombre = body.planNombre
    const result = calcularCotizacion(inputs, planNombre)
    
    // Guardar cotización en BD
    const quote = await prisma.patientQuote.create({
      data: {
        inputs: JSON.stringify(inputs),
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        expectedCost12m: result.expectedCost12m,
        expectedCostP95: result.expectedCostP95,
        priceCategory: result.priceCategory,
        riskFactor: result.riskFactor,
        confidence: result.confidence,
        reasons: JSON.stringify(result.reasons),
        modelVersion: result.modelVersion,
        // Pricing
        suggestedPriceMonthly: result.pricing?.suggestedPriceMonthly || null,
        priceRangeMin: result.pricing?.range.min || null,
        priceRangeMax: result.pricing?.range.max || null,
        pricingBreakdown: result.pricing ? JSON.stringify(result.pricing.breakdown) : null,
        pricingConfig: result.pricingConfig ? JSON.stringify(result.pricingConfig) : null,
        pricingFlags: result.pricing ? JSON.stringify(result.pricing.flags) : null,
        // Workflow
        status: 'DRAFT',
        createdByUserId: user.id
      }
    })
    
    // Crear caso de onboarding automáticamente
    const displayName = `Caso #${quote.id.slice(0, 8)} - ${inputs.sexo === 'M' ? 'Masculino' : inputs.sexo === 'F' ? 'Femenino' : 'Otro'}, ${inputs.edad} años`
    const onboardingCase = await prisma.onboardingCase.create({
      data: {
        displayName,
        financiadorId: user.financiadorId || 'default-financiador',
        quoteId: quote.id,
        status: 'PENDIENTE_COTIZACION',
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        suggestedPriceMonthly: result.pricing?.suggestedPriceMonthly || null,
        createdByUserId: user.id,
        currentStatusEnteredAt: new Date()
      }
    })
    
    // Crear primer registro en status history
    await prisma.onboardingCaseStatusHistory.create({
      data: {
        caseId: onboardingCase.id,
        fromStatus: null,
        toStatus: 'PENDIENTE_COTIZACION',
        changedByUserId: user.id,
        note: 'Caso creado automáticamente al iniciar cotización'
      }
    })
    
    return NextResponse.json({
      quote: {
        id: quote.id,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        expectedCost12m: result.expectedCost12m,
        expectedCostP95: result.expectedCostP95,
        priceCategory: result.priceCategory,
        riskFactor: result.riskFactor,
        confidence: result.confidence,
        reasons: result.reasons,
        modelVersion: result.modelVersion,
        pricing: result.pricing,
        pricingConfig: result.pricingConfig,
        status: quote.status,
        createdAt: quote.createdAt
      }
    })
  } catch (error: any) {
    console.error('Error calculando cotización:', error)
    return NextResponse.json(
      { error: error.message || 'Error al calcular cotización' },
      { status: error.message === 'Unauthorized' || error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}
