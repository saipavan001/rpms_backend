-- CreateTable
CREATE TABLE "ProjectFundingAgency" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "funding_agency_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFundingAgency_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ProjectBudgetLine" ADD COLUMN "funding_agency_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFundingAgency_project_id_funding_agency_id_key" ON "ProjectFundingAgency"("project_id", "funding_agency_id");

-- CreateIndex
CREATE INDEX "ProjectFundingAgency_project_id_idx" ON "ProjectFundingAgency"("project_id");

-- CreateIndex
CREATE INDEX "ProjectBudgetLine_funding_agency_id_idx" ON "ProjectBudgetLine"("funding_agency_id");

-- AddForeignKey
ALTER TABLE "ProjectFundingAgency" ADD CONSTRAINT "ProjectFundingAgency_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFundingAgency" ADD CONSTRAINT "ProjectFundingAgency_funding_agency_id_fkey" FOREIGN KEY ("funding_agency_id") REFERENCES "FundingAgency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetLine" ADD CONSTRAINT "ProjectBudgetLine_funding_agency_id_fkey" FOREIGN KEY ("funding_agency_id") REFERENCES "FundingAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing single funding agency links
INSERT INTO "ProjectFundingAgency" ("id", "project_id", "funding_agency_id")
SELECT gen_random_uuid()::text, "id", "funding_agency_id"
FROM "ResearchProject"
WHERE "funding_agency_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Assign existing budget lines to the project's primary funding agency when present
UPDATE "ProjectBudgetLine" AS pbl
SET "funding_agency_id" = rp."funding_agency_id"
FROM "ProjectBudgetYear" AS pby
JOIN "ResearchProject" AS rp ON rp."id" = pby."project_id"
WHERE pbl."budget_year_id" = pby."id"
  AND pbl."funding_agency_id" IS NULL
  AND rp."funding_agency_id" IS NOT NULL;
