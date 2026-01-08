-- Add fields to support override tracking on check-ins
ALTER TABLE "CheckIn"
  ADD COLUMN IF NOT EXISTS "overrideStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "overrideNote" TEXT,
  ADD COLUMN IF NOT EXISTS "overriddenBy" TEXT,
  ADD COLUMN IF NOT EXISTS "overriddenAt" TIMESTAMP(3);
