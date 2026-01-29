/**
 * Seed para módulo Auditoría IA refactorizado
 * Crea: 200 consultas, 120 facturas, relaciones, 10 auditorías, 50 hallazgos
 * 
 * Ejecutar: npx tsx scripts/seed-audit-refactor.ts
 * Requiere: usuarios y financiador existentes (ejecutar setup-production primero)
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { format, subDays } from 'date-fns'

const prisma = new PrismaClient()

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  console.log('🌱 Seed módulo Auditoría IA refactorizado...\n')

  // Verificar prerequisitos
  const financiador = await prisma.financiador.findFirst()
  if (!financiador) {
    console.log('⚠️ No hay financiador. Ejecutá setup-production primero.')
    process.exit(1)
  }

  const aprobador = await prisma.user.findFirst({
    where: { role: { in: ['APROBADOR', 'ADMIN'] }, isActive: true }
  })
  if (!aprobador) {
    console.log('⚠️ No hay usuario APROBADOR/ADMIN. Ejecutá setup-production primero.')
    process.exit(1)
  }

  // Limpiar datos existentes del módulo
  console.log('🧹 Limpiando datos existentes del módulo...')
  await prisma.auditFinding.deleteMany()
  await prisma.audit.deleteMany()
  await prisma.consultationInvoice.deleteMany()
  await prisma.invoice.deleteMany()
  // No borrar todas las consultas, solo las importadas
  await prisma.consulta.deleteMany({ where: { importBatchId: { not: null } } })
  await prisma.importBatch.deleteMany()

  const ESPECIALIDADES = ['clínica', 'pediatría', 'gineco', 'cardio', 'traumatología', 'psiquiatría']
  const CANALES = ['guardia', 'programada', 'telemedicina']
  const PROVEEDORES = ['Dr. García', 'Dra. López', 'Dr. Martínez', 'Dra. Rodríguez', 'Dr. Fernández', 'Dra. Sánchez']

  // Crear ImportBatch
  console.log('📦 Creando importación...')
  const batch = await prisma.importBatch.create({
    data: {
      name: `Importación demo ${format(new Date(), 'dd/MM/yyyy')}`,
      type: 'MIXTA',
      status: 'READY',
      processedAt: new Date(),
      createdByUserId: aprobador.id
    }
  })

  // Crear 200 consultas
  console.log('📋 Creando 200 consultas...')
  const consultationIds: string[] = []
  for (let i = 0; i < 200; i++) {
    const fecha = randomDate(subDays(new Date(), 30), new Date())
    const especialidad = randomElement(ESPECIALIDADES)
    const canal = randomElement(CANALES)
    const costo = randomInt(3000, 25000)
    const riskScore = randomInt(0, 100)
    const riskLevel = riskScore >= 70 ? 'alto' : riskScore >= 40 ? 'medio' : 'bajo'
    const edad = randomInt(25, 75)
    const sexo = Math.random() > 0.5 ? 'M' : 'F'

    const c = await prisma.consulta.create({
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
        providerName: randomElement(PROVEEDORES),
        importBatchId: batch.id,
        financiadorId: financiador.id,
        auditStatus: 'NOT_AUDITED'
      }
    })
    consultationIds.push(c.id)
  }
  console.log(`   ✓ ${consultationIds.length} consultas creadas`)

  // Crear 120 facturas
  console.log('🧾 Creando 120 facturas...')
  const invoiceIds: string[] = []
  for (let i = 0; i < 120; i++) {
    const issuedAt = randomDate(subDays(new Date(), 30), new Date())
    const totalAmount = randomInt(5000, 50000)

    const inv = await prisma.invoice.create({
      data: {
        invoiceNumber: `FAC-${format(new Date(), 'yyyyMM')}-${String(i + 1).padStart(4, '0')}`,
        issuedAt,
        totalAmount,
        status: randomElement(['RECEIVED', 'VALIDATED', 'PAID']),
        providerName: randomElement(PROVEEDORES),
        importBatchId: batch.id
      }
    })
    invoiceIds.push(inv.id)
  }
  console.log(`   ✓ ${invoiceIds.length} facturas creadas`)

  // Crear relaciones consulta <-> factura
  // 60% con 1 factura, 20% con 2+ facturas, 20% sin factura
  console.log('🔗 Creando relaciones consulta-factura...')
  let invoiceIndex = 0
  let relationsCreated = 0
  for (let i = 0; i < consultationIds.length && invoiceIndex < invoiceIds.length; i++) {
    const rand = Math.random()
    if (rand < 0.6 && invoiceIndex < invoiceIds.length) {
      // 1 factura
      await prisma.consultationInvoice.create({
        data: {
          consultationId: consultationIds[i],
          invoiceId: invoiceIds[invoiceIndex]
        }
      })
      invoiceIndex++
      relationsCreated++
    } else if (rand < 0.8 && invoiceIndex + 1 < invoiceIds.length) {
      // 2 facturas
      await prisma.consultationInvoice.create({
        data: {
          consultationId: consultationIds[i],
          invoiceId: invoiceIds[invoiceIndex]
        }
      })
      await prisma.consultationInvoice.create({
        data: {
          consultationId: consultationIds[i],
          invoiceId: invoiceIds[invoiceIndex + 1]
        }
      })
      invoiceIndex += 2
      relationsCreated += 2
    }
    // 20% sin factura
  }
  console.log(`   ✓ ${relationsCreated} relaciones creadas`)

  // Actualizar conteos del batch
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      recordsCountConsultations: consultationIds.length,
      recordsCountInvoices: invoiceIds.length
    }
  })

  // Crear 10 auditorías con hallazgos
  console.log('🔍 Creando 10 auditorías...')
  const AUDIT_TYPES = ['FACTURA', 'PRACTICA', 'ADMINISTRATIVA', 'CLINICA']
  const SCOPES = ['SINGLE_CONSULTATION', 'BATCH_FILTER', 'RECOMMENDED_SET']
  const CATEGORIES = ['DUPLICADO', 'INCONSISTENCIA', 'SOBREPRACTICA', 'CLINICA', 'ADMIN']
  const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH']
  const TITLES: Record<string, string[]> = {
    DUPLICADO: ['Posible factura duplicada', 'Práctica duplicada en 48h', 'Mismo concepto facturado'],
    INCONSISTENCIA: ['Monto inconsistente', 'Diagnóstico inconsistente', 'Datos no coinciden'],
    SOBREPRACTICA: ['Sobreutilización detectada', 'Frecuencia alta de consultas', 'Múltiples estudios'],
    CLINICA: ['Brecha en tratamiento', 'Medicación sin indicación', 'Estudio sin correlato'],
    ADMIN: ['Prestador sin matrícula', 'Factura sin prestación', 'Documentación incompleta']
  }
  const ACTIONS: Record<string, string> = {
    DUPLICADO: 'Solicitar acreditación al prestador o descontar del pago.',
    INCONSISTENCIA: 'Pedir documentación respaldatoria y revisar con área médica.',
    SOBREPRACTICA: 'Realizar auditoría médica del caso y contactar al prestador.',
    CLINICA: 'Solicitar historia clínica completa y evaluar con comité.',
    ADMIN: 'Verificar documentación y actualizar registros.'
  }

  let totalFindings = 0
  for (let a = 0; a < 10; a++) {
    const auditType = AUDIT_TYPES[a % AUDIT_TYPES.length]
    const auditScope = a < 4 ? 'SINGLE_CONSULTATION' : a < 7 ? 'BATCH_FILTER' : 'RECOMMENDED_SET'
    
    // Seleccionar consultas para esta auditoría
    const consultationsToAudit = auditScope === 'SINGLE_CONSULTATION'
      ? [randomElement(consultationIds)]
      : consultationIds.slice(a * 15, (a + 1) * 15)

    const audit = await prisma.audit.create({
      data: {
        auditType,
        auditScope,
        status: 'COMPLETED',
        startedAt: subDays(new Date(), randomInt(1, 20)),
        completedAt: subDays(new Date(), randomInt(0, 10)),
        createdByUserId: aprobador.id,
        consultationsAudited: consultationsToAudit.length,
        targetConsultationId: auditScope === 'SINGLE_CONSULTATION' ? consultationsToAudit[0] : null,
        filterPayload: auditScope === 'BATCH_FILTER' ? JSON.stringify({ riskLevel: 'alto' }) : null,
        recommendedPayload: auditScope === 'RECOMMENDED_SET' ? JSON.stringify({ reason: 'Top por score' }) : null
      }
    })

    // Crear hallazgos para esta auditoría (3-8 por auditoría)
    const numFindings = randomInt(3, 8)
    let highCount = 0, mediumCount = 0, lowCount = 0
    let estimatedSavings = 0

    for (let f = 0; f < numFindings; f++) {
      const category = randomElement(CATEGORIES)
      const severity = randomElement(SEVERITIES)
      const confidence = 0.6 + Math.random() * 0.35
      const consultationId = randomElement(consultationsToAudit)

      await prisma.auditFinding.create({
        data: {
          auditId: audit.id,
          consultationId,
          severity,
          category,
          title: randomElement(TITLES[category]),
          description: `Hallazgo de tipo ${category} detectado durante auditoría ${auditType}.`,
          confidence,
          suggestedAction: ACTIONS[category],
          evidence: JSON.stringify({ auditType, category }),
          status: randomElement(['OPEN', 'OPEN', 'OPEN', 'IN_REVIEW', 'RESOLVED']) // Mayoría OPEN
        }
      })

      // Actualizar consulta
      await prisma.consulta.update({
        where: { id: consultationId },
        data: { auditStatus: 'HAS_FINDINGS' }
      })

      // Contadores
      if (severity === 'HIGH') { highCount++; estimatedSavings += 15000 * confidence }
      else if (severity === 'MEDIUM') { mediumCount++; estimatedSavings += 5000 * confidence }
      else { lowCount++; estimatedSavings += 1500 * confidence }
      totalFindings++
    }

    // Actualizar auditoría con conteos
    await prisma.audit.update({
      where: { id: audit.id },
      data: {
        findingsCountTotal: numFindings,
        findingsCountHigh: highCount,
        findingsCountMedium: mediumCount,
        findingsCountLow: lowCount,
        estimatedSavings: Math.round(estimatedSavings)
      }
    })
  }
  console.log(`   ✓ 10 auditorías creadas con ${totalFindings} hallazgos`)

  console.log('\n✅ Seed completado!')
  console.log(`   📋 ${consultationIds.length} consultas`)
  console.log(`   🧾 ${invoiceIds.length} facturas`)
  console.log(`   🔗 ${relationsCreated} relaciones`)
  console.log(`   🔍 10 auditorías`)
  console.log(`   ⚠️  ${totalFindings} hallazgos`)
  console.log('\n   Podés abrir /consultas-practicas y /auditoria-ia en la app.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
