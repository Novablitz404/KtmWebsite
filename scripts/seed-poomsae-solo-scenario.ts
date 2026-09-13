/**
 * Seeds a Poomsae HEAD_TO_HEAD category with exactly ONE approved performer —
 * the "uncontested walkover" scenario that surfaced the missing-declare-button
 * bug. Lets you verify the fix end-to-end:
 *
 *   1. Sign in as the local test organizer (tapelite@gmail.com).
 *   2. Open the printed tournament, go to the Poomsae tab, generate the bracket
 *      for this category.
 *   3. The lone performer should show immediately as the decided "Winner" —
 *      no dead-end "Declare Win" button, no manual action needed. Before the
 *      fix, this showed as an undecided pairing with no way to resolve it.
 *
 * Safe to re-run — creates a fresh tournament each time. Delete the printed
 * tournament id via Prisma Studio or the admin UI when done (cascades).
 */

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
    const organizer = await prisma.user.findUnique({ where: { email: 'tapelite@gmail.com' } })
    if (!organizer) throw new Error('Expected local test organizer (tapelite@gmail.com) not found — run the earlier local test-account setup first.')

    const club = await prisma.club.findFirst({ where: { name: 'Manila Fighters TKD' } })
    if (!club) throw new Error('Expected local test club "Manila Fighters TKD" not found.')

    const tournament = await prisma.tournament.create({
        data: {
            name: `Poomsae Solo Test ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            organizerId: organizer.id,
            startDate: new Date(),
            status: 'ONGOING',
        }
    })

    const category = await prisma.category.create({
        data: {
            name: 'Poomsae H2H Solo — Male Black Belt',
            tournamentId: tournament.id,
            type: 'POOMSAE',
            poomsaeFormat: 'HEAD_TO_HEAD',
        }
    })

    const playerName = 'Solo Performer'
    const userId = randomUUID()
    await prisma.user.create({
        data: {
            id: userId,
            name: playerName,
            email: `seed-${userId}@example.com`,
            role: 'ATHLETE',
            belt: 'Black',
            gender: 'MALE',
            clubName: club.name,
        }
    })
    await prisma.player.create({
        data: {
            id: `${Math.floor(Math.random() * 900_000_000) + 100_000_000}`,
            name: playerName,
            gender: 'MALE',
            belt: 'Black',
            weight: 70,
            height: 175,
            categoryId: category.id,
            userId,
            clubId: club.id,
            registrationStatus: 'APPROVED',
        }
    })

    console.log('✅ Seeded solo-performer Poomsae scenario:')
    console.log(`   Tournament: ${tournament.name} (id: ${tournament.id})`)
    console.log(`   Category: ${category.name} — 1 approved performer ("${playerName}")`)
    console.log('')
    console.log('Next steps:')
    console.log('   1. Sign in as the organizer (tapelite@gmail.com) via the Tap Elite sign-in page dev quick-login.')
    console.log(`   2. Open the tournament "${tournament.name}" in the organizer dashboard.`)
    console.log('   3. Generate the bracket for the Poomsae category.')
    console.log('   4. Confirm "Solo Performer" shows as the decided Winner immediately — no button needed.')

    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error('Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
})
