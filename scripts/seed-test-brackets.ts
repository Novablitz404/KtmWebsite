/**
 * Seeds a test tournament with one Kyorugi category and one HEAD_TO_HEAD
 * Poomsae category, each with 8 approved athletes, so you can log in as the
 * local test organizer, generate both brackets yourself, and click-test the
 * new "Declare Win" buttons end-to-end.
 *
 * Does NOT generate the brackets — that's the manual step to test.
 *
 * Usage:
 *   npx tsx scripts/seed-test-brackets.ts
 *
 * Safe to re-run — creates a fresh tournament each time (won't touch
 * existing data). To remove it later, delete the printed tournament id via
 * Prisma Studio or the admin UI (cascades to categories/players).
 */

import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

const FIRST_NAMES = ['Juan', 'Maria', 'Jose', 'Ana', 'Pedro', 'Rosa', 'Carlo', 'Liza', 'Mark', 'Grace', 'Paolo', 'Nica', 'Ramon', 'Bea', 'Diego', 'Faith']
const LAST_NAMES = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Ramos', 'Aquino', 'Bautista', 'Castillo', 'Domingo', 'Fernandez', 'Gonzales', 'Hernandez', 'Ilagan']

function randomName(used: Set<string>): string {
    let name: string
    do {
        const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]
        const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
        name = `${first} ${last}`
    } while (used.has(name))
    used.add(name)
    return name
}

async function main() {
    const organizer = await prisma.user.findUnique({ where: { email: 'tapelite@gmail.com' } })
    if (!organizer) throw new Error('Expected local test organizer (tapelite@gmail.com) not found — run the earlier local test-account setup first.')

    const clubOrNull = await prisma.club.findFirst({ where: { name: 'Manila Fighters TKD' } })
    if (!clubOrNull) throw new Error('Expected local test club "Manila Fighters TKD" not found.')
    const club = clubOrNull

    const tournament = await prisma.tournament.create({
        data: {
            name: `Bracket Test Tournament ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            organizerId: organizer.id,
            startDate: new Date(),
            status: 'ONGOING',
        }
    })

    const usedNames = new Set<string>()

    async function seedCategory(name: string, type: 'KYORUGI' | 'POOMSAE', poomsaeFormat?: string) {
        const category = await prisma.category.create({
            data: {
                name,
                tournamentId: tournament.id,
                type,
                ...(poomsaeFormat ? { poomsaeFormat } : {}),
            }
        })

        for (let i = 0; i < 8; i++) {
            const playerName = randomName(usedNames)
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
                    weight: 65 + i,
                    height: 165 + i,
                    categoryId: category.id,
                    userId,
                    clubId: club.id,
                    registrationStatus: 'APPROVED',
                }
            })
        }

        return category
    }

    const kyorugiCategory = await seedCategory('Kyorugi Test — Male Black Belt', 'KYORUGI')
    const poomsaeCategory = await seedCategory('Poomsae H2H Test — Male Black Belt', 'POOMSAE', 'HEAD_TO_HEAD')

    console.log('✅ Seeded test tournament:')
    console.log(`   Tournament: ${tournament.name} (id: ${tournament.id})`)
    console.log(`   Kyorugi category: ${kyorugiCategory.name} — 8 approved athletes`)
    console.log(`   Poomsae H2H category: ${poomsaeCategory.name} — 8 approved athletes`)
    console.log('')
    console.log('Next steps:')
    console.log('   1. Sign in as the organizer (tapelite@gmail.com) via the Tap Elite sign-in page dev quick-login.')
    console.log(`   2. Open the tournament "${tournament.name}" in the organizer dashboard.`)
    console.log('   3. Generate the bracket for each category (Kyorugi tab, then Poomsae tab).')
    console.log('   4. Click "Declare Win" on a match slot and confirm the bracket advances + a toast confirms.')

    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error('Seed failed:', e)
    await prisma.$disconnect()
    process.exit(1)
})
