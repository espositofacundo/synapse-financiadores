import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { startOfDay, endOfDay } from 'date-fns'

// Forzar que esta ruta sea dinámica (no estática)
export const dynamic = 'force-dynamic'

// GET: Lista de pacientes con filtros y búsqueda
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando GET /api/patients')
    
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search')
    const plan = searchParams.get('plan')
    const estado = searchParams.get('estado')
    const riesgo = searchParams.get('riesgo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log('📋 Parámetros:', { search, plan, estado, riesgo, page, limit })

    const where: any = {
      financiadorId: 'default-financiador' // TODO: obtener del usuario autenticado
    }
    
    if (estado) where.estadoCobertura = estado
    if (riesgo) where.riskLevel = riesgo
    if (plan) where.planNombre = plan

    // Búsqueda por doc, afiliado, nombre
    if (search) {
      where.OR = [
        { nroDoc: { contains: search } },
        { nroAfiliado: { contains: search } },
        { nombre: { contains: search } },
        { apellido: { contains: search } }
      ]
    }

    console.log('🔎 Query where:', JSON.stringify(where, null, 2))

    console.log('📊 Buscando pacientes...')
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: {
          updatedAt: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.patient.count({ where })
    ])

    // Calcular costo 30d y total de consultas para cada paciente
    const ahora = new Date()
    const hace30dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)

    console.log('🔄 Procesando pacientes...')
    const patientsFormateados = await Promise.all(
      patients.map(async (p, index) => {
        if (index === 0) console.log(`   Procesando paciente ${p.id}...`)
        try {
          const [consultas30d, costo30d, totalConsultas, ultimaConsultaData] = await Promise.all([
            prisma.consulta.count({
              where: {
                patientId: p.id,
                fecha: {
                  gte: hace30dias,
                  lte: ahora
                }
              }
            }),
            prisma.consulta.aggregate({
              where: {
                patientId: p.id,
                fecha: {
                  gte: hace30dias,
                  lte: ahora
                }
              },
              _sum: {
                costo: true
              }
            }),
            prisma.consulta.count({
              where: {
                patientId: p.id
              }
            }),
            prisma.consulta.findFirst({
              where: {
                patientId: p.id
              },
              orderBy: {
                fecha: 'desc'
              },
              select: {
                fecha: true
              }
            })
          ])

          // Parsear JSON de forma segura
          let riskReasons = []
          if (p.riskReasons) {
            try {
              riskReasons = JSON.parse(p.riskReasons)
            } catch (e) {
              console.warn(`Error parsing riskReasons for patient ${p.id}:`, e)
            }
          }

          let tags = []
          if (p.tags) {
            try {
              tags = JSON.parse(p.tags)
            } catch (e) {
              console.warn(`Error parsing tags for patient ${p.id}:`, e)
            }
          }

          return {
            id: p.id,
            tipoDoc: p.tipoDoc,
            nroDoc: p.nroDoc,
            nombre: p.nombre,
            apellido: p.apellido,
            fechaNac: p.fechaNac,
            nroAfiliado: p.nroAfiliado,
            planNombre: p.planNombre,
            estadoCobertura: p.estadoCobertura,
            riskScore: p.riskScore || 0,
            riskLevel: p.riskLevel || 'bajo',
            riskReasons,
            ultimaConsulta: ultimaConsultaData?.fecha || null,
            totalConsultas,
            consultas30d,
            costo30d: costo30d._sum.costo || 0,
            esCronico: p.esCronico || false,
            tags
          }
        } catch (error: any) {
          console.error(`Error processing patient ${p.id}:`, error)
          // Retornar datos básicos si falla el procesamiento
          return {
            id: p.id,
            tipoDoc: p.tipoDoc,
            nroDoc: p.nroDoc,
            nombre: p.nombre,
            apellido: p.apellido,
            fechaNac: p.fechaNac,
            nroAfiliado: p.nroAfiliado,
            planNombre: p.planNombre,
            estadoCobertura: p.estadoCobertura,
            riskScore: p.riskScore || 0,
            riskLevel: p.riskLevel || 'bajo',
            riskReasons: [],
            ultimaConsulta: null,
            totalConsultas: 0,
            consultas30d: 0,
            costo30d: 0,
            esCronico: p.esCronico || false,
            tags: []
          }
        }
      })
    )

    console.log(`✅ Procesados ${patientsFormateados.length} pacientes`)
    
    return NextResponse.json({
      patients: patientsFormateados,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('❌ Error en /api/patients:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    // Verificar si es un error de Prisma
    if (error.code) {
      console.error('Prisma error code:', error.code)
    }
    
    return NextResponse.json(
      {
        patients: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        },
        error: error.message || 'Error desconocido al cargar pacientes',
        errorDetails: process.env.NODE_ENV === 'development' ? {
          name: error.name,
          code: error.code,
          stack: error.stack
        } : undefined
      },
      { status: 500 }
    )
  }
}

// POST: Crear nuevo paciente
export async function POST(request: NextRequest) {
  try {
    // Verificar permiso
    const user = await requirePermission('patient:create')
    
    const body = await request.json()
    
    // Validar que tenga una cotización asociada
    if (!body.quoteId) {
      return NextResponse.json(
        { error: 'Se requiere una cotización previa (quoteId). Complete el formulario de cotización primero.' },
        { status: 400 }
      )
    }
    
    // Verificar que la cotización existe y está aprobada
    const quote = await prisma.patientQuote.findUnique({
      where: { id: body.quoteId }
    })
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }
    
    // Solo se puede crear paciente si la cotización está APPROVED
    if (quote.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `No se puede crear un paciente con una cotización en estado ${quote.status}. La cotización debe estar aprobada.` },
        { status: 400 }
      )
    }
    
    if (quote.patientId) {
      return NextResponse.json(
        { error: 'Esta cotización ya fue utilizada para crear un paciente' },
        { status: 400 }
      )
    }
    
    // Normalizar documento (sin puntos/guiones)
    const nroDocNormalizado = body.nroDoc?.replace(/[.\-]/g, '') || ''
    
    // Validar unicidad
    const existente = await prisma.patient.findFirst({
      where: {
        financiadorId: 'default-financiador', // TODO: obtener del usuario
        OR: [
          { nroDoc: nroDocNormalizado, tipoDoc: body.tipoDoc },
          { nroAfiliado: body.nroAfiliado }
        ]
      }
    })

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un paciente con este documento o número de afiliado' },
        { status: 400 }
      )
    }

    // Detectar duplicados probables
    const duplicados = await prisma.patient.findMany({
      where: {
        financiadorId: 'default-financiador',
        nombre: { contains: body.nombre },
        apellido: { contains: body.apellido },
        fechaNac: new Date(body.fechaNac)
      }
    })

    const patient = await prisma.patient.create({
      data: {
        tipoDoc: body.tipoDoc || 'DNI',
        nroDoc: nroDocNormalizado,
        nombre: body.nombre,
        apellido: body.apellido,
        fechaNac: new Date(body.fechaNac),
        sexo: body.sexo,
        telefono: body.telefono,
        email: body.email,
        localidad: body.localidad,
        provincia: body.provincia,
        canalPreferido: body.canalPreferido,
        financiadorId: 'default-financiador',
        planId: body.planId,
        planNombre: body.planNombre,
        nroAfiliado: body.nroAfiliado,
        estadoCobertura: body.estadoCobertura || 'activa',
        notas: body.notas,
        tags: body.tags ? JSON.stringify(body.tags) : null,
        esCronico: body.esCronico || false,
        patologias: body.patologias ? JSON.stringify(body.patologias) : null,
        consentimiento: body.consentimiento || false,
        privacidad: body.privacidad !== false
      }
    })

    // Asociar cotización al paciente y actualizar status
    await prisma.patientQuote.update({
      where: { id: body.quoteId },
      data: { 
        patientId: patient.id,
        status: 'PATIENT_CREATED'
      }
    })
    
    // Mover caso de onboarding a PERFIL_COMPLETO
    const onboardingCase = await prisma.onboardingCase.findFirst({
      where: { quoteId: body.quoteId }
    })
    
    if (onboardingCase) {
      const durationSeconds = Math.floor(
        (new Date().getTime() - onboardingCase.currentStatusEnteredAt.getTime()) / 1000
      )
      
      await prisma.onboardingCase.update({
        where: { id: onboardingCase.id },
        data: {
          status: 'PERFIL_COMPLETO',
          patientId: patient.id,
          currentStatusEnteredAt: new Date()
        }
      })
      
      await prisma.onboardingCaseStatusHistory.create({
        data: {
          caseId: onboardingCase.id,
          fromStatus: onboardingCase.status,
          toStatus: 'PERFIL_COMPLETO',
          changedByUserId: user.id,
          note: 'Paciente creado y perfil completado',
          durationSeconds
        }
      })
    }
    
    // Calcular riesgo inicial usando motor V2 (será bajo sin consultas)
    const { procesarRiesgoPacienteV2, defaultRiskConfig } = await import('@/lib/patient-risk-v2')
    const riskConfig = { ...defaultRiskConfig, financiadorId: 'default-financiador' }
    if (body.planNombre) {
      riskConfig.planNombre = body.planNombre
    }
    await procesarRiesgoPacienteV2(patient.id, riskConfig)

    return NextResponse.json({
      patient,
      quoteId: body.quoteId,
      duplicadosProbables: duplicados.length > 0 ? duplicados.map(d => ({
        id: d.id,
        nombre: `${d.nombre} ${d.apellido}`,
        nroDoc: d.nroDoc
      })) : []
    })
  } catch (error: any) {
    console.error('Error creando paciente:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
