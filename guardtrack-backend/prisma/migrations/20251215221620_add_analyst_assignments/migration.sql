-- CreateTable
CREATE TABLE "AnalystAssignment" (
    "id" TEXT NOT NULL,
    "analystId" TEXT NOT NULL,
    "premiseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalystAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalystAssignment_analystId_premiseId_key" ON "AnalystAssignment"("analystId", "premiseId");

-- AddForeignKey
ALTER TABLE "AnalystAssignment" ADD CONSTRAINT "AnalystAssignment_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystAssignment" ADD CONSTRAINT "AnalystAssignment_premiseId_fkey" FOREIGN KEY ("premiseId") REFERENCES "Premise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
