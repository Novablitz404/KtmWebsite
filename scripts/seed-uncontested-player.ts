// Seeds a single KYORUGI category with exactly one player and no opponent —
// reproduces the "Uncontested" scenario (detectSmartAlerts flags any category
// with players.length === 1) so the not-yet-generated bracket preview for a
// lone player can be tested locally without waiting for real registrations.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const tournamentId = process.argv[2] || 'cmkqwh3yc006muaxbhze9nrko'

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
    if (!tournament) {
        console.error(`Tournament ${tournamentId} not found`)
        process.exit(1)
    }
    console.log(`Seeding an uncontested player for: ${tournament.name}`)

    // Reuse a club if one already exists for this tournament's org, otherwise create one
    const email = 'master_soloacademy@test.com'
    const clubUser = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
            id: Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
            clerkId: `clerk_${Math.random().toString().slice(2, 10)}`,
            email,
            role: 'CLUB_MASTER',
            name: 'Master of Solo Academy',
        }
    })
    const club = await prisma.club.upsert({
        where: { masterId: clubUser.id },
        update: {},
        create: { name: 'Solo Academy', masterId: clubUser.id, status: 'APPROVED' }
    })

    // A weight class distinct from seed-tournament.ts's "Senior Male -58kg" so this
    // category stays genuinely uncontested (doesn't collide with other seeded players)
    const categoryName = 'Senior Male -80kg'
    let category = await prisma.category.findFirst({
        where: { name: categoryName, tournamentId: tournament.id }
    })
    if (!category) {
        category = await prisma.category.create({
            data: {
                name: categoryName,
                type: 'KYORUGI',
                subtype: 'INDIVIDUAL',
                tournamentId: tournament.id,
                court: '1',
                minAge: 17,
                maxAge: 35,
                gender: 'Male',
                minWeight: 76,
                maxWeight: 80,
                minHeight: 0,
                maxHeight: 0,
            }
        })
        console.log(`Created category: ${category.name}`)
    } else {
        console.log(`Using existing category: ${category.name}`)
    }

    const existingPlayers = await prisma.player.count({ where: { categoryId: category.id } })
    if (existingPlayers > 0) {
        console.log(`Category already has ${existingPlayers} player(s) — clearing so it stays uncontested (exactly 1).`)
        await prisma.player.deleteMany({ where: { categoryId: category.id } })
    }

    const player = await prisma.player.create({
        data: {
            id: Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
            name: 'Marcus Villanueva',
            gender: 'Male',
            weight: 79,
            belt: 'Black',
            categoryId: category.id,
            clubId: club.id,
            registrationStatus: 'APPROVED',
        }
    })

    console.log(`Seeded uncontested player "${player.name}" (${club.name}) alone in "${category.name}".`)
    console.log('Expand that category in the admin bracket list — the preview should now show their name/club without a match.')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
