-- CreateTable
CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ctaLabel" TEXT,
    "linkUrl" TEXT,
    "imageUrl" TEXT,
    "imagePosition" TEXT NOT NULL DEFAULT 'center',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Advertisement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Advertisement_isActive_sortOrder_idx" ON "Advertisement"("isActive", "sortOrder");

-- The app reads ads only through the API (service role); keep the table closed to direct client access.
ALTER TABLE "Advertisement" ENABLE ROW LEVEL SECURITY;
