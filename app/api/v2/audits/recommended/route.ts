import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v2/audits/recommended
 * Calcula y devuelve consultas recomendadas para auditar
 * Usa heurística simple (sin ML):
 * - +30 si costo > P95
 * - +25 si tiene >=2 facturas
 * - +20 si posible duplicado (misma especialidad en 48h)
 * - +15 si riskLevel=ALTO
 * - +10 si canal=guardia
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission('audit:run')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = request.nextUrl
    const limit = parseInt(searchParams.get('limit') || '20')

    // Obtener consultas no auditadas
    const consultations = await prisma.consulta.findMany({
      where: {
        auditStatus: 'NOT_AUDITED'
      },
      include: {
        invoices: true
      },
      orderBy: { fecha: 'desc' },
      take: 500 // Pool de candidatos
    })

    if (consultations.length === 0) {
      return NextResponse.json({ recommended: [], message: 'No hay consultas sin auditar' })
    }

    // Calcular P95 de costo
    const costos = consultations.map(c => c.costo).sort((a, b) => a - b)
    const p95Index = Math.floor(costos.length * 0.95)
    const p95Threshold = costos[p95Index] || 10000

    // Detectar posibles duplicados (misma especialidad en 48h)
    const duplicateMap = new Map<string, string[]>()
    for (const c of consultations) {
      const key = c.especialidad
      if (!duplicateMap.has(key)) duplicateMap.set(key, [])
      duplicateMap.get(key)!.push(c.id)
    }

    // Calcular score para cada consulta
    const scored = consultations.map(c => {
      let score = 0
      const reasons: string[] = []

      // +30 si costo > P95
      if (c.costo > p95Threshold) {
        score += 30
        reasons.push('Costo alto (>P95)')
      }

      // +25 si tiene >=2 facturas
      if (c.invoices.length >= 2) {
        score += 25
        reasons.push(`${c.invoices.length} facturas`)
      }

      // +20 si posible duplicado
      const sameSpec = duplicateMap.get(c.especialidad) || []
      const hasDuplicate = sameSpec.some(otherId => {
        if (otherId === c.id) return false
        const other = consultations.find(x => x.id === otherId)
        if (!other) return false
        const diffMs = Math.abs(c.fecha.getTime() - other.fecha.getTime())
        return diffMs < 48 * 60 * 60 * 1000 // 48 horas
      })
      if (hasDuplicate) {
        score += 20
        reasons.push('Posible duplicado')
      }

      // +15 si riskLevel=alto
      if (c.riskLevel === 'alto') {
        score += 15
        reasons.push('Riesgo alto')
      }

      // +10 si canal=guardia
      if (c.canal === 'guardia') {
        score += 10
        reasons.push('Canal guardia')
      }

      return {
        id: c.id,
        displayName: c.displayName,
        fecha: c.fecha,
        especialidad: c.especialidad,
        canal: c.canal,
        costo: c.costo,
        riskLevel: c.riskLevel,
        invoicesCount: c.invoices.length,
        priorityScore: score,
        reasons
      }
    })

    // Ordenar por score y tomar top N
    const recommended = scored
      .filter(c => c.priorityScore > 0)
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, limit)

    return NextResponse.json({
      recommended,
      total: recommended.length,
      p95Threshold,
      message: recommended.length === 0 
        ? 'No hay consultas que cumplan criterios de recomendación' 
        : `Se encontraron ${recommended.length} consultas recomendadas para auditar`
    })
  } catch (error: any) {
    console.error('[v2/audits/recommended] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
