import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const seminars = await prisma.seminar.findMany({
    select: { id: true, name: true, bannerUrl: true },
  });
  console.log(seminars);
}

main().finally(() => prisma.$disconnect());
