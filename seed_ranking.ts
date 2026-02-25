import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Ranking Test Data...')

    // 1. Create a Verified User
    const userStrId = Math.floor(10000 + Math.random() * 90000).toString()
    const user = await prisma.user.upsert({
        where: { email: 'rankingtest@example.com' },
        update: { isVerified: true },
        create: {
            id: userStrId,
            email: 'rankingtest@example.com',
            name: 'Ranking Test Athlete',
            role: 'ATHLETE',
            isVerified: true,
            belt: 'Black',
            gender: 'Male',
            weight: 68,
        },
    })
    console.log(`User created/updated: ${user.name}`)

    // 2. Create Tournaments at different dates to test decay
    const today = new Date()

    const t1Date = new Date()
    t1Date.setMonth(today.getMonth() - 6) // 100% points

    const t2Date = new Date()
    t2Date.setMonth(today.getMonth() - 18) // 75% points

    const t3Date = new Date()
    t3Date.setMonth(today.getMonth() - 30) // 50% points

    const t4Date = new Date()
    t4Date.setMonth(today.getMonth() - 42) // 25% points

    const tournamentsData = [
        { name: 'Recent K-2 (100%)', tier: 'K-2', date: t1Date },
        { name: 'Old K-3 (75%)', tier: 'K-3', date: t2Date },
        { name: 'Very Old K-1 (50%)', tier: 'K-1', date: t3Date },
        { name: 'Almost Expired K-4 (25%)', tier: 'K-4', date: t4Date }
    ]

    for (const t of tournamentsData) {
        const tournament = await prisma.tournament.create({
            data: {
                name: t.name,
                startDate: t.date,
                status: 'COMPLETED',
                tier: t.tier,
            }
        })

        const catKyorugi = await prisma.category.create({
            data: {
                name: `Senior Male Kyorugi ${t.name}`,
                tournamentId: tournament.id,
                type: 'KYORUGI'
            }
        })

        const catPoomsae = await prisma.category.create({
            data: {
                name: `Senior Male Poomsae ${t.name}`,
                tournamentId: tournament.id,
                type: 'POOMSAE'
            }
        })

        // Create Kyorugi Player Result (Gold = 10 base)
        const p1Id = Math.floor(10000 + Math.random() * 90000).toString()
        await prisma.player.create({
            data: {
                id: p1Id,
                name: user.name!,
                userId: user.id,
                categoryId: catKyorugi.id,
                medal: 'GOLD',
                registrationStatus: 'APPROVED'
            }
        })

        // Create Poomsae Player Result (Silver = 6 base)
        const p2Id = Math.floor(10000 + Math.random() * 90000).toString()
        await prisma.player.create({
            data: {
                id: p2Id,
                name: user.name!,
                userId: user.id,
                categoryId: catPoomsae.id,
                medal: 'SILVER',
                registrationStatus: 'APPROVED'
            }
        })
    }

    console.log('Test tournaments and medals created.')

    // 3. Refresh the Materialized View so points are calculated
    console.log('Refreshing Materialized View...')
    await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW "GlobalAthleteRanking";')

    console.log('Ranking Test Data Seeded Successfully!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
