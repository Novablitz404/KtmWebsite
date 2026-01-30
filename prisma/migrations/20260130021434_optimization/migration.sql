-- CreateTable
CREATE TABLE "CoOrganizerInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoOrganizerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_OrganizationCoOrganizers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "CoOrganizerInvite_email_idx" ON "CoOrganizerInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CoOrganizerInvite_email_organizationId_key" ON "CoOrganizerInvite"("email", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "_OrganizationCoOrganizers_AB_unique" ON "_OrganizationCoOrganizers"("A", "B");

-- CreateIndex
CREATE INDEX "_OrganizationCoOrganizers_B_index" ON "_OrganizationCoOrganizers"("B");

-- AddForeignKey
ALTER TABLE "CoOrganizerInvite" ADD CONSTRAINT "CoOrganizerInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationCoOrganizers" ADD CONSTRAINT "_OrganizationCoOrganizers_A_fkey" FOREIGN KEY ("A") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_OrganizationCoOrganizers" ADD CONSTRAINT "_OrganizationCoOrganizers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
