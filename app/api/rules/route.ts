import { NextRequest, NextResponse } from 'next/server'
import { defaultRules, type AuditoriaRules } from '@/lib/auditoria'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'

const RULES_FILE = join(process.cwd(), 'data', 'rules.json')

// GET: Obtener reglas actuales
export async function GET() {
  try {
    const data = await readFile(RULES_FILE, 'utf-8')
    const rules = JSON.parse(data)
    return NextResponse.json(rules)
  } catch (error) {
    // Si no existe, devolver defaults
    return NextResponse.json(defaultRules)
  }
}

// POST: Guardar reglas
export async function POST(request: NextRequest) {
  try {
    const rules: AuditoriaRules = await request.json()
    
    // Asegurar que el directorio existe
    const fs = require('fs')
    const dir = join(process.cwd(), 'data')
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    await writeFile(RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8')
    return NextResponse.json({ success: true, rules })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
