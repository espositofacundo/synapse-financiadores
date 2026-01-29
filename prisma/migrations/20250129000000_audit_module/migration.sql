-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "recordsCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "metadata" TEXT,
    "financiadorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopulationModel" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "modelType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "entitiesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopulationModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "populationModelId" TEXT NOT NULL,
    "auditType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditFinding" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "suggestedAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataSource_status_idx" ON "DataSource"("status");
CREATE INDEX "DataSource_type_idx" ON "DataSource"("type");
CREATE INDEX "DataSource_financiadorId_idx" ON "DataSource"("financiadorId");

-- CreateIndex
CREATE INDEX "PopulationModel_sourceId_idx" ON "PopulationModel"("sourceId");

-- CreateIndex
CREATE INDEX "Audit_populationModelId_idx" ON "Audit"("populationModelId");
CREATE INDEX "Audit_createdByUserId_idx" ON "Audit"("createdByUserId");
CREATE INDEX "Audit_status_idx" ON "Audit"("status");

-- CreateIndex
CREATE INDEX "AuditFinding_auditId_idx" ON "AuditFinding"("auditId");
CREATE INDEX "AuditFinding_severity_idx" ON "AuditFinding"("severity");
CREATE INDEX "AuditFinding_category_idx" ON "AuditFinding"("category");

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_financiadorId_fkey" FOREIGN KEY ("financiadorId") REFERENCES "Financiador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopulationModel" ADD CONSTRAINT "PopulationModel_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_populationModelId_fkey" FOREIGN KEY ("populationModelId") REFERENCES "PopulationModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFinding" ADD CONSTRAINT "AuditFinding_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
