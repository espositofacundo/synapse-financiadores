import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

// Forzar que esta ruta sea dinámica (no estática)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const especialidad = searchParams.get('especialidad')
    const canal = searchParams.get('canal')
    const riesgo = searchParams.get('riesgo')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    
    if (from || to) {
      where.fecha = {}
      if (from) where.fecha.gte = startOfDay(new Date(from))
      if (to) where.fecha.lte = endOfDay(new Date(to))
    }
    
    if (especialidad) where.especialidad = especialidad
    if (canal) where.canal = canal
    if (riesgo) where.riskLevel = riesgo

    const [consultas, total] = await Promise.all([
      prisma.consulta.findMany({
        where,
        include: {
          afiliado: true,
          patient: true,
          prestador: true
        },
        orderBy: {
          fecha: 'desc'
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.consulta.count({ where })
    ])

    const consultasFormateadas = (consultas || []).map(c => ({
      id: c.id,
      fecha: c.fecha,
      especialidad: c.especialidad,
      canal: c.canal,
      costo: c.costo,
      duracion: c.duracion,
      efectiva: c.efectiva,
      motivoNoEfectiva: c.motivoNoEfectiva,
      diagnostico: c.diagnostico,
      motivoConsulta: c.motivoConsulta,
      deriva: c.deriva,
      tipoDerivacion: c.tipoDerivacion,
      riskScore: c.riskScore,
      riskLevel: c.riskLevel,
      triggeredRules: c.triggeredRules ? JSON.parse(c.triggeredRules) : [],
      afiliado: c.afiliado ? {
        id: c.afiliado.id,
        nombre: `${c.afiliado.nombre} ${c.afiliado.apellido}`,
        dni: c.afiliado.dni,
        edad: c.afiliado.edad
      } : null,
      patient: c.patient ? {
        id: c.patient.id,
        nombre: `${c.patient.nombre} ${c.patient.apellido}`,
        nroDoc: c.patient.nroDoc,
        nroAfiliado: c.patient.nroAfiliado
      } : null,
      prestador: c.prestador ? {
        id: c.prestador.id,
        nombre: c.prestador.nombre,
        matricula: c.prestador.matricula
      } : null
    }))

    return NextResponse.json({
      consultas: consultasFormateadas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Error en /api/consultas:', error)
    return NextResponse.json(
      {
        consultas: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        },
        error: error.message
      },
      { status: 500 }
    )
  }
}
