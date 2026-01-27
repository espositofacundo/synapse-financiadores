import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: Detalle de paciente
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: params.id },
      include: {
        consultas: {
          orderBy: { fecha: 'desc' },
          include: {
            prestador: true
          }
        },
        riskHistory: {
          orderBy: { calculatedAt: 'desc' },
          take: 10
        }
      }
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      )
    }

    // Calcular estadísticas
    const ahora = new Date()
    const hace30dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
    const hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [consultas30d, costo30d, consultas7d] = await Promise.all([
      prisma.consulta.count({
        where: {
          patientId: patient.id,
          fecha: { gte: hace30dias, lte: ahora }
        }
      }),
      prisma.consulta.aggregate({
        where: {
          patientId: patient.id,
          fecha: { gte: hace30dias, lte: ahora }
        },
        _sum: { costo: true }
      }),
      prisma.consulta.count({
        where: {
          patientId: patient.id,
          fecha: { gte: hace7dias, lte: ahora }
        }
      })
    ])

    const patientFormateado = {
      ...patient,
      riskReasons: patient.riskReasons ? JSON.parse(patient.riskReasons) : [],
      tags: patient.tags ? JSON.parse(patient.tags) : [],
      patologias: patient.patologias ? JSON.parse(patient.patologias) : [],
      consultas: patient.consultas.map(c => ({
        ...c,
        triggeredRules: c.triggeredRules ? JSON.parse(c.triggeredRules) : []
      })),
      riskHistory: patient.riskHistory.map(r => ({
        ...r,
        riskReasons: r.riskReasons ? JSON.parse(r.riskReasons) : []
      })),
      estadisticas: {
        consultas30d,
        costo30d: costo30d._sum.costo || 0,
        consultas7d,
        totalConsultas: patient.consultas.length
      }
    }

    return NextResponse.json(patientFormateado)
  } catch (error: any) {
    console.error('Error en /api/patients/[id]:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// PUT: Actualizar paciente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    
    // Normalizar documento si se actualiza
    if (body.nroDoc) {
      body.nroDoc = body.nroDoc.replace(/[.\-]/g, '')
    }

    const patient = await prisma.patient.update({
      where: { id: params.id },
      data: {
        ...(body.tipoDoc && { tipoDoc: body.tipoDoc }),
        ...(body.nroDoc && { nroDoc: body.nroDoc }),
        ...(body.nombre && { nombre: body.nombre }),
        ...(body.apellido && { apellido: body.apellido }),
        ...(body.fechaNac && { fechaNac: new Date(body.fechaNac) }),
        ...(body.sexo !== undefined && { sexo: body.sexo }),
        ...(body.telefono !== undefined && { telefono: body.telefono }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.localidad !== undefined && { localidad: body.localidad }),
        ...(body.provincia !== undefined && { provincia: body.provincia }),
        ...(body.canalPreferido !== undefined && { canalPreferido: body.canalPreferido }),
        ...(body.planId !== undefined && { planId: body.planId }),
        ...(body.planNombre !== undefined && { planNombre: body.planNombre }),
        ...(body.nroAfiliado !== undefined && { nroAfiliado: body.nroAfiliado }),
        ...(body.estadoCobertura !== undefined && { estadoCobertura: body.estadoCobertura }),
        ...(body.ownerId !== undefined && { ownerId: body.ownerId }),
        ...(body.ownerNombre !== undefined && { ownerNombre: body.ownerNombre }),
        ...(body.notas !== undefined && { notas: body.notas }),
        ...(body.tags !== undefined && { tags: JSON.stringify(body.tags) }),
        ...(body.esCronico !== undefined && { esCronico: body.esCronico }),
        ...(body.patologias !== undefined && { patologias: JSON.stringify(body.patologias) }),
        ...(body.consentimiento !== undefined && { consentimiento: body.consentimiento }),
        ...(body.privacidad !== undefined && { privacidad: body.privacidad }),
        ...(body.fechaBaja && { fechaBaja: new Date(body.fechaBaja) })
      }
    })

    // Recalcular riesgo si cambió algo relevante
    if (body.estadoCobertura || body.esCronico !== undefined) {
      // Recalcular riesgo usando motor V2 si campos relevantes cambiaron
      const { procesarRiesgoPacienteV2, defaultRiskConfig } = await import('@/lib/patient-risk-v2')
      const riskConfig = { ...defaultRiskConfig, financiadorId: patient.financiadorId }
      if (patient.planNombre) {
        riskConfig.planNombre = patient.planNombre
      }
      await procesarRiesgoPacienteV2(patient.id, riskConfig)
    }

    return NextResponse.json(patient)
  } catch (error: any) {
    console.error('Error actualizando paciente:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
