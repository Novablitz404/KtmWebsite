/**
 * Seeds data for testing the club master's category auto-match in the
 * Add Athlete modal (Quick Register → Tournament).
 *
 *   1. Sign in as clubmaster@test.local (club: Manila Fighters TKD)
 *   2. Quick Register → Tournament → pick "Auto-Match Test Tournament"
 *   3. Search "AM " to find the test athletes below and check the suggested category.
 *
 * Expected matches (Kyorugi):
 *   AM Nico White      13y M 38kg  → Novice Male 12-17 -45kg
 *   AM Bea Yellow      14y F 48kg  → Intermediate Female 12-17 -55kg
 *   AM Marco Purple    15y M 52kg  → Intermediate Male 12-17 -55kg
 *   AM Sofia Blue      16y F 60kg  → Advance Female 12-17 -65kg
 *   AM Luis Red        17y M 63kg  → Advance Male 12-17 -65kg
 *   AM Dana Black      15y F 55.1  → Advance Female 12-17 -65kg (just over the -55 limit)
 *   AM Kiko Green       9y M 135cm → Grade School Male 131-150cm
 *   AM Ben Adult       40y M 80kg  → no match (amber note, pick manually)
 *   AM NoBirthday       —          → no suggestion (no birthday on file)
 * Also: change Nico's belt to Blue → should jump to Advance; switch event type to
 * Poomsae → belt-based categories (White / Yellow / Blue / Black).
 *
 * Safe to re-run — reuses the tournament/athletes by name/email.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CLUB = 'Manila Fighters TKD'
const TOURNAMENT_NAME = 'Auto-Match Test Tournament'

function birthDateForAge(age: number) {
    const d = new Date()
    d.setFullYear(d.getFullYear() - age)
    d.setMonth(d.getMonth() - 2) // comfortably past their birthday
    return d
}

const SKILLS = ['Novice', 'Intermediate', 'Advance'] as const
const GENDERS = ['Male', 'Female'] as const
const WEIGHT_BANDS = [
    { label: '-45kg', minWeight: null, maxWeight: 45 },
    { label: '-55kg', minWeight: 45.1, maxWeight: 55 },
    { label: '-65kg', minWeight: 55.1, maxWeight: 65 },
]

const ATHLETES = [
    { name: 'AM Nico White', gender: 'Male', belt: 'White', age: 13, weight: 38, height: 150 },
    { name: 'AM Bea Yellow', gender: 'Female', belt: 'Yellow', age: 14, weight: 48, height: 158 },
    { name: 'AM Marco Purple', gender: 'Male', belt: 'Purple', age: 15, weight: 52, height: 165 },
    { name: 'AM Sofia Blue', gender: 'Female', belt: 'Blue', age: 16, weight: 60, height: 162 },
    { name: 'AM Luis Red', gender: 'Male', belt: 'Red', age: 17, weight: 63, height: 172 },
    { name: 'AM Dana Black', gender: 'Female', belt: 'Black', age: 15, weight: 55.1, height: 160 },
    { name: 'AM Kiko Green', gender: 'Male', belt: 'Green', age: 9, weight: 30, height: 135 },
    { name: 'AM Ben Adult', gender: 'Male', belt: 'Black', age: 40, weight: 80, height: 178 },
    { name: 'AM NoBirthday', gender: 'Male', belt: 'Yellow', age: null, weight: 50, height: 160 },
] as const

async function main() {
    const organizer = await prisma.user.findUnique({ where: { email: 'tapelite@gmail.com' } })
    if (!organizer) throw new Error('Expected local test organizer (tapelite@gmail.com) not found.')

    // ── Tournament ──
    const startDate = new Date()
    startDate.setDate(startDate.getDate() + 21)
    let tournament = await prisma.tournament.findFirst({ where: { name: TOURNAMENT_NAME } })
    if (!tournament) {
        tournament = await prisma.tournament.create({
            data: {
                name: TOURNAMENT_NAME,
                organizerId: organizer.id,
                startDate,
                venue: 'Manila Sports Complex',
                status: 'UPCOMING',
            }
        })
    }

    // ── Categories ──
    const existing = await prisma.category.count({ where: { tournamentId: tournament.id } })
    if (existing === 0) {
        const cats: any[] = []

        // Kyorugi: skill tier × gender × weight band (age 12-17)
        for (const skill of SKILLS) for (const gender of GENDERS) for (const w of WEIGHT_BANDS) {
            cats.push({
                name: `Kyorugi ${skill} ${gender} 12-17 ${w.label}`,
                type: 'KYORUGI', subtype: 'INDIVIDUAL', skillLevel: skill, gender,
                minAge: 12, maxAge: 17, minWeight: w.minWeight, maxWeight: w.maxWeight,
            })
        }

        // Kyorugi: Grade School, height-based (age 6-11)
        cats.push(
            { name: 'Kyorugi Grade School Male 100-130cm', type: 'KYORUGI', subtype: 'INDIVIDUAL', skillLevel: 'Novice', gender: 'Male', minAge: 6, maxAge: 11, minHeight: 100, maxHeight: 130 },
            { name: 'Kyorugi Grade School Male 131-150cm', type: 'KYORUGI', subtype: 'INDIVIDUAL', skillLevel: null, gender: 'Male', minAge: 6, maxAge: 11, minHeight: 130.1, maxHeight: 150 },
        )

        // Poomsae: belt-based (no skill level)
        for (const belt of ['White', 'Yellow', 'Blue', 'Black']) for (const gender of GENDERS) {
            cats.push({
                name: `Poomsae Individual ${belt} Belt ${gender} 12-17`,
                type: 'POOMSAE', subtype: 'INDIVIDUAL', skillLevel: null, gender, belt,
                minAge: 12, maxAge: 17,
            })
        }

        await prisma.category.createMany({ data: cats.map(c => ({ ...c, tournamentId: tournament!.id })) })
        console.log(`Created ${cats.length} categories`)
    }

    // ── Athletes ──
    for (const a of ATHLETES) {
        const email = `am-${a.name.toLowerCase().replace(/[^a-z]+/g, '-')}@example.com`
        const data = {
            name: a.name, role: 'ATHLETE', gender: a.gender, belt: a.belt,
            weight: a.weight, height: a.height, clubName: CLUB, country: 'Philippines',
            birthDate: a.age === null ? null : birthDateForAge(a.age),
            onboardingStatus: 'APPROVED',
        }
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) await prisma.user.update({ where: { email }, data })
        else await prisma.user.create({
            data: { id: Math.floor(Math.random() * 900000000 + 100000000).toString(), email, ...data }
        })
    }

    console.log(`Tournament: "${tournament.name}" (${tournament.id})`)
    console.log(`Athletes: ${ATHLETES.length} under ${CLUB} — search "AM " in Quick Register`)
}

main().finally(() => prisma.$disconnect())
