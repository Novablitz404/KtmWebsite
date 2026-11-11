-- AlterTable
ALTER TABLE "Match" ADD COLUMN "centralRef" TEXT;

-- AlterTable
ALTER TABLE "PoomsaeMatch" ADD COLUMN "centralRef" TEXT;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "withdrawnReason" TEXT,
ADD COLUMN "withdrawnAt" TIMESTAMP(3);
