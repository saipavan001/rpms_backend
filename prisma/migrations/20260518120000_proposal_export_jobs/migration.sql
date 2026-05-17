-- CreateEnum
CREATE TYPE "ProposalExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ProposalExportFormat" AS ENUM ('XLSX', 'JSON');

-- CreateEnum
CREATE TYPE "ProposalExportScope" AS ENUM ('ALL', 'SELECTED', 'SINGLE');

-- CreateTable
CREATE TABLE "ProposalExportJob" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ProposalExportStatus" NOT NULL DEFAULT 'PENDING',
    "format" "ProposalExportFormat" NOT NULL DEFAULT 'XLSX',
    "scope" "ProposalExportScope" NOT NULL,
    "project_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "file_name" TEXT,
    "file_path" TEXT,
    "file_size" INTEGER,
    "error_message" TEXT,
    "bull_job_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "ProposalExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProposalExportJob_user_id_created_at_idx" ON "ProposalExportJob"("user_id", "created_at" DESC);
