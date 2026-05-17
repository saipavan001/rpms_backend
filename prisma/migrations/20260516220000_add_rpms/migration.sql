-- CreateEnum
CREATE TYPE "ResearchProjectStatus" AS ENUM ('DRAFT', 'REVISION_REQUESTED', 'SUBMITTED_TO_COMMITTEE', 'UNDER_COMMITTEE_REVIEW', 'COMMITTEE_APPROVED', 'COMMITTEE_REJECTED');
CREATE TYPE "CommitteeWorkflowMode" AS ENUM ('PARALLEL_THEN_CHAIR');
CREATE TYPE "ProjectTeamRole" AS ENUM ('PI', 'CO_PI', 'RESEARCH_STAFF', 'SCHOLAR');
CREATE TYPE "ClearanceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ProjectType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FundingAgency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FundingAgency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommitteeRole" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommitteeRole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalCommittee" (
    "id" TEXT NOT NULL,
    "ou_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "workflow_mode" "CommitteeWorkflowMode" NOT NULL DEFAULT 'PARALLEL_THEN_CHAIR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApprovalCommittee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalCommitteeMember" (
    "id" TEXT NOT NULL,
    "committee_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "committee_role_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "review_sequence" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApprovalCommitteeMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ResearchProject" (
    "id" TEXT NOT NULL,
    "project_code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "project_type_id" TEXT,
    "department_ou_id" TEXT NOT NULL,
    "abstract" TEXT,
    "keywords" TEXT,
    "tentative_start_date" DATE,
    "tentative_end_date" DATE,
    "funding_agency_id" TEXT,
    "funding_type" TEXT,
    "sponsorship_details" TEXT,
    "grant_reference" TEXT,
    "pi_user_id" TEXT NOT NULL,
    "pi_employee_id" TEXT,
    "status" "ResearchProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "include_budget_estimate" BOOLEAN NOT NULL DEFAULT false,
    "section_basic_complete" BOOLEAN NOT NULL DEFAULT false,
    "section_infrastructure_complete" BOOLEAN NOT NULL DEFAULT false,
    "section_clearance_complete" BOOLEAN NOT NULL DEFAULT false,
    "section_budget_complete" BOOLEAN NOT NULL DEFAULT false,
    "infrastructure_required" BOOLEAN NOT NULL DEFAULT false,
    "laboratory_requirements" TEXT,
    "equipment_requirements" TEXT,
    "workspace_requirements" TEXT,
    "computing_requirements" TEXT,
    "university_support_notes" TEXT,
    "approval_committee_id" TEXT,
    "submitted_at" TIMESTAMP(3),
    "revision_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ResearchProject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectTeamMember" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "role" "ProjectTeamRole" NOT NULL,
    "employee_id" TEXT,
    "member_name" TEXT,
    "designation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectClearance" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "clearance_type" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "committee_name" TEXT,
    "application_number" TEXT,
    "status" "ClearanceStatus" NOT NULL DEFAULT 'DRAFT',
    "approval_date" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProjectClearance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectBudgetYear" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "year_index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    CONSTRAINT "ProjectBudgetYear_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectBudgetLine" (
    "id" TEXT NOT NULL,
    "budget_year_id" TEXT NOT NULL,
    "budget_category" TEXT NOT NULL,
    "budget_head" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "justification" TEXT,
    CONSTRAINT "ProjectBudgetLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectStatusHistory" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "from_status" "ResearchProjectStatus",
    "to_status" "ResearchProjectStatus" NOT NULL,
    "actor_user_id" TEXT,
    "comments" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectType_code_key" ON "ProjectType"("code");
CREATE UNIQUE INDEX "FundingAgency_code_key" ON "FundingAgency"("code");
CREATE UNIQUE INDEX "CommitteeRole_code_key" ON "CommitteeRole"("code");
CREATE UNIQUE INDEX "ApprovalCommittee_ou_id_key" ON "ApprovalCommittee"("ou_id");
CREATE INDEX "ApprovalCommittee_ou_id_idx" ON "ApprovalCommittee"("ou_id");
CREATE UNIQUE INDEX "ApprovalCommitteeMember_committee_id_user_id_key" ON "ApprovalCommitteeMember"("committee_id", "user_id");
CREATE INDEX "ApprovalCommitteeMember_user_id_idx" ON "ApprovalCommitteeMember"("user_id");
CREATE UNIQUE INDEX "ResearchProject_project_code_key" ON "ResearchProject"("project_code");
CREATE INDEX "ResearchProject_status_idx" ON "ResearchProject"("status");
CREATE INDEX "ResearchProject_pi_user_id_idx" ON "ResearchProject"("pi_user_id");
CREATE INDEX "ResearchProject_department_ou_id_idx" ON "ResearchProject"("department_ou_id");
CREATE INDEX "ProjectTeamMember_project_id_idx" ON "ProjectTeamMember"("project_id");
CREATE UNIQUE INDEX "ProjectClearance_project_id_clearance_type_key" ON "ProjectClearance"("project_id", "clearance_type");
CREATE UNIQUE INDEX "ProjectBudgetYear_project_id_year_index_key" ON "ProjectBudgetYear"("project_id", "year_index");
CREATE INDEX "ProjectStatusHistory_project_id_created_at_idx" ON "ProjectStatusHistory"("project_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "ApprovalCommittee" ADD CONSTRAINT "ApprovalCommittee_ou_id_fkey" FOREIGN KEY ("ou_id") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalCommitteeMember" ADD CONSTRAINT "ApprovalCommitteeMember_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "ApprovalCommittee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApprovalCommitteeMember" ADD CONSTRAINT "ApprovalCommitteeMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalCommitteeMember" ADD CONSTRAINT "ApprovalCommitteeMember_committee_role_id_fkey" FOREIGN KEY ("committee_role_id") REFERENCES "CommitteeRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_project_type_id_fkey" FOREIGN KEY ("project_type_id") REFERENCES "ProjectType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_department_ou_id_fkey" FOREIGN KEY ("department_ou_id") REFERENCES "OrganizationUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_funding_agency_id_fkey" FOREIGN KEY ("funding_agency_id") REFERENCES "FundingAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ResearchProject" ADD CONSTRAINT "ResearchProject_approval_committee_id_fkey" FOREIGN KEY ("approval_committee_id") REFERENCES "ApprovalCommittee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTeamMember" ADD CONSTRAINT "ProjectTeamMember_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTeamMember" ADD CONSTRAINT "ProjectTeamMember_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectClearance" ADD CONSTRAINT "ProjectClearance_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBudgetYear" ADD CONSTRAINT "ProjectBudgetYear_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBudgetLine" ADD CONSTRAINT "ProjectBudgetLine_budget_year_id_fkey" FOREIGN KEY ("budget_year_id") REFERENCES "ProjectBudgetYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectStatusHistory" ADD CONSTRAINT "ProjectStatusHistory_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "ResearchProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
