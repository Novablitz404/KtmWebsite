-- CreateTable
CREATE TABLE "GuidelineTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuidelineTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minAge" INTEGER NOT NULL,
    "maxAge" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "minWeight" DOUBLE PRECISION NOT NULL,
    "maxWeight" DOUBLE PRECISION NOT NULL,
    "minHeight" DOUBLE PRECISION DEFAULT 0,
    "maxHeight" DOUBLE PRECISION DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL DEFAULT 'KYORUGI',
    "subtype" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "poomsaeForms" TEXT,
    "belt" TEXT,
    "divisionId" TEXT NOT NULL,

    CONSTRAINT "WeightCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizerId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venue" TEXT,
    "registrationStart" TIMESTAMP(3),
    "registrationEnd" TIMESTAMP(3),
    "guidelinePdfUrl" TEXT,
    "headerImageUrl" TEXT,
    "guidelinesText" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "tier" TEXT NOT NULL DEFAULT 'K-2',
    "guidelineTemplateId" TEXT,
    "match_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'KYORUGI',
    "subtype" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "poomsaeForms" TEXT,
    "court" TEXT,
    "skillLevel" TEXT DEFAULT 'Novice',
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "minWeight" DOUBLE PRECISION,
    "maxWeight" DOUBLE PRECISION,
    "minHeight" DOUBLE PRECISION,
    "maxHeight" DOUBLE PRECISION,
    "gender" TEXT,
    "belt" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ATHLETE',
    "name" TEXT,
    "birthDate" TIMESTAMP(3),
    "belt" TEXT,
    "gender" TEXT,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "clubName" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "gender" TEXT NOT NULL DEFAULT 'Male',
    "weight" DOUBLE PRECISION,
    "belt" TEXT DEFAULT 'Black',
    "height" DOUBLE PRECISION,
    "division" TEXT,
    "registrationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "skillLevel" TEXT DEFAULT 'Novice',
    "medal" TEXT,
    "teamId" TEXT,
    "poomsaeType" TEXT,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT,
    "clubId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "masterId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "organizationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "establishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "chairman" TEXT,
    "viceChairman" TEXT,
    "address" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "parentOrganizationId" TEXT,
    "parentOrganizationStatus" TEXT DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionTest" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "testDate" TIMESTAMP(3) NOT NULL,
    "registrationDeadline" TIMESTAMP(3),
    "venue" TEXT,
    "fee" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "visibility" TEXT NOT NULL DEFAULT 'PRIVATE',
    "bannerUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionTestRegistration" (
    "id" TEXT NOT NULL,
    "promotionTestId" TEXT NOT NULL,
    "playerId" TEXT,
    "playerName" TEXT NOT NULL,
    "clubName" TEXT,
    "currentBelt" TEXT NOT NULL,
    "targetBelt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionTestRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" SERIAL NOT NULL,
    "category" TEXT,
    "categoryRefId" TEXT,
    "round" INTEGER NOT NULL,
    "player1" TEXT NOT NULL,
    "player2" TEXT NOT NULL,
    "winner" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "nextMatchId" INTEGER,
    "nextMatchSlot" TEXT,
    "court" TEXT NOT NULL DEFAULT 'Unassigned',
    "r1_blue_score" INTEGER NOT NULL DEFAULT 0,
    "r1_red_score" INTEGER NOT NULL DEFAULT 0,
    "r2_blue_score" INTEGER NOT NULL DEFAULT 0,
    "r2_red_score" INTEGER NOT NULL DEFAULT 0,
    "r3_blue_score" INTEGER NOT NULL DEFAULT 0,
    "r3_red_score" INTEGER NOT NULL DEFAULT 0,
    "total_blue_score" INTEGER NOT NULL DEFAULT 0,
    "total_red_score" INTEGER NOT NULL DEFAULT 0,
    "blue_gam_jeom" INTEGER NOT NULL DEFAULT 0,
    "red_gam_jeom" INTEGER NOT NULL DEFAULT 0,
    "blue_rounds_won" INTEGER NOT NULL DEFAULT 0,
    "red_rounds_won" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoomsaeMatch" (
    "id" SERIAL NOT NULL,
    "category" TEXT,
    "categoryRefId" TEXT,
    "round" INTEGER NOT NULL,
    "matchId" INTEGER,
    "nextMatchId" INTEGER,
    "targetRank" INTEGER,
    "performanceNumber" INTEGER,
    "playerId" TEXT,
    "accuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "presentation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "assignedForms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "court" TEXT NOT NULL DEFAULT 'Unassigned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoomsaeMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubAssistantInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "clubName" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubAssistantInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentManagerInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentManagerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubEventParticipation" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "tournamentId" TEXT,
    "promotionTestId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubEventParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartProposal" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartProposalVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "vote" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmartProposalVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TournamentManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "GuidelineTemplate_name_key" ON "GuidelineTemplate"("name");

-- CreateIndex
CREATE INDEX "Division_templateId_idx" ON "Division"("templateId");

-- CreateIndex
CREATE INDEX "Tournament_startDate_idx" ON "Tournament"("startDate");

-- CreateIndex
CREATE INDEX "Tournament_status_idx" ON "Tournament"("status");

-- CreateIndex
CREATE INDEX "Category_tournamentId_idx" ON "Category"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_clubName_idx" ON "User"("clubName");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");

-- CreateIndex
CREATE INDEX "Player_userId_idx" ON "Player"("userId");

-- CreateIndex
CREATE INDEX "Player_categoryId_idx" ON "Player"("categoryId");

-- CreateIndex
CREATE INDEX "Player_clubId_idx" ON "Player"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_masterId_key" ON "Club"("masterId");

-- CreateIndex
CREATE INDEX "Club_name_idx" ON "Club"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_ownerId_key" ON "Organization"("ownerId");

-- CreateIndex
CREATE INDEX "Announcement_organizationId_createdAt_idx" ON "Announcement"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "PromotionTest_organizationId_testDate_idx" ON "PromotionTest"("organizationId", "testDate");

-- CreateIndex
CREATE INDEX "PromotionTestRegistration_promotionTestId_idx" ON "PromotionTestRegistration"("promotionTestId");

-- CreateIndex
CREATE INDEX "Match_categoryRefId_idx" ON "Match"("categoryRefId");

-- CreateIndex
CREATE INDEX "PoomsaeMatch_categoryRefId_idx" ON "PoomsaeMatch"("categoryRefId");

-- CreateIndex
CREATE INDEX "PoomsaeMatch_round_idx" ON "PoomsaeMatch"("round");

-- CreateIndex
CREATE INDEX "PoomsaeMatch_nextMatchId_idx" ON "PoomsaeMatch"("nextMatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubAssistantInvite_email_key" ON "ClubAssistantInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentManagerInvite_email_tournamentId_key" ON "TournamentManagerInvite"("email", "tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_userId_endpoint_key" ON "PushSubscription"("userId", "endpoint");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ClubEventParticipation_clubId_idx" ON "ClubEventParticipation"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubEventParticipation_clubId_tournamentId_key" ON "ClubEventParticipation"("clubId", "tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubEventParticipation_clubId_promotionTestId_key" ON "ClubEventParticipation"("clubId", "promotionTestId");

-- CreateIndex
CREATE INDEX "SmartProposal_tournamentId_idx" ON "SmartProposal"("tournamentId");

-- CreateIndex
CREATE INDEX "SmartProposal_status_idx" ON "SmartProposal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SmartProposalVote_proposalId_clubId_key" ON "SmartProposalVote"("proposalId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "_TournamentManagers_AB_unique" ON "_TournamentManagers"("A", "B");

-- CreateIndex
CREATE INDEX "_TournamentManagers_B_index" ON "_TournamentManagers"("B");

-- AddForeignKey
ALTER TABLE "Division" ADD CONSTRAINT "Division_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "GuidelineTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeightCategory" ADD CONSTRAINT "WeightCategory_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_guidelineTemplateId_fkey" FOREIGN KEY ("guidelineTemplateId") REFERENCES "GuidelineTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentOrganizationId_fkey" FOREIGN KEY ("parentOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionTest" ADD CONSTRAINT "PromotionTest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionTestRegistration" ADD CONSTRAINT "PromotionTestRegistration_promotionTestId_fkey" FOREIGN KEY ("promotionTestId") REFERENCES "PromotionTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_categoryRefId_fkey" FOREIGN KEY ("categoryRefId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoomsaeMatch" ADD CONSTRAINT "PoomsaeMatch_categoryRefId_fkey" FOREIGN KEY ("categoryRefId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoomsaeMatch" ADD CONSTRAINT "PoomsaeMatch_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentManagerInvite" ADD CONSTRAINT "TournamentManagerInvite_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventParticipation" ADD CONSTRAINT "ClubEventParticipation_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventParticipation" ADD CONSTRAINT "ClubEventParticipation_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventParticipation" ADD CONSTRAINT "ClubEventParticipation_promotionTestId_fkey" FOREIGN KEY ("promotionTestId") REFERENCES "PromotionTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartProposal" ADD CONSTRAINT "SmartProposal_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartProposalVote" ADD CONSTRAINT "SmartProposalVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "SmartProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TournamentManagers" ADD CONSTRAINT "_TournamentManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TournamentManagers" ADD CONSTRAINT "_TournamentManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
