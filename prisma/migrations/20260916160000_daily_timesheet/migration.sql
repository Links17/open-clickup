-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN "dailyHourCapMinutes" INTEGER NOT NULL DEFAULT 600;

-- AlterTable
ALTER TABLE "TimeEntry" ADD COLUMN "workDate" DATE;

UPDATE "TimeEntry" SET "workDate" = (("startedAt" AT TIME ZONE 'UTC')::date) WHERE "workDate" IS NULL;

-- Merge duplicate (task, user, day) rows: keep running/oldest, sum duration
WITH ranked AS (
  SELECT
    id,
    SUM(duration) OVER (PARTITION BY "taskId", "userId", "workDate") AS total_duration,
    ROW_NUMBER() OVER (
      PARTITION BY "taskId", "userId", "workDate"
      ORDER BY CASE WHEN "endedAt" IS NULL THEN 0 ELSE 1 END, "createdAt"
    ) AS rn
  FROM "TimeEntry"
)
UPDATE "TimeEntry" t
SET duration = r.total_duration
FROM ranked r
WHERE t.id = r.id AND r.rn = 1;

DELETE FROM "TimeEntry"
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "taskId", "userId", "workDate"
        ORDER BY CASE WHEN "endedAt" IS NULL THEN 0 ELSE 1 END, "createdAt"
      ) AS rn
    FROM "TimeEntry"
  ) d
  WHERE d.rn > 1
);

ALTER TABLE "TimeEntry" ALTER COLUMN "workDate" SET NOT NULL;

CREATE UNIQUE INDEX "TimeEntry_taskId_userId_workDate_key" ON "TimeEntry"("taskId", "userId", "workDate");

CREATE INDEX "TimeEntry_userId_workDate_idx" ON "TimeEntry"("userId", "workDate");
