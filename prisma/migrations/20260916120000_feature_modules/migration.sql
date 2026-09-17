-- CreateTable
CREATE TABLE "FeatureModule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureModule_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "moduleId" TEXT;

-- CreateIndex
CREATE INDEX "FeatureModule_workspaceId_idx" ON "FeatureModule"("workspaceId");

-- CreateIndex
CREATE INDEX "FeatureModule_parentId_idx" ON "FeatureModule"("parentId");

-- CreateIndex
CREATE INDEX "Task_moduleId_idx" ON "Task"("moduleId");

-- AddForeignKey
ALTER TABLE "FeatureModule" ADD CONSTRAINT "FeatureModule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureModule" ADD CONSTRAINT "FeatureModule_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "FeatureModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "FeatureModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
