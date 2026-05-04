import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const orgId = 'cml60muu800dgceqenoigxblr'
  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  
  if (org) {
    const t = await prisma.tournament.findMany({ where: { organizerId: org.ownerId } })
    console.log('Tournaments:')
    t.forEach(x => console.log(x.name, x.startDate, 'Status:', x.status, 'Upcoming?', x.startDate >= now))
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
