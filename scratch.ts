import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const tournamentId = 'cmt3trhd50001gan0b3q21avl'

const FIRST = ['Rica','Maria','James','Ken','Lea','Ana','Grace','Bea','John','Josh','Ryan','Mark','Trisha','Nica','Vince','Kaye','Paul','Miguel','Joy','Carla']
const LAST  = ['Garcia','Rivera','Santos','Flores','Castro','Cruz','Diaz','Ramos','Torres','Reyes','Gonzales','Mendoza']

function randName() {
    const f = FIRST[Math.floor(Math.random() * FIRST.length)]
    const l = LAST[Math.floor(Math.random() * LAST.length)]
    const num = Math.floor(100 + Math.random() * 900)
    return `${f} ${l} ${num}`
}

function makePlayer(gender: string, categoryId: string) {
    const id = Math.floor(100000000 + Math.random() * 900000000).toString()
    return {
        id,
        name: randName(),
        gender,
        weight: Math.round((30 + Math.random() * 40) * 10) / 10,
        belt: 'Black',
        registrationStatus: 'APPROVED',
        categoryId,
    }
}

async function main() {
    // 1. Clear all matches for this tournament
    const delMatches = await prisma.match.deleteMany({ where: { categoryRef: { tournamentId } } })
    const delPoomsae = await prisma.poomsaeMatch.deleteMany({ where: { categoryRef: { tournamentId } } })
    console.log(`Cleared ${delMatches.count} Match rows, ${delPoomsae.count} PoomsaeMatch rows`)

    // 2. Clear all players currently in this tournament's categories
    const delPlayers = await prisma.player.deleteMany({ where: { category: { tournamentId } } })
    console.log(`Cleared ${delPlayers.count} players`)

    // 3. Reset seedOrder on every category in this tournament
    await prisma.category.updateMany({ where: { tournamentId }, data: { seedOrder: [] } })
    console.log('Reset seedOrder on all categories')

    // 4. Pick target categories to reseed
    const kyorugiNames = [
        'Cadet Female Advance Kyorugi - Bantam',
        'Cadet Female Intermediate Kyorugi - Feather',
        'Cadet Female Novice Kyorugi - Fin',
        'Cadet Male Advance Kyorugi - Heavy',
        'Cadet Male Intermediate Kyorugi - Middle',
        'Cadet Male Novice Kyorugi - Welter',
        'Junior Female Novice Kyorugi - Fin',
        'Junior Male Novice Kyorugi - Fin',
        'Senior (Under 30) Male Novice Kyorugi - Under 54kg',
    ]
    const kyorugiCounts = [15, 12, 10, 15, 12, 10, 10, 8, 8]

    const poomsaeH2HNames = [
        'Cadet Female Poomsae - Black Belt',
        'Cadet Female Poomsae - Blue Belt',
        'Cadet Female Poomsae - Green Belt',
        'Cadet Male Poomsae - Black Belt',
        'Cadet Male Poomsae - Orange Belt',
        'Toddler Male Poomsae - Yellow Belt',
    ]
    const poomsaeH2HCounts = [15, 10, 5, 12, 8, 4]

    const testNames = ['TEST 2P Kyorugi', 'TEST 3P Kyorugi', 'TEST 2P Poomsae H2H', 'TEST 3P Poomsae H2H']
    const testCounts = [2, 3, 2, 3]

    let totalSeeded = 0

    async function seedInto(name: string, count: number, gender: string) {
        const cat = await prisma.category.findFirst({ where: { tournamentId, name } })
        if (!cat) { console.log(`  SKIP (not found): ${name}`); return }
        const players = Array.from({ length: count }, () => makePlayer(gender, cat.id))
        await prisma.player.createMany({ data: players })
        totalSeeded += count
        console.log(`  Seeded ${count} into "${name}"`)
    }

    console.log('\nKyorugi:')
    for (let i = 0; i < kyorugiNames.length; i++) {
        const gender = kyorugiNames[i].includes('Female') ? 'Female' : 'Male'
        await seedInto(kyorugiNames[i], kyorugiCounts[i], gender)
    }

    console.log('\nPoomsae (HEAD_TO_HEAD):')
    for (let i = 0; i < poomsaeH2HNames.length; i++) {
        const gender = poomsaeH2HNames[i].includes('Female') ? 'Female' : 'Male'
        await seedInto(poomsaeH2HNames[i], poomsaeH2HCounts[i], gender)
    }

    // One Poomsae SCORED category too, so that render path gets tested as well
    console.log('\nPoomsae (SCORED):')
    const scoredCat = await prisma.category.findFirst({
        where: { tournamentId, type: 'POOMSAE', poomsaeFormat: 'SCORED' },
    })
    if (scoredCat) {
        await seedInto(scoredCat.name, 10, 'Female')
    } else {
        console.log('  No SCORED Poomsae category found to seed.')
    }

    // A couple of Kyukpa categories, currently untested (0 players anywhere)
    console.log('\nKyukpa:')
    const kyukpaCats = await prisma.category.findMany({
        where: { tournamentId, type: 'KYUKPA' },
        take: 2,
    })
    for (const cat of kyukpaCats) {
        await seedInto(cat.name, 8, 'Male')
    }

    console.log('\nTest edge-case categories (2p/3p):')
    for (let i = 0; i < testNames.length; i++) {
        const gender = testNames[i].includes('Poomsae') ? 'Female' : 'Male'
        await seedInto(testNames[i], testCounts[i], gender)
    }

    console.log(`\nDone. Total players seeded: ${totalSeeded}. No matches generated — 0 matches everywhere, ready to preview/generate.`)
}
main().finally(() => prisma.$disconnect())
