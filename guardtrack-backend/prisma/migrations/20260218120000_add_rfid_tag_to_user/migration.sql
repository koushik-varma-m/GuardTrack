-- Add RFID tag support for guards
ALTER TABLE "User" ADD COLUMN "rfidTag" TEXT;
CREATE UNIQUE INDEX "User_rfidTag_key" ON "User"("rfidTag");
