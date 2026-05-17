-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetHead" (
    "id" TEXT NOT NULL,
    "budget_category_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetHead_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ProjectBudgetLine" ADD COLUMN "budget_category_id" TEXT,
ADD COLUMN "budget_head_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BudgetCategory_code_key" ON "BudgetCategory"("code");

-- CreateIndex
CREATE INDEX "BudgetHead_budget_category_id_idx" ON "BudgetHead"("budget_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetHead_budget_category_id_code_key" ON "BudgetHead"("budget_category_id", "code");

-- CreateIndex
CREATE INDEX "ProjectBudgetLine_budget_head_id_idx" ON "ProjectBudgetLine"("budget_head_id");

-- AddForeignKey
ALTER TABLE "BudgetHead" ADD CONSTRAINT "BudgetHead_budget_category_id_fkey" FOREIGN KEY ("budget_category_id") REFERENCES "BudgetCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetLine" ADD CONSTRAINT "ProjectBudgetLine_budget_category_id_fkey" FOREIGN KEY ("budget_category_id") REFERENCES "BudgetCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectBudgetLine" ADD CONSTRAINT "ProjectBudgetLine_budget_head_id_fkey" FOREIGN KEY ("budget_head_id") REFERENCES "BudgetHead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
