-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "poomsaeFormat" TEXT NOT NULL DEFAULT 'SCORED';

-- AlterTable
ALTER TABLE "PoomsaeMatch" ADD COLUMN     "nextMatchSlot" TEXT;
