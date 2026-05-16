-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT,
    "username" TEXT,
    "role_codes" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "http_method" TEXT,
    "http_path" TEXT,
    "status_code" INTEGER,
    "ip_address" TEXT,
    "user_agent" VARCHAR(512),
    "summary" VARCHAR(500),
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- B-tree indexes for filtered lookups
CREATE INDEX "AuditLog_created_at_id_idx" ON "AuditLog"("created_at" DESC, "id" DESC);
CREATE INDEX "AuditLog_user_id_created_at_idx" ON "AuditLog"("user_id", "created_at" DESC);
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");
CREATE INDEX "AuditLog_action_created_at_idx" ON "AuditLog"("action", "created_at" DESC);

-- BRIN index for efficient time-range scans at very large scale (PostgreSQL)
CREATE INDEX "AuditLog_created_at_brin_idx" ON "AuditLog" USING BRIN ("created_at");
