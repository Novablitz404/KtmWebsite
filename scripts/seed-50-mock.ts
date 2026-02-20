/**
 * Seed script: 50 Kyorugi + 50 Poomsae Athletes
 *
 * Usage:
 *   npx tsx scripts/seed-50-mock.ts <tournamentId>
 *
 * This creates:
 * - 6 clubs with dummy masters
 * - 5 Kyorugi weight categories (10 athletes each = 50 total)
 * - 3 Poomsae categories: 2 individual + 1 team (~50 athletes total)
 * - Generates brackets for all categories automatically
 */

import { PrismaClient } from '@prisma/client'
import { generatePoomsaeBracket } from '../lib/poomsae-logic'

const prisma = new PrismaClient()

// ─── NAME GENERATOR ──────────────────────────────────────
const firstNamesMale = [
    'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
    'Thomas', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald',
    'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
    'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob'
]
const firstNamesFemale = [
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica',
    'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra',
    'Ashley', 'Emily', 'Donna', 'Michelle', 'Dorothy', 'Carol', 'Amanda',
    'Melissa', 'Deborah', 'Stephanie', 'Rebecca', 'Sharon', 'Laura', 'Cynthia', 'Kathleen'
]
const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson'
]

let nameIndex = 0
function getRandomName(gender: 'Male' | 'Female') {
    const pool = gender === 'Male' ? firstNamesMale : firstNamesFemale
    const first = pool[nameIndex % pool.length]
    const last = lastNames[nameIndex % lastNames.length]
    nameIndex++
    return `${first} ${last}`
}

function randomId() {
    return Math.floor(10000 + Math.random() * 90000).toString()
}

// ─── SINGLE-ELIMINATION BRACKET GENERATOR ──────────────────
// Replicating the bracket generation logic from app/actions.ts
// so we can run it standalone without Next.js server context

interface BracketSpec {
    id: number
    round: number
    player1: { name: string } | null
    player2: { name: string } | null
    nextMatchId: number | null
    nextMatchSlot: string | null
}

function generateSingleEliminationBracket(players: { name: string }[]): BracketSpec[] {
    if (players.length < 2) return []

    // Shuffle players
    const shuffled = [...players]
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    const n = shuffled.length
    const totalSlots = Math.pow(2, Math.ceil(Math.log2(n))) // Next power of 2
    const totalRounds = Math.ceil(Math.log2(totalSlots))

    const specs: BracketSpec[] = []
    let matchId = 1

    // Generate all rounds
    let matchesInRound = totalSlots / 2
    for (let round = 1; round <= totalRounds; round++) {
        for (let i = 0; i < matchesInRound; i++) {
            specs.push({
                id: matchId++,
                round,
                player1: null,
                player2: null,
                nextMatchId: null,
                nextMatchSlot: null
            })
        }
        matchesInRound = matchesInRound / 2
    }

    // Assign players to round 1
    const round1Matches = specs.filter(s => s.round === 1)
    for (let i = 0; i < shuffled.length; i++) {
        const matchIdx = Math.floor(i / 2)
        if (i % 2 === 0) {
            round1Matches[matchIdx].player1 = shuffled[i]
        } else {
            round1Matches[matchIdx].player2 = shuffled[i]
        }
    }

    // Handle byes (player2 = null = TBD means bye)
    for (const m of round1Matches) {
        if (!m.player2) {
            // This is a bye — player1 auto-advances
            m.player2 = { name: 'BYE' }
        }
    }

    // Link matches to next round
    let prevRoundStart = 0
    for (let round = 1; round < totalRounds; round++) {
        const matchesThisRound = specs.filter(s => s.round === round)
        const matchesNextRound = specs.filter(s => s.round === round + 1)

        for (let i = 0; i < matchesThisRound.length; i++) {
            const nextMatch = matchesNextRound[Math.floor(i / 2)]
            matchesThisRound[i].nextMatchId = nextMatch.id
            matchesThisRound[i].nextMatchSlot = i % 2 === 0 ? 'player1' : 'player2'
        }
    }

    return specs
}

// ─── MAIN ──────────────────────────────────────────────────
async function main() {
    const tournamentId = process.argv[2]

    if (!tournamentId) {
        console.error('❌ Usage: npx tsx scripts/seed-50-mock.ts <tournamentId>')
        process.exit(1)
    }

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
    if (!tournament) {
        console.error(`❌ Tournament "${tournamentId}" not found`)
        process.exit(1)
    }
    console.log(`\n🥋 Seeding mock data for: ${tournament.name}`)
    console.log('━'.repeat(50))

    // ── STEP 1: Clear existing data ──
    console.log('\n🧹 Clearing existing tournament data...')
    try {
        await prisma.match.deleteMany({ where: { categoryRef: { tournamentId } } })
        await prisma.poomsaeMatch.deleteMany({ where: { categoryRef: { tournamentId } } })
        await prisma.player.deleteMany({ where: { category: { tournamentId } } })
        await prisma.category.deleteMany({ where: { tournamentId } })
        console.log('   ✓ Cleared.')
    } catch (e) {
        console.warn('   ⚠ Partial clear:', e)
    }

    // ── STEP 2: Create 6 Clubs ──
    console.log('\n🏠 Creating clubs...')
    const clubNames = [
        'Manila Tigers', 'Cebu Warriors', 'Davao Strikers',
        'Makati Eagles', 'Quezon Cobras', 'Baguio Lions'
    ]
    const clubs: { id: string; name: string }[] = []

    for (const cName of clubNames) {
        const email = `master_${cName.replace(/\s/g, '').toLowerCase()}@mock.com`
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                id: randomId(),
                clerkId: `mock_clerk_${Math.random().toString(36).slice(2, 10)}`,
                email,
                role: 'CLUB_MASTER',
                name: `Master of ${cName}`
            }
        })
        const club = await prisma.club.upsert({
            where: { masterId: user.id },
            update: {},
            create: { name: cName, masterId: user.id, status: 'APPROVED' }
        })
        clubs.push({ id: club.id, name: club.name })
    }
    console.log(`   ✓ ${clubs.length} clubs ready.`)

    // ══════════════════════════════════════
    // KYORUGI: 5 categories × 10 athletes = 50
    // ══════════════════════════════════════
    console.log('\n🥊 Creating Kyorugi categories & athletes...')

    const kyorugiCategories = [
        { name: 'Senior Male -58kg', gender: 'Male', minW: 54, maxW: 58 },
        { name: 'Senior Male -68kg', gender: 'Male', minW: 59, maxW: 68 },
        { name: 'Senior Male -80kg', gender: 'Male', minW: 69, maxW: 80 },
        { name: 'Senior Female -49kg', gender: 'Female', minW: 46, maxW: 49 },
        { name: 'Senior Female -57kg', gender: 'Female', minW: 50, maxW: 57 },
    ]

    let totalKyo = 0
    for (const catDef of kyorugiCategories) {
        const cat = await prisma.category.create({
            data: {
                name: catDef.name,
                type: 'KYORUGI',
                subtype: 'INDIVIDUAL',
                tournamentId,
                court: String(kyorugiCategories.indexOf(catDef) + 1),
                minAge: 17,
                maxAge: 35,
                gender: catDef.gender,
                minWeight: catDef.minW,
                maxWeight: catDef.maxW,
            }
        })

        // Create 10 players per category
        const catPlayers: { name: string }[] = []
        for (let i = 0; i < 10; i++) {
            const club = clubs[i % clubs.length]
            const pName = getRandomName(catDef.gender as 'Male' | 'Female')
            const w = catDef.minW + Math.random() * (catDef.maxW - catDef.minW)

            await prisma.player.create({
                data: {
                    id: randomId(),
                    name: pName,
                    gender: catDef.gender,
                    weight: Math.round(w * 10) / 10,
                    belt: 'Black',
                    categoryId: cat.id,
                    clubId: club.id,
                    registrationStatus: 'APPROVED'
                }
            })
            catPlayers.push({ name: pName })
            totalKyo++
        }

        // Generate bracket
        const bracketSpecs = generateSingleEliminationBracket(catPlayers)
        const idMapping = new Map<number, number>()

        const sortedSpecs = [...bracketSpecs].sort((a, b) => {
            if (a.round !== b.round) return a.round - b.round
            return a.id - b.id
        })

        for (const spec of sortedSpecs) {
            const created = await prisma.match.create({
                data: {
                    categoryRefId: cat.id,
                    category: cat.name,
                    round: spec.round,
                    player1: spec.player1?.name || 'TBD',
                    player2: spec.player2?.name || 'TBD',
                    nextMatchSlot: spec.nextMatchSlot,
                    court: cat.court || 'Unassigned'
                }
            })
            idMapping.set(spec.id, created.id)
        }

        for (const spec of bracketSpecs) {
            if (spec.nextMatchId !== null) {
                const actualId = idMapping.get(spec.id)
                const actualNextId = idMapping.get(spec.nextMatchId)
                if (actualId && actualNextId) {
                    await prisma.match.update({
                        where: { id: actualId },
                        data: { nextMatchId: actualNextId }
                    })
                }
            }
        }

        console.log(`   ✓ ${catDef.name}: 10 athletes, ${bracketSpecs.length} matches`)
    }
    console.log(`   Total Kyorugi athletes: ${totalKyo}`)

    // ══════════════════════════════════════
    // POOMSAE: 3 categories ≈ 50 athletes
    //   - Individual Male: 20 athletes (gets Prelim → Semi → Final)
    //   - Individual Female: 20 athletes
    //   - Team Mixed: 10 athletes (5 teams × 2 members)
    // ══════════════════════════════════════
    console.log('\n🎭 Creating Poomsae categories & athletes...')

    let totalPoom = 0
    let matchCount = tournament.match_count || 0

    // ── Poomsae Individual Male (20 athletes → Prelim) ──
    const poomIndMale = await prisma.category.create({
        data: {
            name: 'Senior Male Individual',
            type: 'POOMSAE',
            subtype: 'INDIVIDUAL',
            tournamentId,
            court: '6',
            poomsaeForms: 'Koryo,Keumgang,Taebaek',
            minAge: 17, maxAge: 35,
            gender: 'Male',
            belt: 'Black',
        }
    })

    for (let i = 0; i < 20; i++) {
        const club = clubs[i % clubs.length]
        await prisma.player.create({
            data: {
                id: randomId(),
                name: getRandomName('Male'),
                gender: 'Male',
                belt: 'Black',
                categoryId: poomIndMale.id,
                clubId: club.id,
                registrationStatus: 'APPROVED'
            }
        })
        totalPoom++
    }

    // Generate poomsae bracket
    let players = await prisma.player.findMany({ where: { categoryId: poomIndMale.id }, include: { club: true } })
    let specs = generatePoomsaeBracket(players, 'INDIVIDUAL', 'Koryo,Keumgang,Taebaek')
    let distinctGroups = Array.from(new Set(specs.map(s => s.roundGroupIndex))).sort((a, b) => a - b)
    let startNum = matchCount + 1
    const groupMap1 = new Map<number, number>()
    distinctGroups.forEach((idx, i) => groupMap1.set(idx, startNum + i))

    for (const spec of specs) {
        const sharedId = groupMap1.get(spec.roundGroupIndex) || 0
        const nextId = groupMap1.get(spec.roundGroupIndex + 1) || null
        await prisma.poomsaeMatch.create({
            data: {
                categoryRefId: poomIndMale.id,
                category: poomIndMale.name,
                round: spec.round,
                matchId: sharedId,
                nextMatchId: nextId,
                targetRank: spec.targetRank,
                performanceNumber: spec.performanceNumber,
                playerId: spec.playerId || undefined,
                displayName: spec.displayName || undefined,
                memberIds: spec.memberIds || undefined,
                memberNames: spec.memberNames || undefined,
                assignedForms: spec.assignedForms,
                status: 'Pending',
                court: '6'
            }
        })
    }
    matchCount = startNum + distinctGroups.length - 1
    console.log(`   ✓ Senior Male Individual: 20 athletes, ${specs.length} performance slots (${distinctGroups.length} rounds)`)

    // ── Poomsae Individual Female (20 athletes → Prelim) ──
    const poomIndFemale = await prisma.category.create({
        data: {
            name: 'Senior Female Individual',
            type: 'POOMSAE',
            subtype: 'INDIVIDUAL',
            tournamentId,
            court: '7',
            poomsaeForms: 'Koryo,Keumgang,Taebaek',
            minAge: 17, maxAge: 35,
            gender: 'Female',
            belt: 'Black',
        }
    })

    for (let i = 0; i < 20; i++) {
        const club = clubs[i % clubs.length]
        await prisma.player.create({
            data: {
                id: randomId(),
                name: getRandomName('Female'),
                gender: 'Female',
                belt: 'Black',
                categoryId: poomIndFemale.id,
                clubId: club.id,
                registrationStatus: 'APPROVED'
            }
        })
        totalPoom++
    }

    players = await prisma.player.findMany({ where: { categoryId: poomIndFemale.id }, include: { club: true } })
    specs = generatePoomsaeBracket(players, 'INDIVIDUAL', 'Koryo,Keumgang,Taebaek')
    distinctGroups = Array.from(new Set(specs.map(s => s.roundGroupIndex))).sort((a, b) => a - b)
    startNum = matchCount + 1
    const groupMap2 = new Map<number, number>()
    distinctGroups.forEach((idx, i) => groupMap2.set(idx, startNum + i))

    for (const spec of specs) {
        const sharedId = groupMap2.get(spec.roundGroupIndex) || 0
        const nextId = groupMap2.get(spec.roundGroupIndex + 1) || null
        await prisma.poomsaeMatch.create({
            data: {
                categoryRefId: poomIndFemale.id,
                category: poomIndFemale.name,
                round: spec.round,
                matchId: sharedId,
                nextMatchId: nextId,
                targetRank: spec.targetRank,
                performanceNumber: spec.performanceNumber,
                playerId: spec.playerId || undefined,
                displayName: spec.displayName || undefined,
                memberIds: spec.memberIds || undefined,
                memberNames: spec.memberNames || undefined,
                assignedForms: spec.assignedForms,
                status: 'Pending',
                court: '7'
            }
        })
    }
    matchCount = startNum + distinctGroups.length - 1
    console.log(`   ✓ Senior Female Individual: 20 athletes, ${specs.length} performance slots (${distinctGroups.length} rounds)`)

    // ── Poomsae Team Mixed (10 athletes = 5 teams × 2 members) ──
    const poomTeam = await prisma.category.create({
        data: {
            name: 'Senior Mixed Team',
            type: 'POOMSAE',
            subtype: 'TEAM',
            tournamentId,
            court: '8',
            poomsaeForms: 'Taegeuk 7,Taegeuk 8',
        }
    })

    for (let team = 0; team < 5; team++) {
        const club = clubs[team % clubs.length]
        const teamLetter = String.fromCharCode(65 + team) // A, B, C, D, E

        for (let member = 0; member < 2; member++) {
            const g = member % 2 === 0 ? 'Male' : 'Female' as const
            await prisma.player.create({
                data: {
                    id: randomId(),
                    name: getRandomName(g),
                    gender: g,
                    belt: 'Black',
                    categoryId: poomTeam.id,
                    clubId: club.id,
                    registrationStatus: 'APPROVED',
                    poomsaeType: 'TEAM',
                    teamId: teamLetter
                }
            })
            totalPoom++
        }
    }

    players = await prisma.player.findMany({ where: { categoryId: poomTeam.id }, include: { club: true } })
    specs = generatePoomsaeBracket(players, 'TEAM', 'Taegeuk 7,Taegeuk 8')
    distinctGroups = Array.from(new Set(specs.map(s => s.roundGroupIndex))).sort((a, b) => a - b)
    startNum = matchCount + 1
    const groupMap3 = new Map<number, number>()
    distinctGroups.forEach((idx, i) => groupMap3.set(idx, startNum + i))

    for (const spec of specs) {
        const sharedId = groupMap3.get(spec.roundGroupIndex) || 0
        const nextId = groupMap3.get(spec.roundGroupIndex + 1) || null
        await prisma.poomsaeMatch.create({
            data: {
                categoryRefId: poomTeam.id,
                category: poomTeam.name,
                round: spec.round,
                matchId: sharedId,
                nextMatchId: nextId,
                targetRank: spec.targetRank,
                performanceNumber: spec.performanceNumber,
                playerId: spec.playerId || undefined,
                displayName: spec.displayName || undefined,
                memberIds: spec.memberIds || undefined,
                memberNames: spec.memberNames || undefined,
                assignedForms: spec.assignedForms,
                status: 'Pending',
                court: '8'
            }
        })
    }
    matchCount = startNum + distinctGroups.length - 1
    console.log(`   ✓ Senior Mixed Team: 10 athletes (5 teams), ${specs.length} performance slots`)

    // Update tournament match_count
    await prisma.tournament.update({
        where: { id: tournamentId },
        data: { match_count: matchCount }
    })

    console.log(`   Total Poomsae athletes: ${totalPoom}`)

    // ── Summary ──
    console.log('\n' + '━'.repeat(50))
    console.log('✅ SEEDING COMPLETE!')
    console.log(`   🥊 Kyorugi: ${totalKyo} athletes across ${kyorugiCategories.length} categories`)
    console.log(`   🎭 Poomsae: ${totalPoom} athletes across 3 categories`)
    console.log(`   🏠 Clubs: ${clubs.length}`)
    console.log(`   Tournament: ${tournament.name} (${tournamentId})`)
    console.log('━'.repeat(50) + '\n')
}

main()
    .catch(e => { console.error('❌ Error:', e); process.exit(1) })
    .finally(async () => await prisma.$disconnect())
