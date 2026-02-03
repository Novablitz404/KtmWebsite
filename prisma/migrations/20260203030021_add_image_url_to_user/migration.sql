/*
  Warnings:

  - A unique constraint covering the columns `[clubId,seminarId]` on the table `ClubEventParticipation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Player" DROP CONSTRAINT "Player_categoryId_fkey";

-- AlterTable
ALTER TABLE "ClubEventParticipation" ADD COLUMN     "seminarId" TEXT;

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "categoryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PromotionTestRegistration" ADD COLUMN     "age" INTEGER,
ALTER COLUMN "targetBelt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "Seminar" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "registrationDeadline" TIMESTAMP(3),
    "venue" TEXT,
    "fee" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "bannerUrl" TEXT,
    "paymentInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seminar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "seminarId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "qrCodeUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeminarRegistration" (
    "id" TEXT NOT NULL,
    "seminarId" TEXT NOT NULL,
    "playerId" TEXT,
    "playerName" TEXT NOT NULL,
    "clubName" TEXT,
    "belt" TEXT,
    "age" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "proofOfPaymentUrl" TEXT,
    "waiverSignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeminarRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Seminar_organizationId_startDate_idx" ON "Seminar"("organizationId", "startDate");

-- CreateIndex
CREATE INDEX "PaymentMethod_seminarId_idx" ON "PaymentMethod"("seminarId");

-- CreateIndex
CREATE INDEX "SeminarRegistration_seminarId_idx" ON "SeminarRegistration"("seminarId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubEventParticipation_clubId_seminarId_key" ON "ClubEventParticipation"("clubId", "seminarId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seminar" ADD CONSTRAINT "Seminar_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_seminarId_fkey" FOREIGN KEY ("seminarId") REFERENCES "Seminar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeminarRegistration" ADD CONSTRAINT "SeminarRegistration_seminarId_fkey" FOREIGN KEY ("seminarId") REFERENCES "Seminar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventParticipation" ADD CONSTRAINT "ClubEventParticipation_seminarId_fkey" FOREIGN KEY ("seminarId") REFERENCES "Seminar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
