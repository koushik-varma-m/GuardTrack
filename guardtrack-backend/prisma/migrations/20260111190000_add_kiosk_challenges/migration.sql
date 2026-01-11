-- CreateTable
CREATE TABLE "KioskChallenge" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KioskChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KioskChallenge_nonce_key" ON "KioskChallenge"("nonce");

-- CreateIndex
CREATE INDEX "KioskChallenge_checkpointId_expiresAt_idx" ON "KioskChallenge"("checkpointId", "expiresAt");

-- AddForeignKey
ALTER TABLE "KioskChallenge" ADD CONSTRAINT "KioskChallenge_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "Checkpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

