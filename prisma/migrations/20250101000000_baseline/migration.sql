-- CreateTable
CREATE TABLE "Financiador" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Financiador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Afiliado" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "edad" INTEGER NOT NULL,
    "financiadorId" TEXT NOT NULL,

    CONSTRAINT "Afiliado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "tipoDoc" TEXT NOT NULL,
    "nroDoc" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "fechaNac" TIMESTAMP(3) NOT NULL,
    "sexo" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "localidad" TEXT,
    "provincia" TEXT,
    "canalPreferido" TEXT,
    "financiadorId" TEXT NOT NULL,
    "planId" TEXT,
    "planNombre" TEXT,
    "nroAfiliado" TEXT NOT NULL,
    "estadoCobertura" TEXT NOT NULL DEFAULT 'activa',
    "fechaAlta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaBaja" TIMESTAMP(3),
    "ownerId" TEXT,
    "ownerNombre" TEXT,
    "notas" TEXT,
    "tags" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'bajo',
    "riskReasons" TEXT,
    "lastRiskCalculationAt" TIMESTAMP(3),
    "riskVersion" TEXT,
    "esCronico" BOOLEAN NOT NULL DEFAULT false,
    "patologias" TEXT,
    "consentimiento" BOOLEAN NOT NULL DEFAULT false,
    "privacidad" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientRiskHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "riskReasons" TEXT,
    "riskVersion" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientRiskHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientQuote" (
    "id" TEXT NOT NULL,
    "inputs" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "expectedCost12m" DOUBLE PRECISION NOT NULL,
    "expectedCostP95" DOUBLE PRECISION NOT NULL,
    "priceCategory" TEXT NOT NULL,
    "riskFactor" DOUBLE PRECISION NOT NULL,
    "confidence" TEXT NOT NULL,
    "reasons" TEXT NOT NULL,
    "suggestedPriceMonthly" DOUBLE PRECISION,
    "priceRangeMin" DOUBLE PRECISION,
    "priceRangeMax" DOUBLE PRECISION,
    "pricingBreakdown" TEXT,
    "pricingConfig" TEXT,
    "pricingFlags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "approvedByUserId" TEXT,
    "createdByUserId" TEXT,
    "modelVersion" TEXT NOT NULL DEFAULT '1.0',
    "patientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingCase" (
    "id" TEXT NOT NULL,
    "financiadorId" TEXT,
    "patientId" TEXT,
    "quoteId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE_COTIZACION',
    "displayName" TEXT NOT NULL,
    "riskScore" INTEGER,
    "riskLevel" TEXT,
    "suggestedPriceMonthly" DOUBLE PRECISION,
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "currentStatusEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingCaseStatusHistory" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "durationSeconds" INTEGER,

    CONSTRAINT "OnboardingCaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingCaseEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "editedFields" TEXT,
    "reason" TEXT,
    "performedByUserId" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingCaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "financiadorId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteApproval" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "decidedByUserId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prestador" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,

    CONSTRAINT "Prestador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "especialidad" TEXT NOT NULL,
    "canal" TEXT NOT NULL,
    "costo" DOUBLE PRECISION NOT NULL,
    "duracion" INTEGER NOT NULL,
    "efectiva" BOOLEAN NOT NULL,
    "motivoNoEfectiva" TEXT,
    "diagnostico" TEXT,
    "motivoConsulta" TEXT,
    "deriva" BOOLEAN NOT NULL,
    "tipoDerivacion" TEXT,
    "prestadorDerivado" TEXT,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "riskLevel" TEXT NOT NULL DEFAULT 'bajo',
    "triggeredRules" TEXT,
    "trazabilidad" TEXT,
    "resumenClinico" TEXT,
    "afiliadoId" TEXT,
    "patientId" TEXT,
    "prestadorId" TEXT NOT NULL,
    "financiadorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Afiliado_dni_key" ON "Afiliado"("dni");

-- CreateIndex
CREATE INDEX "Patient_financiadorId_estadoCobertura_idx" ON "Patient"("financiadorId", "estadoCobertura");

-- CreateIndex
CREATE INDEX "Patient_riskLevel_idx" ON "Patient"("riskLevel");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_financiadorId_tipoDoc_nroDoc_key" ON "Patient"("financiadorId", "tipoDoc", "nroDoc");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_financiadorId_nroAfiliado_key" ON "Patient"("financiadorId", "nroAfiliado");

-- CreateIndex
CREATE INDEX "PatientRiskHistory_patientId_calculatedAt_idx" ON "PatientRiskHistory"("patientId", "calculatedAt");

-- CreateIndex
CREATE INDEX "PatientQuote_patientId_idx" ON "PatientQuote"("patientId");

-- CreateIndex
CREATE INDEX "PatientQuote_riskLevel_idx" ON "PatientQuote"("riskLevel");

-- CreateIndex
CREATE INDEX "PatientQuote_status_idx" ON "PatientQuote"("status");

-- CreateIndex
CREATE INDEX "PatientQuote_createdByUserId_idx" ON "PatientQuote"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingCase_quoteId_key" ON "OnboardingCase"("quoteId");

-- CreateIndex
CREATE INDEX "OnboardingCase_status_idx" ON "OnboardingCase"("status");

-- CreateIndex
CREATE INDEX "OnboardingCase_financiadorId_idx" ON "OnboardingCase"("financiadorId");

-- CreateIndex
CREATE INDEX "OnboardingCase_createdByUserId_idx" ON "OnboardingCase"("createdByUserId");

-- CreateIndex
CREATE INDEX "OnboardingCase_assignedToUserId_idx" ON "OnboardingCase"("assignedToUserId");

-- CreateIndex
CREATE INDEX "OnboardingCase_quoteId_idx" ON "OnboardingCase"("quoteId");

-- CreateIndex
CREATE INDEX "OnboardingCase_patientId_idx" ON "OnboardingCase"("patientId");

-- CreateIndex
CREATE INDEX "OnboardingCaseStatusHistory_caseId_idx" ON "OnboardingCaseStatusHistory"("caseId");

-- CreateIndex
CREATE INDEX "OnboardingCaseStatusHistory_changedByUserId_idx" ON "OnboardingCaseStatusHistory"("changedByUserId");

-- CreateIndex
CREATE INDEX "OnboardingCaseStatusHistory_changedAt_idx" ON "OnboardingCaseStatusHistory"("changedAt");

-- CreateIndex
CREATE INDEX "OnboardingCaseStatusHistory_toStatus_idx" ON "OnboardingCaseStatusHistory"("toStatus");

-- CreateIndex
CREATE INDEX "OnboardingCaseEvent_caseId_idx" ON "OnboardingCaseEvent"("caseId");

-- CreateIndex
CREATE INDEX "OnboardingCaseEvent_performedByUserId_idx" ON "OnboardingCaseEvent"("performedByUserId");

-- CreateIndex
CREATE INDEX "OnboardingCaseEvent_performedAt_idx" ON "OnboardingCaseEvent"("performedAt");

-- CreateIndex
CREATE INDEX "OnboardingCaseEvent_eventType_idx" ON "OnboardingCaseEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_financiadorId_idx" ON "User"("financiadorId");

-- CreateIndex
CREATE INDEX "QuoteApproval_quoteId_idx" ON "QuoteApproval"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteApproval_decidedByUserId_idx" ON "QuoteApproval"("decidedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Prestador_matricula_key" ON "Prestador"("matricula");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_financiadorId_fkey" FOREIGN KEY ("financiadorId") REFERENCES "Financiador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientRiskHistory" ADD CONSTRAINT "PatientRiskHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientQuote" ADD CONSTRAINT "PatientQuote_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientQuote" ADD CONSTRAINT "PatientQuote_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientQuote" ADD CONSTRAINT "PatientQuote_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingCase" ADD CONSTRAINT "OnboardingCase_financiadorId_fkey" FOREIGN KEY ("financiadorId") REFERENCES "Financiador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingCase" ADD CONSTRAINT "OnboardingCase_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingCase" ADD CONSTRAINT "OnboardingCase_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PatientQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingCase" ADD CONSTRAINT "OnboardingCase_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingCase" ADD CONSTRAINT "OnboardingCase_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingCaseStatusHistory" ADD CONSTRAINT "OnboardingCaseStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "OnboardingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingCaseStatusHistory" ADD CONSTRAINT "OnboardingCaseStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingCaseEvent" ADD CONSTRAINT "OnboardingCaseEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "OnboardingCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingCaseEvent" ADD CONSTRAINT "OnboardingCaseEvent_performedByUserId_fkey" FOREIGN KEY ("performedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_financiadorId_fkey" FOREIGN KEY ("financiadorId") REFERENCES "Financiador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteApproval" ADD CONSTRAINT "QuoteApproval_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "PatientQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteApproval" ADD CONSTRAINT "QuoteApproval_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_afiliadoId_fkey" FOREIGN KEY ("afiliadoId") REFERENCES "Afiliado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_prestadorId_fkey" FOREIGN KEY ("prestadorId") REFERENCES "Prestador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_financiadorId_fkey" FOREIGN KEY ("financiadorId") REFERENCES "Financiador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

