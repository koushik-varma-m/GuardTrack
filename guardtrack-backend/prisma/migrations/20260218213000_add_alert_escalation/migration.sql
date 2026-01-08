-- Add escalation fields to Alert
ALTER TABLE "Alert"
  ADD COLUMN "escalateRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "escalateNote" TEXT,
  ADD COLUMN "escalateBy" TEXT,
  ADD COLUMN "escalatedAt" TIMESTAMP(3);
