import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { procesarRiesgoPacienteV2, defaultRiskConfig } from '@/lib/patient-risk-v2'

// POST: Importación masiva de pacientes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { rows } = body // Array de objetos con datos de pacientes

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        { error: 'Se espera un array de pacientes' },
        { status: 400 }
      )
    }

    const resultados = {
      creados: 0,
      actualizados: 0,
      rechazados: 0,
      errores: [] as Array<{ row: number; error: string; data: any }>
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      
      try {
        // Normalizar documento
        const nroDocNormalizado = (row.nroDoc || '').toString().replace(/[.\-]/g, '')
        
        if (!nroDocNormalizado || !row.nombre || !row.apellido || !row.nroAfiliado) {
          resultados.rechazados++
          resultados.errores.push({
            row: i + 1,
            error: 'Faltan campos requeridos (nroDoc, nombre, apellido, nroAfiliado)',
            data: row
          })
          continue
        }

        // Buscar si existe
        const existente = await prisma.patient.findFirst({
          where: {
            financiadorId: 'default-financiador',
            OR: [
              { nroDoc: nroDocNormalizado, tipoDoc: row.tipoDoc || 'DNI' },
              { nroAfiliado: row.nroAfiliado }
            ]
          }
        })

        const data = {
          tipoDoc: row.tipoDoc || 'DNI',
          nroDoc: nroDocNormalizado,
          nombre: row.nombre,
          apellido: row.apellido,
          fechaNac: row.fechaNac ? new Date(row.fechaNac) : new Date('1990-01-01'),
          sexo: row.sexo,
          telefono: row.telefono,
          email: row.email,
          localidad: row.localidad,
          provincia: row.provincia,
          canalPreferido: row.canalPreferido,
          financiadorId: 'default-financiador',
          planId: row.planId,
          planNombre: row.planNombre,
          nroAfiliado: row.nroAfiliado,
          estadoCobertura: row.estadoCobertura || 'activa',
          notas: row.notas,
          tags: row.tags ? JSON.stringify(Array.isArray(row.tags) ? row.tags : [row.tags]) : null,
          esCronico: row.esCronico === true || row.esCronico === 'true',
          patologias: row.patologias ? JSON.stringify(Array.isArray(row.patologias) ? row.patologias : [row.patologias]) : null
        }

        if (existente) {
          // Actualizar
          await prisma.patient.update({
            where: { id: existente.id },
            data
          })
          resultados.actualizados++
        } else {
          // Crear
          const nuevo = await prisma.patient.create({ data })
          
          // Calcular riesgo inicial usando motor V2
          const riskConfig = { ...defaultRiskConfig, financiadorId: 'default-financiador' }
          if (row.planNombre) {
            riskConfig.planNombre = row.planNombre
          }
          await procesarRiesgoPacienteV2(nuevo.id, riskConfig)
          
          resultados.creados++
        }
      } catch (error: any) {
        resultados.rechazados++
        resultados.errores.push({
          row: i + 1,
          error: error.message,
          data: row
        })
      }
    }

    return NextResponse.json(resultados)
  } catch (error: any) {
    console.error('Error en importación:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
