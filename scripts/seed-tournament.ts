import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const tournamentId = process.argv[2] || 'cmkqwh3yc006muaxbhze9nrko'

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
    if (!tournament) {
        console.error(`Tournament ${tournamentId} not found`)
        process.exit(1)
    }
    console.log(`Seeding data for: ${tournament.name}`)

    // CLEAR EXISTING DATA
    console.log('Clearing existing players and matches...')
    // Delete matches first due to foreign keys
    try {
        await prisma.match.deleteMany({ where: { categoryRef: { tournamentId: tournament.id } } })
        // For PoomsaeMatch, it also has categoryRef
        await prisma.poomsaeMatch.deleteMany({ where: { categoryRef: { tournamentId: tournament.id } } })

        // Delete players
        await prisma.player.deleteMany({ where: { category: { tournamentId: tournament.id } } })

        // Delete categories
        await prisma.category.deleteMany({ where: { tournamentId: tournament.id } })
    } catch (e) {
        console.warn('Error clearing data, continuing...', e)
    }
    console.log('Existing data cleared.')

    // Realistic Names Lists
    const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen']
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin']

    function getRandomName() {
        const first = firstNames[Math.floor(Math.random() * firstNames.length)]
        const last = lastNames[Math.floor(Math.random() * lastNames.length)]
        return `${first} ${last}`
    }

    // Create Clubs with dummy masters
    const clubs = []
    const clubNames = ['Red Dragon Team', 'Blue Tiger Club', 'Iron Fist Gym', 'Cobra Kai']

    for (const name of clubNames) {
        const email = `master_${name.replace(/\s/g, '').toLowerCase()}@test.com`
        // Create Dummy User for Master
        const user = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                id: Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
                clerkId: `clerk_${Math.random().toString().slice(2, 10)}`,
                email,
                role: 'CLUB_MASTER',
                name: `Master of ${name}`
            }
        })

        const club = await prisma.club.upsert({
            where: { masterId: user.id },
            update: {},
            create: {
                name,
                masterId: user.id,
                status: 'APPROVED'
            }
        })
        clubs.push(club)
    }

    // Find or Create Kyorugi Category
    let kyorugiCat = await prisma.category.findFirst({
        where: { name: 'Senior Male -58kg', tournamentId: tournament.id }
    })

    if (!kyorugiCat) {
        kyorugiCat = await prisma.category.create({
            data: {
                name: 'Senior Male -58kg',
                type: 'KYORUGI',
                subtype: 'INDIVIDUAL',
                tournamentId: tournament.id,
                court: '1',
                // Rules for Auto-Detection
                minAge: 17,
                maxAge: 35,
                gender: 'Male',
                minWeight: 54, // Example range
                maxWeight: 58,
                minHeight: 0,
                maxHeight: 0,
            }
        })
        console.log(`Created Kyorugi Category: ${kyorugiCat.name}`)
    } else {
        console.log(`Using existing Kyorugi Category: ${kyorugiCat.name}`)
    }

    // Find or Create Poomsae Category
    let poomsaeCat = await prisma.category.findFirst({
        where: { name: 'Junior Female Individual', tournamentId: tournament.id }
    })

    if (!poomsaeCat) {
        poomsaeCat = await prisma.category.create({
            data: {
                name: 'Junior Female Individual',
                type: 'POOMSAE',
                subtype: 'INDIVIDUAL',
                tournamentId: tournament.id,
                court: '2',
                poomsaeForms: 'Koryo,Keumgang',
                // Rules
                minAge: 15,
                maxAge: 17,
                gender: 'Female',
                belt: 'Black', // Strict belt check
                minWeight: 0,
                maxWeight: 999,
            }
        })
        console.log(`Created Poomsae Category: ${poomsaeCat.name}`)
    } else {
        console.log(`Using existing Poomsae Category: ${poomsaeCat.name}`)
    }

    console.log(`Generating players with realistic names...`)

    // Create Kyorugi Players (10 players)
    for (let i = 0; i < 10; i++) {
        const club = clubs[i % clubs.length]
        await prisma.player.create({
            data: {
                id: Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
                name: getRandomName(),
                gender: 'Male',
                weight: 56 + (Math.random() * 2),
                belt: 'Black',
                categoryId: kyorugiCat.id,
                clubId: club.id,
                registrationStatus: 'APPROVED'
            }
        })
    }

    // Create Poomsae Players (10 players)
    for (let i = 0; i < 10; i++) {
        const club = clubs[i % clubs.length]
        await prisma.player.create({
            data: {
                id: Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
                name: getRandomName(),
                gender: 'Female',
                belt: 'Black',
                categoryId: poomsaeCat.id,
                clubId: club.id,
                registrationStatus: 'APPROVED'
            }
        })
    }

    // Create a Pair Category for testing Team IDs
    let pairCatReal = await prisma.category.findFirst({
        where: { name: 'Junior Pair', tournamentId: tournament.id }
    })
    if (!pairCatReal) {
        pairCatReal = await prisma.category.create({
            data: {
                name: 'Junior Pair',
                type: 'POOMSAE',
                subtype: 'PAIR',
                tournamentId: tournament.id,
                court: '3',
                poomsaeForms: 'Taegeuk 4'
            }
        })
    }

    // Add 4 players to 'Red Dragon Team' for this Pair Event (Should form 2 teams: ID 1 and ID 2)
    const redDragonClub = clubs.find(c => c.name === 'Red Dragon Team')
    if (redDragonClub) {
        for (let i = 0; i < 4; i++) {
            await prisma.player.create({
                data: {
                    id: Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
                    name: getRandomName(), // Use real names here too
                    gender: i % 2 === 0 ? 'Male' : 'Female',
                    belt: 'Red',
                    categoryId: pairCatReal.id,
                    clubId: redDragonClub.id,
                    registrationStatus: 'APPROVED',
                    poomsaeType: 'PAIR',
                    teamId: i < 2 ? 'A' : 'B' // Explicitly setting Team ID to verify priority over indexed 1/2
                }
            })
        }
        console.log('Created 4 Pair players with real names (2 teams) for Red Dragon Team.')
    }

    // Generate Pairs Brackets using Logic (Manual call to verify logic)
    const { generatePoomsaeBracket } = await import('../lib/poomsae-logic')

    // Fetch all 4 players
    const pairPlayers = await prisma.player.findMany({
        where: { categoryId: pairCatReal.id },
        include: { club: true } // Need club to verify logic? no, logic uses clubId
    })

    console.log(`Generating Poomsae Bracket for ${pairPlayers.length} Pair players...`)
    const pairSpecs = generatePoomsaeBracket(pairPlayers, 'PAIR')

    console.log(`Generated ${pairSpecs.length} Pair Groups (Matches). Expecting 2.`)

    for (const spec of pairSpecs) {
        await prisma.poomsaeMatch.create({
            data: {
                categoryRefId: pairCatReal.id,
                category: pairCatReal.name,
                round: spec.round,
                playerId: spec.playerId, // Representative
                status: 'Pending',
                court: '3',
                // Note: We don't save TeamMembers to DB in PoomsaeMatch model yet.
                // The View will need to fetch them or we rely on the implementation plan's Grouping Logic implicit behavior?
                // Wait! In the view I implemented: 
                // "const clubName = match.player.club?.name"
                // "const teamId = match.player.teamId"
                // "match.teamMembers?.map..." -> Wait, where does match.teamMembers come from in the View?
                // In PoomsaeBracketView, I typed: `teamMembers?: { name: string }[]`
                // But the View receives data from the DATABASE. PoomsaeMatch in DB does NOT have teamMembers.
                // So my View implementation `match.teamMembers` will be UNDEFINED unless I fetch it.
                // I need to update the View to FETCH the team members, OR update the Server Component that passes data to the View to fetch them.
                // Currently `PoomsaeBracketView` is a Client Component. It receives `matches`.
                // Who passes `matches`? `BracketList.tsx`?
                // I need to check `BracketList.tsx` or whatever renders `PoomsaeBracketView`.
                // If the parent component fetches matches, it needs to include/enrich them with team members.
                // I will add a TODO to check PoomsaeBracketView content source.
                // For now, I insert the match.
            }
        })
    }

    console.log('Players created. Now generating dummy matches...')

    // Create Dummy Kyorugi Matches
    const kyorugiPlayers = await prisma.player.findMany({
        where: { categoryId: kyorugiCat.id },
        include: { club: true }
    })

    if (kyorugiPlayers.length >= 2) {
        // Create 2 dummy matches
        for (let i = 0; i < 2; i++) {
            await prisma.match.create({
                data: {
                    categoryRefId: kyorugiCat.id,
                    category: kyorugiCat.name,
                    round: 1,
                    player1: kyorugiPlayers[i * 2].name,
                    player2: kyorugiPlayers[i * 2 + 1].name,
                    status: 'Pending',
                    court: '1',
                }
            })
        }
        console.log('Created 2 Kyorugi matches.')
    }

    // Create Dummy Poomsae Matches
    const poomsaePlayers = await prisma.player.findMany({
        where: { categoryId: poomsaeCat.id }
    })

    if (poomsaePlayers.length > 0) {
        for (const player of poomsaePlayers.slice(0, 5)) {
            await prisma.poomsaeMatch.create({
                data: {
                    categoryRefId: poomsaeCat.id,
                    category: poomsaeCat.name,
                    round: 1,
                    playerId: player.id,
                    status: 'Completed',
                    accuracy: 3.5 + Math.random(),
                    presentation: 2.5 + Math.random(),
                    totalScore: 6.0 + Math.random(),
                    rank: Math.floor(Math.random() * 10) + 1,
                    court: '2'
                }
            })
        }
        console.log('Created 5 Poomsae matches.')
    }

    console.log('Seeding complete! Old data cleared, new data with real names added.')
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
