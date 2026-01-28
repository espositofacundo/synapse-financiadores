import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission, getCurrentUser } from '@/lib/auth'
import type { QuoteInputs } from '@/lib/patient-quote-engine'

/**
 * GET /api/patient-quotes/[id]
 * Obtiene una cotización por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quote = await prisma.patientQuote.findUnique({
      where: { id: params.id },
      include: {
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
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }
    
    // Verificar permisos: solo el creador, aprobador o ADMIN pueden ver
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (user.role !== 'ADMIN' && quote.createdByUserId !== user.id && quote.approvedByUserId !== user.id) {
      // APROBADOR puede ver SUBMITTED
      if (user.role === 'APROBADOR' && quote.status === 'SUBMITTED') {
        // OK
      } else if (user.role === 'OFICINA' && quote.status === 'APPROVED' && !quote.patientId) {
        // OFICINA puede ver APPROVED sin patientId
        // OK
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    // Parsear JSON fields
    const inputs = JSON.parse(quote.inputs)
    const reasons = JSON.parse(quote.reasons)
    const pricingBreakdown = quote.pricingBreakdown ? JSON.parse(quote.pricingBreakdown) : null
    const pricingConfig = quote.pricingConfig ? JSON.parse(quote.pricingConfig) : null
    const pricingFlags = quote.pricingFlags ? JSON.parse(quote.pricingFlags) : null
    
    return NextResponse.json({
      quote: {
        id: quote.id,
        inputs,
        riskScore: quote.riskScore,
        riskLevel: quote.riskLevel,
        expectedCost12m: quote.expectedCost12m,
        expectedCostP95: quote.expectedCostP95,
        priceCategory: quote.priceCategory,
        riskFactor: quote.riskFactor,
        confidence: quote.confidence,
        reasons,
        modelVersion: quote.modelVersion,
        // Pricing
        pricing: quote.suggestedPriceMonthly ? {
          suggestedPriceMonthly: quote.suggestedPriceMonthly,
          range: {
            min: quote.priceRangeMin,
            max: quote.priceRangeMax
          },
          breakdown: pricingBreakdown,
          flags: pricingFlags
        } : null,
        pricingConfig,
        // Workflow
        status: quote.status,
        submittedAt: quote.submittedAt,
        approvedAt: quote.approvedAt,
        rejectedAt: quote.rejectedAt,
        rejectionReason: quote.rejectionReason,
        createdBy: quote.createdBy ? {
          id: quote.createdBy.id,
          name: quote.createdBy.name,
          email: quote.createdBy.email
        } : null,
        approvedBy: quote.approvedBy ? {
          id: quote.approvedBy.id,
          name: quote.approvedBy.name,
          email: quote.approvedBy.email
        } : null,
        patientId: quote.patientId,
        patient: quote.patient,
        createdAt: quote.createdAt
      }
    })
  } catch (error: any) {
    console.error('Error obteniendo cotización:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener cotización' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/patient-quotes/[id]
 * Actualiza una cotización (solo COTIZADOR, solo DRAFT/REJECTED)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission('quote:update')
    
    // Solo COTIZADOR puede editar
    if (user.role !== 'COTIZADOR' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo los cotizadores pueden editar cotizaciones' },
        { status: 403 }
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
    
    // Verificar que el usuario es el creador o es ADMIN
    if (quote.createdByUserId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No tienes permiso para editar esta cotización' },
        { status: 403 }
      )
    }
    
    // Solo se puede editar si está en DRAFT o REJECTED
    if (quote.status !== 'DRAFT' && quote.status !== 'REJECTED') {
      return NextResponse.json(
        { error: `No se puede editar una cotización con status ${quote.status}. Solo se pueden editar cotizaciones en DRAFT o REJECTED.` },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { calcularCotizacion } = await import('@/lib/patient-quote-engine')
    
    // Validar inputs requeridos
    if (!body.edad || !body.sexo) {
      return NextResponse.json(
        { error: 'Edad y sexo son requeridos' },
        { status: 400 }
      )
    }
    
    const inputs: QuoteInputs = {
      edad: parseInt(body.edad),
      sexo: (body.sexo === 'M' || body.sexo === 'F' || body.sexo === 'Otro') ? body.sexo : 'M',
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
    
    // Calcular cotización
    const planNombre = body.planNombre
    const result = calcularCotizacion(inputs, planNombre)
    
    // Si estaba REJECTED, volver a DRAFT
    const newStatus = quote.status === 'REJECTED' ? 'DRAFT' : quote.status
    
    // Actualizar cotización
    const updated = await prisma.patientQuote.update({
      where: { id: params.id },
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
        // Pricing
        suggestedPriceMonthly: result.pricing?.suggestedPriceMonthly || null,
        priceRangeMin: result.pricing?.range.min || null,
        priceRangeMax: result.pricing?.range.max || null,
        pricingBreakdown: result.pricing ? JSON.stringify(result.pricing.breakdown) : null,
        pricingConfig: result.pricingConfig ? JSON.stringify(result.pricingConfig) : null,
        pricingFlags: result.pricing ? JSON.stringify(result.pricing.flags) : null,
        // Workflow
        status: newStatus,
        rejectionReason: newStatus === 'DRAFT' ? null : quote.rejectionReason
      }
    })
    
    return NextResponse.json({
      quote: {
        id: updated.id,
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
        status: updated.status,
        createdAt: updated.createdAt
      }
    })
  } catch (error: any) {
    console.error('Error actualizando cotización:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar cotización' },
      { status: error.message === 'Unauthorized' || error.message?.includes('Forbidden') ? 403 : 500 }
    )
  }
}
