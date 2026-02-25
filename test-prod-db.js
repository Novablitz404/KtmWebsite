const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.qoncxjjkgdfoyrbukvem:Lexzermatt0812!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
});

async function main() {
  try {
    console.log("Fetching tournament...");
    const tournament = await prisma.tournament.findUnique({
      where: { id: "cmlp15uco0001s7sjf4laapbo" },
      include: {
        categories: {
          include: {
            matches: {
              orderBy: { round: 'asc' }
            },
            poomsaeMatches: {
              orderBy: { round: 'asc' },
              include: {
                player: {
                  include: { club: true }
                }
              }
            },
            _count: {
              select: { players: true }
            }
          },
          orderBy: { name: 'asc' }
        },
        guidelineTemplate: true,
        managers: true
      }
    });
    console.log("Tournament fetched successfully. Title:", tournament?.name);

    console.log("Fetching poomsae team players...");
    const poomsaeTeamPlayers = await prisma.player.findMany({
      where: {
        category: {
          tournamentId: "cmlp15uco0001s7sjf4laapbo",
          type: 'POOMSAE',
          subtype: { in: ['PAIR', 'TEAM'] }
        }
      },
      select: {
        name: true,
        teamId: true,
        clubId: true,
        categoryId: true
      }
    });
    console.log("Poomsae team players fetched successfully. Count:", poomsaeTeamPlayers.length);

    console.log("Fetching invites...");
    const pendingManagerInvites = await prisma.tournamentManagerInvite.findMany({
      where: { tournamentId: "cmlp15uco0001s7sjf4laapbo" },
      orderBy: { createdAt: 'desc' }
    });
    console.log("Invites fetched successfully. Count:", pendingManagerInvites.length);
  } catch (e) {
    console.error("DB Query Failed:", e);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
