-- CreateTable
CREATE TABLE "WorkspaceModuleStatus" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#87909e',
    "type" "StatusType" NOT NULL DEFAULT 'NOT_STARTED',
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "WorkspaceModuleStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceModuleStatus_workspaceId_idx" ON "WorkspaceModuleStatus"("workspaceId");

-- AddForeignKey
ALTER TABLE "WorkspaceModuleStatus" ADD CONSTRAINT "WorkspaceModuleStatus_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed the default five statuses for every existing workspace
INSERT INTO "WorkspaceModuleStatus" ("id", "workspaceId", "name", "color", "type", "position")
SELECT 'ms1_' || id, id, '规划', '#87909e', 'NOT_STARTED'::"StatusType", 0 FROM "Workspace"
UNION ALL
SELECT 'ms2_' || id, id, '预研', '#a875ff', 'ACTIVE'::"StatusType", 1 FROM "Workspace"
UNION ALL
SELECT 'ms3_' || id, id, '进行', '#5b9fff', 'ACTIVE'::"StatusType", 2 FROM "Workspace"
UNION ALL
SELECT 'ms4_' || id, id, '交付', '#6bc950', 'DONE'::"StatusType", 3 FROM "Workspace"
UNION ALL
SELECT 'ms5_' || id, id, '取消', '#f50000', 'CLOSED'::"StatusType", 4 FROM "Workspace";

-- AlterTable
ALTER TABLE "FeatureModule" ADD COLUMN "statusId" TEXT;

UPDATE "FeatureModule" SET "statusId" = 'ms1_' || "workspaceId";

ALTER TABLE "FeatureModule" ALTER COLUMN "statusId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "FeatureModule_statusId_idx" ON "FeatureModule"("statusId");

-- AddForeignKey
ALTER TABLE "FeatureModule" ADD CONSTRAINT "FeatureModule_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "WorkspaceModuleStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
