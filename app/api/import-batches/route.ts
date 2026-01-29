import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/auth'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

/**
 * GET /api/import-batches
 * Lista importaciones
 */
export async function GET() {
  try {
    await requirePermission('audit:read')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const batches = await prisma.importBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { consultations: true, invoices: true } }
      }
    })
    return NextResponse.json(batches)
  } catch (error: any) {
    console.error('[import-batches] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/import-batches
 * Crea una importación simulada con datos mock
 */
export async function POST(request: NextRequest) {
  let user
  try {
    user = await requirePermission('audit:run')
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, type } = body as { name?: string; type?: string }

    const batchName = name?.trim() || `Importación ${format(new Date(), 'dd/MM/yyyy HH:mm')}`
    const batchType = type || 'MIXTA'

    if (!['CONSULTAS', 'FACTURAS', 'MIXTA'].includes(batchType)) {
      return NextResponse.json(
        { error: 'type debe ser CONSULTAS | FACTURAS | MIXTA' },
        { status: 400 }
      )
    }

    // Crear batch
    const batch = await prisma.importBatch.create({
      data: {
        name: batchName,
        type: batchType,
        status: 'PROCESSING',
        createdByUserId: user.id
      }
    })

    // Generar datos simulados
    const consultationsToCreate = batchType !== 'FACTURAS' ? randomInt(30, 50) : 0
    const invoicesToCreate = batchType !== 'CONSULTAS' ? randomInt(20, 35) : 0

    const especialidades = ['clínica', 'pediatría', 'gineco', 'cardio', 'traumatología', 'psiquiatría']
    const canales = ['guardia', 'programada', 'telemedicina']
    const proveedores = ['Dr. García', 'Dra. López', 'Dr. Martínez', 'Dra. Rodríguez', 'Dr. Fernández']

    // Crear consultas
    const createdConsultations: string[] = []
    for (let i = 0; i < consultationsToCreate; i++) {
      const fecha = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      const especialidad = randomElement(especialidades)
      const canal = randomElement(canales)
      const costo = randomInt(3000, 15000)
      const riskScore = randomInt(0, 100)
      const riskLevel = riskScore >= 70 ? 'alto' : riskScore >= 40 ? 'medio' : 'bajo'
      const edad = randomInt(25, 75)
      const sexo = Math.random() > 0.5 ? 'M' : 'F'

      const consultation = await prisma.consulta.create({
        data: {
          fecha,
          especialidad,
          canal,
          costo,
          duracion: randomInt(10, 60),
          efectiva: Math.random() > 0.15,
          riskScore,
          riskLevel,
          deriva: Math.random() < 0.25,
          displayName: `Caso #${1000 + i} - ${sexo === 'M' ? 'Masculino' : 'Femenino'}, ${edad} años`,
          providerName: randomElement(proveedores),
          importBatchId: batch.id,
          financiadorId: user.financiadorId || 'default-financiador',
          auditStatus: 'NOT_AUDITED'
        }
      })
      createdConsultations.push(consultation.id)
    }

    // Crear facturas
    const createdInvoices: string[] = []
    for (let i = 0; i < invoicesToCreate; i++) {
      const issuedAt = randomDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date())
      const totalAmount = randomInt(5000, 50000)

      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `FAC-${format(new Date(), 'yyyyMM')}-${String(i + 1).padStart(4, '0')}`,
          issuedAt,
          totalAmount,
          status: randomElement(['RECEIVED', 'VALIDATED', 'PAID']),
          providerName: randomElement(proveedores),
          importBatchId: batch.id
        }
      })
      createdInvoices.push(invoice.id)
    }

    // Crear relaciones consulta <-> factura
    // 60% con 1 factura, 20% con 2+ facturas, 20% sin factura
    if (createdConsultations.length > 0 && createdInvoices.length > 0) {
      let invoiceIndex = 0
      for (let i = 0; i < createdConsultations.length; i++) {
        const rand = Math.random()
        if (rand < 0.6 && invoiceIndex < createdInvoices.length) {
          // 1 factura
          await prisma.consultationInvoice.create({
            data: {
              consultationId: createdConsultations[i],
              invoiceId: createdInvoices[invoiceIndex]
            }
          })
          invoiceIndex++
        } else if (rand < 0.8 && invoiceIndex + 1 < createdInvoices.length) {
          // 2 facturas
          await prisma.consultationInvoice.create({
            data: {
              consultationId: createdConsultations[i],
              invoiceId: createdInvoices[invoiceIndex]
            }
          })
          await prisma.consultationInvoice.create({
            data: {
              consultationId: createdConsultations[i],
              invoiceId: createdInvoices[invoiceIndex + 1]
            }
          })
          invoiceIndex += 2
        }
        // 20% sin factura: no hacer nada
      }
    }

    // Actualizar batch con conteos
    const updatedBatch = await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: 'READY',
        processedAt: new Date(),
        recordsCountConsultations: consultationsToCreate,
        recordsCountInvoices: invoicesToCreate
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { consultations: true, invoices: true } }
      }
    })

    return NextResponse.json(updatedBatch)
  } catch (error: any) {
    console.error('[import-batches] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
