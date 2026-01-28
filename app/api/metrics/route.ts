import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'

// Forzar que esta ruta sea dinámica (no estática)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const especialidad = searchParams.get('especialidad')
    const canal = searchParams.get('canal')

    const where: any = {}
    
    if (from || to) {
      where.fecha = {}
      if (from) where.fecha.gte = startOfDay(new Date(from))
      if (to) where.fecha.lte = endOfDay(new Date(to))
    }
    
    if (especialidad) where.especialidad = especialidad
    if (canal) where.canal = canal

    const consultas = await prisma.consulta.findMany({
      where,
      include: {
        afiliado: true,
        prestador: true
      }
    })

    // KPIs
    const totalConsultas = consultas.length
    const consultasEfectivas = consultas.filter(c => c.efectiva).length
    const porcentajeEfectivas = totalConsultas > 0 ? (consultasEfectivas / totalConsultas) * 100 : 0
    const costoTotal = consultas.reduce((sum, c) => sum + c.costo, 0)
    const costoPromedio = totalConsultas > 0 ? costoTotal / totalConsultas : 0

    // Top especialidades por costo
    const especialidadesCosto = consultas.reduce((acc, c) => {
      if (!acc[c.especialidad]) {
        acc[c.especialidad] = { costo: 0, volumen: 0 }
      }
      acc[c.especialidad].costo += c.costo
      acc[c.especialidad].volumen += 1
      return acc
    }, {} as Record<string, { costo: number; volumen: number }>)

    const topEspecialidades = Object.entries(especialidadesCosto)
      .map(([especialidad, data]) => ({
        especialidad,
        costo: data.costo,
        volumen: data.volumen
      }))
      .sort((a, b) => b.costo - a.costo)
      .slice(0, 5)

    // Reconsultas en 7 días
    const ahora = new Date()
    const hace7dias = subDays(ahora, 7)
    const reconsultas7d = consultas.filter(c => {
      if (c.fecha < hace7dias) return false
      // Contar consultas del mismo afiliado en 7 días
      const consultasAfiliado = consultas.filter(
        ca => ca.afiliadoId === c.afiliadoId && 
        ca.fecha >= hace7dias && 
        ca.fecha <= ahora &&
        ca.id !== c.id
      )
      return consultasAfiliado.length > 0
    }).length

    // Time series por día
    const timeSeries = consultas.reduce((acc, c) => {
      const fecha = format(c.fecha, 'yyyy-MM-dd')
      if (!acc[fecha]) {
        acc[fecha] = { fecha, consultas: 0, costo: 0 }
      }
      acc[fecha].consultas += 1
      acc[fecha].costo += c.costo
      return acc
    }, {} as Record<string, { fecha: string; consultas: number; costo: number }>)

    const timeSeriesArray = Object.values(timeSeries).sort((a, b) => 
      a.fecha.localeCompare(b.fecha)
    )

    // Gráfico por especialidad
    const especialidadesChart = Object.entries(especialidadesCosto).map(([especialidad, data]) => ({
      especialidad,
      volumen: data.volumen,
      costo: data.costo
    }))

    // Gráfico por canal
    const canalesChart = consultas.reduce((acc, c) => {
      if (!acc[c.canal]) {
        acc[c.canal] = 0
      }
      acc[c.canal] += 1
      return acc
    }, {} as Record<string, number>)

    const canalesChartArray = Object.entries(canalesChart).map(([canal, count]) => ({
      canal,
      count
    }))

    // Top alertas (consultas con riesgo alto)
    const topAlertas = consultas
      .filter(c => c.riskLevel === 'alto' && c.afiliado && c.prestador)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .map(c => ({
        id: c.id,
        fecha: c.fecha,
        especialidad: c.especialidad,
        canal: c.canal,
        costo: c.costo,
        riskScore: c.riskScore,
        afiliado: c.afiliado ? `${c.afiliado.nombre} ${c.afiliado.apellido}` : 'N/A',
        prestador: c.prestador?.nombre || 'N/A'
      }))

    return NextResponse.json({
      kpis: {
        totalConsultas,
        porcentajeEfectivas: Math.round(porcentajeEfectivas * 100) / 100,
        costoTotal: Math.round(costoTotal * 100) / 100,
        costoPromedio: Math.round(costoPromedio * 100) / 100,
        reconsultas7d
      },
      topEspecialidades,
      timeSeries: timeSeriesArray,
      especialidadesChart,
      canalesChart: canalesChartArray,
      topAlertas
    })
  } catch (error: any) {
    console.error('Error en /api/metrics:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
