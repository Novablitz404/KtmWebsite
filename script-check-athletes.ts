import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const totalAthletes = await prisma.user.count({ where: { role: 'ATHLETE' } });
  console.log('Total Athletes:', totalAthletes);

  const verifiedAthletes = await prisma.user.count({ where: { role: 'ATHLETE', isVerified: true } });
  console.log('Verified (isVerified=true) Athletes:', verifiedAthletes);

  const pendingAthletes = await prisma.user.count({ where: { role: 'ATHLETE', isVerified: false } });
  console.log('Pending (isVerified=false) Athletes:', pendingAthletes);

  const paymentStatuses = await prisma.user.groupBy({
    by: ['cardPaymentStatus'],
    where: { role: 'ATHLETE' },
    _count: { cardPaymentStatus: true },
  });
  console.log('\nPayment Statuses:', paymentStatuses);

  // Print all athletes to inspect
  const athletes = await prisma.user.findMany({
    where: { role: 'ATHLETE' },
    select: { 
      id: true, 
      name: true, 
      email: true,
      isVerified: true, 
      cardPaymentStatus: true,
      createdAt: true
    }
  });

  console.log('\nAll Athletes:');
  console.table(athletes);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
