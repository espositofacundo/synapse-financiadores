import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { procesarRiesgoPacienteV2, defaultRiskConfig, type RiskConfig } from '@/lib/patient-risk-v2'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const CONFIG_DIR = join(process.cwd(), 'data', 'risk-configs')

// POST: Recalcular riesgo de un paciente usando motor V2
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Obtener paciente para saber financiador y plan
    const patient = await prisma.patient.findUnique({
      where: { id: params.id },
      select: { financiadorId: true, planNombre: true }
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      )
    }

    // Cargar configuración específica o usar default
    let config: RiskConfig = defaultRiskConfig
    try {
      const configPath = getConfigPath(patient.financiadorId, patient.planNombre)
      if (existsSync(configPath)) {
        const data = await readFile(configPath, 'utf-8')
        config = JSON.parse(data)
      } else {
        config = { ...defaultRiskConfig, financiadorId: patient.financiadorId }
        if (patient.planNombre) {
          config.planNombre = patient.planNombre
        }
      }
    } catch (error) {
      console.warn('Error cargando configuración, usando default:', error)
    }

    const result = await procesarRiesgoPacienteV2(params.id, config)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('Error recalculando riesgo:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

function getConfigPath(financiadorId: string, planNombre?: string | null): string {
  const filename = planNombre 
    ? `risk-config-${financiadorId}-${planNombre.replace(/\s+/g, '-')}.json`
    : `risk-config-${financiadorId}.json`
  return join(CONFIG_DIR, filename)
}
