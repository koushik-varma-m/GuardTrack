-- Add status column if missing, then enforce NOT NULL
ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "status" TEXT;
UPDATE "CheckIn" SET "status" = COALESCE("status", 'GREEN');
ALTER TABLE "CheckIn" ALTER COLUMN "status" SET NOT NULL;
