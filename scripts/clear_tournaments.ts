import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🗑️  Deleting ALL Tournaments and related data...')

    // Delete in order of dependency to avoid foreign key constraints if cascading isn't perfect
    // Although Prisma usually handles cascade if configured, manual cleanup is safer.

    // 1. Delete Matches
    await prisma.match.deleteMany({})
    console.log('- Matches deleted')

    // 2. Delete Players
    await prisma.player.deleteMany({})
    console.log('- Players deleted')

    // 3. Delete Categories
    await prisma.category.deleteMany({})
    console.log('- Categories deleted')

    // 4. Delete Tournaments
    await prisma.tournament.deleteMany({})
    console.log('- Tournaments deleted')

    console.log('✅ Tournament database cleared.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
