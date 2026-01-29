/**
 * Seed del módulo Auditoría IA / Fuentes de Datos (POC).
 * Ejecutar: npx tsx scripts/seed-audit-module.ts
 * Requiere: DB con usuarios y financiador (ej. después de setup-production o db:seed).
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { runMockAudit } from '../lib/audit-ia'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seed módulo Auditoría IA / Fuentes de datos...\n')

  const financiador = await prisma.financiador.findFirst()
  if (!financiador) {
    console.log('⚠️ No hay financiador. Ejecutá setup-production o db:seed primero.')
    process.exit(1)
  }

  const aprobador = await prisma.user.findFirst({
    where: { role: { in: ['APROBADOR', 'ADMIN'] }, isActive: true }
  })
  if (!aprobador) {
    console.log('⚠️ No hay usuario APROBADOR/ADMIN. Ejecutá setup-production primero.')
    process.exit(1)
  }

  await prisma.auditFinding.deleteMany()
  await prisma.audit.deleteMany()
  await prisma.populationModel.deleteMany()
  await prisma.dataSource.deleteMany()

  const source1 = await prisma.dataSource.create({
    data: {
      name: 'Export facturación enero 2026',
      type: 'FACTURAS',
      status: 'READY',
      recordsCount: 1250,
      processedAt: new Date(),
      metadata: JSON.stringify({ mock: true, demo: true }),
      financiadorId: financiador.id
    }
  })
  const source2 = await prisma.dataSource.create({
    data: {
      name: 'Historia clínica - muestra Q1',
      type: 'HISTORIA_CLINICA',
      status: 'READY',
      recordsCount: 480,
      processedAt: new Date(),
      metadata: JSON.stringify({ mock: true, demo: true }),
      financiadorId: financiador.id
    }
  })
  const source3 = await prisma.dataSource.create({
    data: {
      name: 'Prácticas prestadores - marzo 2026',
      type: 'PRACTICAS',
      status: 'READY',
      recordsCount: 890,
      processedAt: new Date(),
      metadata: JSON.stringify({ mock: true, demo: true }),
      financiadorId: financiador.id
    }
  })
  console.log('✅ Fuentes de datos creadas: 3')

  const model1 = await prisma.populationModel.create({
    data: {
      sourceId: source1.id,
      modelType: 'FACTURAS',
      status: 'READY',
      entitiesCount: source1.recordsCount
    }
  })
  const model2 = await prisma.populationModel.create({
    data: {
      sourceId: source2.id,
      modelType: 'POBLACION',
      status: 'READY',
      entitiesCount: source2.recordsCount
    }
  })
  const model3 = await prisma.populationModel.create({
    data: {
      sourceId: source3.id,
      modelType: 'FACTURAS',
      status: 'READY',
      entitiesCount: source3.recordsCount
    }
  })
  console.log('✅ Modelos de población creados: 3')

  const auditTypes = ['FACTURA', 'PRACTICA', 'ADMINISTRATIVA', 'CLINICA'] as const
  const auditsCreated = []

  for (let i = 0; i < 4; i++) {
    const model = [model1, model2, model3][i % 3]
    const auditType = auditTypes[i % auditTypes.length]
    const audit = await prisma.audit.create({
      data: {
        populationModelId: model.id,
        auditType,
        status: 'COMPLETED',
        createdByUserId: aprobador.id,
        completedAt: new Date()
      }
    })
    const mockFindings = runMockAudit(auditType, model.id, model.entitiesCount)
    for (const f of mockFindings) {
      await prisma.auditFinding.create({
        data: {
          auditId: audit.id,
          severity: f.severity,
          category: f.category,
          description: f.description,
          confidence: f.confidence,
          suggestedAction: f.suggestedAction
        }
      })
    }
    auditsCreated.push({ audit, count: mockFindings.length })
  }
  console.log('✅ Auditorías con hallazgos creadas:', auditsCreated.length)
  console.log('\n✅ Seed módulo Auditoría IA completado.')
  console.log('   Podés abrir /fuentes y /auditoria-ia en la app.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
