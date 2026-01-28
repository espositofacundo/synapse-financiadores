import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import type { OnboardingStatus } from '@/lib/onboarding-workflow'
import type { QuoteInputs } from '@/lib/patient-quote-engine'

/**
 * PATCH /api/onboarding-cases/:id/edit
 * Edita un caso de onboarding según reglas por rol y estado
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    // Obtener caso actual
    const currentCase = await prisma.onboardingCase.findUnique({
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
            suggestedPriceMonthly: true
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
            notas: true
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
    
    const currentStatus = currentCase.status as OnboardingStatus
    
    // Validar permisos de edición según rol y estado
    const canEdit = validateEditPermission(user.role, currentStatus)
    if (!canEdit.allowed) {
      return NextResponse.json(
        { error: canEdit.reason || 'No tienes permisos para editar este caso en su estado actual' },
        { status: 403 }
      )
    }
    
    // Preparar datos de auditoría
    const editedFields: Record<string, { old: any; new: any }> = {}
    let newStatus: OnboardingStatus | null = null
    let quoteStatus: string | null = null
    let updatedQuoteData: { riskScore?: number; riskLevel?: string; suggestedPriceMonthly?: number | null } | null = null
    
    // Aplicar reglas según rol
    if (user.role === 'COTIZADOR' || user.role === 'ADMIN') {
      // COTIZADOR: puede editar cotización en diferentes estados
      if (currentStatus === 'PENDIENTE_COTIZACION') {
        // Editar sin cambiar estado (caso guardado pero no enviado)
        newStatus = 'PENDIENTE_COTIZACION' // Mantener estado
        quoteStatus = 'DRAFT'
        
        // Actualizar quote si se proporcionan nuevos inputs
        if (body.quoteInputs && currentCase.quote) {
          const { calcularCotizacion } = await import('@/lib/patient-quote-engine')
          
          const inputs: QuoteInputs = {
            edad: parseInt(body.quoteInputs.edad),
            sexo: body.quoteInputs.sexo,
            provincia: body.quoteInputs.provincia,
            patologiasCronicas: Array.isArray(body.quoteInputs.patologiasCronicas) ? body.quoteInputs.patologiasCronicas : [],
            medicamentosCronicos: parseInt(body.quoteInputs.medicamentosCronicos || '0'),
            consultasTotales: parseInt(body.quoteInputs.consultasTotales || '0'),
            consultasGuardia: parseInt(body.quoteInputs.consultasGuardia || '0'),
            internaciones: parseInt(body.quoteInputs.internaciones || '0'),
            especialidadesDistintas: parseInt(body.quoteInputs.especialidadesDistintas || '0'),
            reconsultasRapidas: body.quoteInputs.reconsultasRapidas === true,
            tasaNoEfectivas: parseFloat(body.quoteInputs.tasaNoEfectivas || '0')
          }
          
          const result = calcularCotizacion(inputs, body.quoteInputs.planNombre)
          
          const oldInputs = JSON.parse(currentCase.quote.inputs || '{}')
          editedFields['quote.inputs'] = { old: oldInputs, new: inputs }
          editedFields['quote.riskScore'] = { old: currentCase.quote.riskScore, new: result.riskScore }
          editedFields['quote.riskLevel'] = { old: currentCase.quote.riskLevel, new: result.riskLevel }
          editedFields['quote.suggestedPriceMonthly'] = { 
            old: currentCase.quote.suggestedPriceMonthly, 
            new: result.pricing?.suggestedPriceMonthly || null 
          }
          
          // Guardar datos actualizados para sincronizar con el caso
          updatedQuoteData = {
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            suggestedPriceMonthly: result.pricing?.suggestedPriceMonthly || null
          }
          
          await prisma.patientQuote.update({
            where: { id: currentCase.quote.id },
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
              suggestedPriceMonthly: result.pricing?.suggestedPriceMonthly || null,
              priceRangeMin: result.pricing?.range.min || null,
              priceRangeMax: result.pricing?.range.max || null,
              pricingBreakdown: result.pricing ? JSON.stringify(result.pricing.breakdown) : null,
              pricingConfig: result.pricingConfig ? JSON.stringify(result.pricingConfig) : null,
              pricingFlags: result.pricing ? JSON.stringify(result.pricing.flags) : null,
              status: 'DRAFT',
              rejectionReason: null
            }
          })
        }
      } else if (currentStatus === 'PENDIENTE_APROBACION') {
        // Revertir a PENDIENTE_COTIZACION
        newStatus = 'PENDIENTE_COTIZACION'
        quoteStatus = 'DRAFT'
        
        // Actualizar quote si se proporcionan nuevos inputs
        if (body.quoteInputs && currentCase.quote) {
          const { calcularCotizacion } = await import('@/lib/patient-quote-engine')
          
          const inputs: QuoteInputs = {
            edad: parseInt(body.quoteInputs.edad),
            sexo: body.quoteInputs.sexo,
            provincia: body.quoteInputs.provincia,
            patologiasCronicas: Array.isArray(body.quoteInputs.patologiasCronicas) ? body.quoteInputs.patologiasCronicas : [],
            medicamentosCronicos: parseInt(body.quoteInputs.medicamentosCronicos || '0'),
            consultasTotales: parseInt(body.quoteInputs.consultasTotales || '0'),
            consultasGuardia: parseInt(body.quoteInputs.consultasGuardia || '0'),
            internaciones: parseInt(body.quoteInputs.internaciones || '0'),
            especialidadesDistintas: parseInt(body.quoteInputs.especialidadesDistintas || '0'),
            reconsultasRapidas: body.quoteInputs.reconsultasRapidas === true,
            tasaNoEfectivas: parseFloat(body.quoteInputs.tasaNoEfectivas || '0')
          }
          
          const result = calcularCotizacion(inputs, body.quoteInputs.planNombre)
          
          const oldInputs = JSON.parse(currentCase.quote.inputs || '{}')
          editedFields['quote.inputs'] = { old: oldInputs, new: inputs }
          editedFields['quote.riskScore'] = { old: currentCase.quote.riskScore, new: result.riskScore }
          editedFields['quote.riskLevel'] = { old: currentCase.quote.riskLevel, new: result.riskLevel }
          editedFields['quote.suggestedPriceMonthly'] = { 
            old: currentCase.quote.suggestedPriceMonthly, 
            new: result.pricing?.suggestedPriceMonthly || null 
          }
          
          // Guardar datos actualizados para sincronizar con el caso
          updatedQuoteData = {
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            suggestedPriceMonthly: result.pricing?.suggestedPriceMonthly || null
          }
          
          await prisma.patientQuote.update({
            where: { id: currentCase.quote.id },
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
              suggestedPriceMonthly: result.pricing?.suggestedPriceMonthly || null,
              priceRangeMin: result.pricing?.range.min || null,
              priceRangeMax: result.pricing?.range.max || null,
              pricingBreakdown: result.pricing ? JSON.stringify(result.pricing.breakdown) : null,
              pricingConfig: result.pricingConfig ? JSON.stringify(result.pricingConfig) : null,
              pricingFlags: result.pricing ? JSON.stringify(result.pricing.flags) : null,
              status: 'DRAFT',
              rejectionReason: null
            }
          })
        }
      } else if (currentStatus === 'RECHAZADO') {
        // Mantener en PENDIENTE_COTIZACION pero actualizar quote
        newStatus = 'PENDIENTE_COTIZACION'
        quoteStatus = 'DRAFT'
        
        if (body.quoteInputs && currentCase.quote) {
          const { calcularCotizacion } = await import('@/lib/patient-quote-engine')
          
          const inputs: QuoteInputs = {
            edad: parseInt(body.quoteInputs.edad),
            sexo: body.quoteInputs.sexo,
            provincia: body.quoteInputs.provincia,
            patologiasCronicas: Array.isArray(body.quoteInputs.patologiasCronicas) ? body.quoteInputs.patologiasCronicas : [],
            medicamentosCronicos: parseInt(body.quoteInputs.medicamentosCronicos || '0'),
            consultasTotales: parseInt(body.quoteInputs.consultasTotales || '0'),
            consultasGuardia: parseInt(body.quoteInputs.consultasGuardia || '0'),
            internaciones: parseInt(body.quoteInputs.internaciones || '0'),
            especialidadesDistintas: parseInt(body.quoteInputs.especialidadesDistintas || '0'),
            reconsultasRapidas: body.quoteInputs.reconsultasRapidas === true,
            tasaNoEfectivas: parseFloat(body.quoteInputs.tasaNoEfectivas || '0')
          }
          
          const result = calcularCotizacion(inputs, body.quoteInputs.planNombre)
          
          const oldInputs = JSON.parse(currentCase.quote.inputs || '{}')
          editedFields['quote.inputs'] = { old: oldInputs, new: inputs }
          editedFields['quote.riskScore'] = { old: currentCase.quote.riskScore, new: result.riskScore }
          editedFields['quote.riskLevel'] = { old: currentCase.quote.riskLevel, new: result.riskLevel }
          
          // Guardar datos actualizados para sincronizar con el caso
          updatedQuoteData = {
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            suggestedPriceMonthly: result.pricing?.suggestedPriceMonthly || null
          }
          
          await prisma.patientQuote.update({
            where: { id: currentCase.quote.id },
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
              suggestedPriceMonthly: result.pricing?.suggestedPriceMonthly || null,
              priceRangeMin: result.pricing?.range.min || null,
              priceRangeMax: result.pricing?.range.max || null,
              pricingBreakdown: result.pricing ? JSON.stringify(result.pricing.breakdown) : null,
              pricingConfig: result.pricingConfig ? JSON.stringify(result.pricingConfig) : null,
              pricingFlags: result.pricing ? JSON.stringify(result.pricing.flags) : null,
              status: 'DRAFT',
              rejectionReason: null
            }
          })
        }
      }
    }
    
    if (user.role === 'APROBADOR' || user.role === 'ADMIN') {
      // APROBADOR: puede ajustar aprobación (mantener estado)
      if (currentStatus === 'APROBADO') {
        if (!body.reason) {
          return NextResponse.json(
            { error: 'El motivo del ajuste es obligatorio' },
            { status: 400 }
          )
        }
        
        newStatus = 'APROBADO' // Mantener estado
        
        if (body.quoteAdjustments && currentCase.quote) {
          const updates: any = {}
          
          if (body.quoteAdjustments.priceCategory !== undefined) {
            editedFields['quote.priceCategory'] = { 
              old: currentCase.quote.priceCategory, 
              new: body.quoteAdjustments.priceCategory 
            }
            updates.priceCategory = body.quoteAdjustments.priceCategory
          }
          
          if (body.quoteAdjustments.riskFactor !== undefined) {
            editedFields['quote.riskFactor'] = { 
              old: currentCase.quote.riskFactor, 
              new: body.quoteAdjustments.riskFactor 
            }
            updates.riskFactor = parseFloat(body.quoteAdjustments.riskFactor)
          }
          
          if (body.quoteAdjustments.suggestedPriceMonthly !== undefined) {
            const newPrice = parseFloat(body.quoteAdjustments.suggestedPriceMonthly)
            editedFields['quote.suggestedPriceMonthly'] = { 
              old: currentCase.quote.suggestedPriceMonthly, 
              new: newPrice 
            }
            updates.suggestedPriceMonthly = newPrice
            // Sincronizar con el caso
            if (!updatedQuoteData) updatedQuoteData = {}
            updatedQuoteData.suggestedPriceMonthly = newPrice
          }
          
          if (Object.keys(updates).length > 0) {
            await prisma.patientQuote.update({
              where: { id: currentCase.quote.id },
              data: updates
            })
          }
        }
      }
    }
    
    if (user.role === 'OFICINA' || user.role === 'ADMIN') {
      // OFICINA: puede editar datos administrativos del paciente
      if (currentStatus === 'APROBADO' || currentStatus === 'PERFIL_COMPLETO') {
        newStatus = currentStatus // Mantener estado
        
        if (body.patientData && currentCase.patient) {
          const updates: any = {}
          
          if (body.patientData.nombre !== undefined) {
            editedFields['patient.nombre'] = { 
              old: currentCase.patient.nombre, 
              new: body.patientData.nombre 
            }
            updates.nombre = body.patientData.nombre
          }
          
          if (body.patientData.apellido !== undefined) {
            editedFields['patient.apellido'] = { 
              old: currentCase.patient.apellido, 
              new: body.patientData.apellido 
            }
            updates.apellido = body.patientData.apellido
          }
          
          if (body.patientData.telefono !== undefined) {
            editedFields['patient.telefono'] = { 
              old: currentCase.patient.telefono, 
              new: body.patientData.telefono 
            }
            updates.telefono = body.patientData.telefono
          }
          
          if (body.patientData.email !== undefined) {
            editedFields['patient.email'] = { 
              old: currentCase.patient.email, 
              new: body.patientData.email 
            }
            updates.email = body.patientData.email
          }
          
          if (body.patientData.localidad !== undefined) {
            editedFields['patient.localidad'] = { 
              old: currentCase.patient.localidad, 
              new: body.patientData.localidad 
            }
            updates.localidad = body.patientData.localidad
          }
          
          if (body.patientData.provincia !== undefined) {
            editedFields['patient.provincia'] = { 
              old: currentCase.patient.provincia, 
              new: body.patientData.provincia 
            }
            updates.provincia = body.patientData.provincia
          }
          
          if (body.patientData.nroAfiliado !== undefined) {
            editedFields['patient.nroAfiliado'] = { 
              old: currentCase.patient.nroAfiliado, 
              new: body.patientData.nroAfiliado 
            }
            updates.nroAfiliado = body.patientData.nroAfiliado
          }
          
          if (body.patientData.planNombre !== undefined) {
            editedFields['patient.planNombre'] = { 
              old: currentCase.patient.planNombre, 
              new: body.patientData.planNombre 
            }
            updates.planNombre = body.patientData.planNombre
          }
          
          if (body.patientData.notas !== undefined) {
            editedFields['patient.notas'] = { 
              old: currentCase.patient.notas, 
              new: body.patientData.notas 
            }
            updates.notas = body.patientData.notas
          }
          
          if (Object.keys(updates).length > 0) {
            await prisma.patient.update({
              where: { id: currentCase.patient.id },
              data: updates
            })
          }
        }
      }
    }
    
    // Actualizar estado del caso si cambió
    if (newStatus && newStatus !== currentStatus) {
      const durationSeconds = Math.floor(
        (new Date().getTime() - currentCase.currentStatusEnteredAt.getTime()) / 1000
      )
      
      const caseUpdateData: any = {
        status: newStatus,
        currentStatusEnteredAt: new Date()
      }
      
      // Sincronizar datos de quote si se actualizaron
      if (updatedQuoteData) {
        caseUpdateData.riskScore = updatedQuoteData.riskScore
        caseUpdateData.riskLevel = updatedQuoteData.riskLevel
        caseUpdateData.suggestedPriceMonthly = updatedQuoteData.suggestedPriceMonthly
      }
      
      await prisma.onboardingCase.update({
        where: { id: params.id },
        data: caseUpdateData
      })
      
      // Crear registro en status history
      await prisma.onboardingCaseStatusHistory.create({
        data: {
          caseId: params.id,
          fromStatus: currentStatus,
          toStatus: newStatus,
          changedByUserId: user.id,
          note: body.reason || 'Caso editado y estado revertido',
          durationSeconds
        }
      })
      
      editedFields['case.status'] = { old: currentStatus, new: newStatus }
    } else if (newStatus || updatedQuoteData) {
      // Actualizar caso sin cambiar estado (solo sincronizar datos)
      const caseUpdateData: any = {}
      
      // Sincronizar datos de quote si se actualizaron
      if (updatedQuoteData) {
        caseUpdateData.riskScore = updatedQuoteData.riskScore
        caseUpdateData.riskLevel = updatedQuoteData.riskLevel
        caseUpdateData.suggestedPriceMonthly = updatedQuoteData.suggestedPriceMonthly
      }
      
      if (Object.keys(caseUpdateData).length > 0) {
        await prisma.onboardingCase.update({
          where: { id: params.id },
          data: caseUpdateData
        })
      }
    }
    
    // Registrar evento de auditoría
    await prisma.onboardingCaseEvent.create({
      data: {
        caseId: params.id,
        eventType: newStatus && newStatus !== currentStatus ? 'STATUS_CHANGE' : 'EDIT',
        fromStatus: currentStatus,
        toStatus: newStatus || currentStatus,
        editedFields: Object.keys(editedFields).length > 0 ? JSON.stringify(editedFields) : null,
        reason: body.reason || null,
        performedByUserId: user.id
      }
    })
    
    // Obtener caso actualizado
    const updatedCase = await prisma.onboardingCase.findUnique({
      where: { id: params.id },
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
    
    if (!updatedCase) {
      return NextResponse.json(
        { error: 'Error al obtener caso actualizado' },
        { status: 500 }
      )
    }
    
    // Calcular días en columna
    const now = new Date()
    const enteredAt = new Date(updatedCase.currentStatusEnteredAt)
    const daysInColumn = Math.floor((now.getTime() - enteredAt.getTime()) / (1000 * 60 * 60 * 24))
    
    return NextResponse.json({
      case: {
        ...updatedCase,
        daysInColumn,
        riskScore: updatedCase.riskScore || updatedCase.quote?.riskScore || null,
        riskLevel: updatedCase.riskLevel || updatedCase.quote?.riskLevel || null,
        suggestedPriceMonthly: updatedCase.suggestedPriceMonthly || updatedCase.quote?.suggestedPriceMonthly || null
      },
      statusChanged: newStatus !== null && newStatus !== currentStatus,
      newStatus: newStatus || currentStatus
    })
  } catch (error: any) {
    console.error('Error editando caso:', error)
    return NextResponse.json(
      { error: error.message || 'Error al editar caso' },
      { status: 500 }
    )
  }
}

/**
 * Valida si un rol puede editar un caso en un estado dado
 */
function validateEditPermission(
  role: string,
  status: OnboardingStatus
): { allowed: boolean; reason?: string } {
  switch (role) {
    case 'COTIZADOR':
      if (status === 'PENDIENTE_COTIZACION' || status === 'PENDIENTE_APROBACION' || status === 'RECHAZADO') {
        return { allowed: true }
      }
      return { 
        allowed: false, 
        reason: 'Solo puedes editar casos en PENDIENTE_COTIZACION, PENDIENTE_APROBACION o RECHAZADO' 
      }
    
    case 'APROBADOR':
      if (status === 'APROBADO') {
        return { allowed: true }
      }
      return { 
        allowed: false, 
        reason: 'Solo puedes editar casos en estado APROBADO' 
      }
    
    case 'OFICINA':
      if (status === 'APROBADO' || status === 'PERFIL_COMPLETO') {
        return { allowed: true }
      }
      return { 
        allowed: false, 
        reason: 'Solo puedes editar casos en estado APROBADO o PERFIL_COMPLETO' 
      }
    
    case 'ADMIN':
      return { allowed: true } // ADMIN puede editar cualquier estado
    
    default:
      return { allowed: false, reason: 'Rol no reconocido' }
  }
}
