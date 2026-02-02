import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const consulta = await prisma.consulta.findUnique({
      where: { id: params.id },
      include: {
        afiliado: true,
        patient: true,
        prestador: true,
        financiador: true
      }
    })

    if (!consulta) {
      return NextResponse.json(
        { error: 'Consulta no encontrada' },
        { status: 404 }
      )
    }

    const consultaFormateada = {
      id: consulta.id,
      fecha: consulta.fecha,
      especialidad: consulta.especialidad,
      canal: consulta.canal,
      costo: consulta.costo,
      duracion: consulta.duracion,
      efectiva: consulta.efectiva,
      motivoNoEfectiva: consulta.motivoNoEfectiva,
      diagnostico: consulta.diagnostico,
      motivoConsulta: consulta.motivoConsulta,
      deriva: consulta.deriva,
      tipoDerivacion: consulta.tipoDerivacion,
      prestadorDerivado: consulta.prestadorDerivado,
      riskScore: consulta.riskScore,
      riskLevel: consulta.riskLevel,
      triggeredRules: consulta.triggeredRules ? JSON.parse(consulta.triggeredRules) : [],
      trazabilidad: consulta.trazabilidad ? JSON.parse(consulta.trazabilidad) : [],
      resumenClinico: consulta.resumenClinico,
      afiliado: consulta.afiliado ? {
        id: consulta.afiliado.id,
        nombre: consulta.afiliado.nombre,
        apellido: consulta.afiliado.apellido,
        dni: consulta.afiliado.dni.substring(0, 2) + '******' + consulta.afiliado.dni.substring(8), // anonimizado
        edad: consulta.afiliado.edad
      } : null,
      patient: consulta.patient ? {
        id: consulta.patient.id,
        nombre: consulta.patient.nombre,
        apellido: consulta.patient.apellido,
        nroDoc: consulta.patient.nroDoc.substring(0, 2) + '******' + consulta.patient.nroDoc.substring(8), // anonimizado
        nroAfiliado: consulta.patient.nroAfiliado
      } : null,
      prestador: consulta.prestador ? {
        id: consulta.prestador.id,
        nombre: consulta.prestador.nombre,
        matricula: consulta.prestador.matricula
      } : null,
      financiador: consulta.financiador ? {
        id: consulta.financiador.id,
        nombre: consulta.financiador.nombre
      } : null
    }

    return NextResponse.json(consultaFormateada)
  } catch (error: any) {
    console.error('Error en /api/consultas/[id]:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
