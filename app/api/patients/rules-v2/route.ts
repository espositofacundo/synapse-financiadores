import { NextRequest, NextResponse } from 'next/server'
import { defaultRiskConfig, type RiskConfig } from '@/lib/patient-risk-v2'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const CONFIG_DIR = join(process.cwd(), 'data', 'risk-configs')

// GET: Obtener configuración de riesgo
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const financiadorId = searchParams.get('financiadorId') || 'default-financiador'
    const planNombre = searchParams.get('planNombre')

    const configPath = getConfigPath(financiadorId, planNombre)
    
    try {
      const data = await readFile(configPath, 'utf-8')
      const config = JSON.parse(data)
      return NextResponse.json(config)
    } catch {
      // Si no existe, retornar default
      const defaultConfig = { ...defaultRiskConfig, financiadorId }
      if (planNombre) {
        defaultConfig.planNombre = planNombre
      }
      return NextResponse.json(defaultConfig)
    }
  } catch (error: any) {
    console.error('Error obteniendo configuración:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// POST: Guardar configuración de riesgo
export async function POST(request: NextRequest) {
  try {
    const config: RiskConfig = await request.json()
    
    // Validar que los pesos sumen aproximadamente 1.0
    const sumWeights = Object.values(config.trackWeights).reduce((a, b) => a + b, 0)
    if (Math.abs(sumWeights - 1.0) > 0.1) {
      return NextResponse.json(
        { error: 'Los pesos de los tracks deben sumar aproximadamente 1.0' },
        { status: 400 }
      )
    }

    // Crear directorio si no existe
    if (!existsSync(CONFIG_DIR)) {
      await mkdir(CONFIG_DIR, { recursive: true })
    }

    const configPath = getConfigPath(
      config.financiadorId || 'default-financiador',
      config.planNombre
    )
    
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
    
    return NextResponse.json({ success: true, config })
  } catch (error: any) {
    console.error('Error guardando configuración:', error)
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
