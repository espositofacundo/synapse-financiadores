import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { procesarAuditoriaParaConsulta, defaultRules, type AuditoriaRules } from '@/lib/auditoria'
import { readFile } from 'fs/promises'
import { join } from 'path'

const RULES_FILE = join(process.cwd(), 'data', 'rules.json')

// POST: Recalcular auditoría para todas las consultas o una específica
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const consultaId = body.consultaId

    // Cargar reglas
    let rules: AuditoriaRules
    try {
      const data = await readFile(RULES_FILE, 'utf-8')
      rules = JSON.parse(data)
    } catch {
      rules = defaultRules
    }

    if (consultaId) {
      // Procesar una consulta específica
      const result = await procesarAuditoriaParaConsulta(consultaId, rules)
      return NextResponse.json({ success: true, ...result })
    } else {
      // Procesar todas las consultas
      const consultas = await prisma.consulta.findMany({
        select: { id: true }
      })

      let procesadas = 0
      for (const consulta of consultas) {
        await procesarAuditoriaParaConsulta(consulta.id, rules)
        procesadas++
      }

      return NextResponse.json({
        success: true,
        procesadas,
        total: consultas.length
      })
    }
  } catch (error: any) {
    console.error('Error en /api/auditoria:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
