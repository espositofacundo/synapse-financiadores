-- Refactor Auditoría IA: nuevos modelos y campos

-- Agregar campos a Consulta
ALTER TABLE "Consulta" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "Consulta" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'ARS';
ALTER TABLE "Consulta" ADD COLUMN IF NOT EXISTS "providerName" TEXT;
ALTER TABLE "Consulta" ADD COLUMN IF NOT EXISTS "auditStatus" TEXT NOT NULL DEFAULT 'NOT_AUDITED';
ALTER TABLE "Consulta" ADD COLUMN IF NOT EXISTS "importBatchId" TEXT;
ALTER TABLE "Consulta" ALTER COLUMN "prestadorId" DROP NOT NULL;

-- CreateTable ImportBatch
CREATE TABLE IF NOT EXISTS "ImportBatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "recordsCountConsultations" INTEGER NOT NULL DEFAULT 0,
    "recordsCountInvoices" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable Invoice
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "providerName" TEXT,
    "payerName" TEXT,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable ConsultationInvoice
CREATE TABLE IF NOT EXISTS "ConsultationInvoice" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConsultationInvoice_pkey" PRIMARY KEY ("id")
);

-- Agregar campos a Audit (si existe, drop y recreate; si no, create)
-- Primero backup de datos si hay
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Audit') THEN
        -- Agregar nuevos campos
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "auditScope" TEXT NOT NULL DEFAULT 'BATCH_FILTER';
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "targetConsultationId" TEXT;
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "filterPayload" TEXT;
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "recommendedPayload" TEXT;
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "findingsCountTotal" INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "findingsCountHigh" INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "findingsCountMedium" INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "findingsCountLow" INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "estimatedSavings" DOUBLE PRECISION NOT NULL DEFAULT 0;
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "consultationsAudited" INTEGER NOT NULL DEFAULT 0;
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
        ALTER TABLE "Audit" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        -- Hacer populationModelId nullable
        ALTER TABLE "Audit" ALTER COLUMN "populationModelId" DROP NOT NULL;
    END IF;
END $$;

-- Agregar campos a AuditFinding
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'AuditFinding') THEN
        ALTER TABLE "AuditFinding" ADD COLUMN IF NOT EXISTS "consultationId" TEXT;
        ALTER TABLE "AuditFinding" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;
        ALTER TABLE "AuditFinding" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT 'Hallazgo';
        ALTER TABLE "AuditFinding" ADD COLUMN IF NOT EXISTS "evidence" TEXT;
        ALTER TABLE "AuditFinding" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'OPEN';
        ALTER TABLE "AuditFinding" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
        ALTER TABLE "AuditFinding" ADD COLUMN IF NOT EXISTS "resolvedByUserId" TEXT;
        ALTER TABLE "AuditFinding" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Consulta_importBatchId_idx" ON "Consulta"("importBatchId");
CREATE INDEX IF NOT EXISTS "Consulta_auditStatus_idx" ON "Consulta"("auditStatus");
CREATE INDEX IF NOT EXISTS "Consulta_fecha_idx" ON "Consulta"("fecha");

CREATE INDEX IF NOT EXISTS "ImportBatch_status_idx" ON "ImportBatch"("status");
CREATE INDEX IF NOT EXISTS "ImportBatch_type_idx" ON "ImportBatch"("type");
CREATE INDEX IF NOT EXISTS "ImportBatch_createdByUserId_idx" ON "ImportBatch"("createdByUserId");

CREATE INDEX IF NOT EXISTS "Invoice_importBatchId_idx" ON "Invoice"("importBatchId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "Invoice_issuedAt_idx" ON "Invoice"("issuedAt");

CREATE INDEX IF NOT EXISTS "ConsultationInvoice_consultationId_idx" ON "ConsultationInvoice"("consultationId");
CREATE INDEX IF NOT EXISTS "ConsultationInvoice_invoiceId_idx" ON "ConsultationInvoice"("invoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "ConsultationInvoice_consultationId_invoiceId_key" ON "ConsultationInvoice"("consultationId", "invoiceId");

CREATE INDEX IF NOT EXISTS "Audit_auditScope_idx" ON "Audit"("auditScope");
CREATE INDEX IF NOT EXISTS "Audit_auditType_idx" ON "Audit"("auditType");

CREATE INDEX IF NOT EXISTS "AuditFinding_consultationId_idx" ON "AuditFinding"("consultationId");
CREATE INDEX IF NOT EXISTS "AuditFinding_invoiceId_idx" ON "AuditFinding"("invoiceId");
CREATE INDEX IF NOT EXISTS "AuditFinding_status_idx" ON "AuditFinding"("status");

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConsultationInvoice" ADD CONSTRAINT "ConsultationInvoice_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consulta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsultationInvoice" ADD CONSTRAINT "ConsultationInvoice_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Audit" ADD CONSTRAINT "Audit_targetConsultationId_fkey" FOREIGN KEY ("targetConsultationId") REFERENCES "Consulta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consulta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
