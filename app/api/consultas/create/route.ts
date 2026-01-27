import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { procesarAuditoriaParaConsulta, defaultRules } from '@/lib/auditoria'
import { procesarRiesgoPacienteV2, defaultRiskConfig } from '@/lib/patient-risk-v2'

// POST: Crear nueva consulta
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Crear consulta
    const consulta = await prisma.consulta.create({
      data: {
        fecha: new Date(body.fecha),
        especialidad: body.especialidad,
        canal: body.canal,
        costo: body.costo,
        duracion: body.duracion || 30,
        efectiva: body.efectiva !== false,
        motivoNoEfectiva: body.motivoNoEfectiva,
        diagnostico: body.diagnostico,
        motivoConsulta: body.motivoConsulta,
        deriva: body.deriva || false,
        tipoDerivacion: body.tipoDerivacion,
        prestadorDerivado: body.prestadorDerivado,
        afiliadoId: body.afiliadoId,
        patientId: body.patientId,
        prestadorId: body.prestadorId,
        financiadorId: body.financiadorId || 'default-financiador',
        resumenClinico: body.resumenClinico,
        trazabilidad: JSON.stringify([
          { evento: 'creada', fecha: new Date(), usuario: 'Sistema' }
        ])
      }
    })

    // Calcular auditoría de la consulta
    await procesarAuditoriaParaConsulta(consulta.id, defaultRules)

    // Si tiene paciente asociado, recalcular riesgo del paciente usando motor V2
    if (body.patientId) {
      try {
        const patient = await prisma.patient.findUnique({
          where: { id: body.patientId },
          select: { financiadorId: true, planNombre: true }
        })
        if (patient) {
          const riskConfig = { ...defaultRiskConfig, financiadorId: patient.financiadorId }
          if (patient.planNombre) {
            riskConfig.planNombre = patient.planNombre
          }
          await procesarRiesgoPacienteV2(body.patientId, riskConfig)
        }
      } catch (error) {
        console.error('Error calculando riesgo de paciente:', error)
        // No fallar la creación de consulta si falla el cálculo de riesgo
      }
    }

    return NextResponse.json({ consulta })
  } catch (error: any) {
    console.error('Error creando consulta:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
