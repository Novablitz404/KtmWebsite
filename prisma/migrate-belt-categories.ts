import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Belt System Migration Script
 * 
 * Migrates existing tournaments from the old 5-belt system to the new 9-belt system.
 * 
 * Old: Yellow, Blue, Red, Brown, Black
 * New: Yellow, Orange, Green, Purple, Blue, Red, Maroon, Brown, Black
 * 
 * Strategy:
 * - Rename old categories to their "Low" equivalent in the new system
 * - Create new sibling categories for the "High" equivalent
 * - Leave all existing players in their current categories (unchanged categoryId)
 * - Rename order matters to avoid name collisions: Blue→Green first, then Red→Blue
 * 
 * Usage:
 *   DRY_RUN=true npx tsx prisma/migrate-belt-categories.ts    # Preview changes
 *   npx tsx prisma/migrate-belt-categories.ts                  # Execute changes
 */

const DRY_RUN = process.env.DRY_RUN === 'true'
const TOURNAMENT_ID = process.env.TOURNAMENT_ID || null

// Belt rename mapping: old belt → new belt name (the "Low" variant)
// The old category keeps its ID (players stay linked), just the name/belt field changes
const BELT_RENAMES: Record<string, string> = {
    // 'Yellow' stays as 'Yellow' — no rename needed
    'Blue': 'Green',    // Old "Blue Belt" → now "Green Belt" (Low Blue)
    'Red': 'Blue',      // Old "Red Belt" → now "Blue Belt" (Low Red) — must happen AFTER Blue→Green
    'Brown': 'Maroon',  // Old "Brown Belt" → now "Maroon Belt" (Low Brown)
}

// New sibling categories to create (the "High" variant for each split)
const NEW_SIBLINGS: Record<string, string> = {
    'Yellow': 'Orange',   // Yellow gets an "Orange" (High Yellow) sibling
    'Green': 'Purple',    // (was Blue) Green gets a "Purple" (High Blue) sibling
    'Blue': 'Red',        // (was Red) Blue gets a "Red" (High Red) sibling
    'Maroon': 'Brown',    // (was Brown) Maroon gets a "Brown" (High Brown) sibling
}

// Poomsae form mapping for new belts (shares parent's form)
const POOMSAE_FORMS: Record<string, string> = {
    'Orange': 'Taegeuk 2',
    'Purple': 'Taegeuk 4',
    'Red': 'Taegeuk 6',
    'Brown': 'Taegeuk 8',
}

async function main() {
    console.log(`\n🥋 Belt System Migration Script`)
    console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '🔥 LIVE EXECUTION'}`)
    console.log(`   Target: ${TOURNAMENT_ID ? `Tournament ${TOURNAMENT_ID}` : 'ALL tournaments'}\n`)

    // Find all belt-based categories (Poomsae + Kyukpa) that use old belt names
    const oldBeltCategories = await prisma.category.findMany({
        where: {
            belt: { in: ['Yellow', 'Blue', 'Red', 'Brown'] },
            type: { in: ['POOMSAE', 'KYUKPA'] },
            ...(TOURNAMENT_ID ? { tournamentId: TOURNAMENT_ID } : {}),
        },
        include: {
            tournament: { select: { id: true, name: true } },
            _count: { select: { players: true } },
        },
        orderBy: [
            { tournament: { name: 'asc' } },
            { type: 'asc' },
            { belt: 'asc' },
        ],
    })

    if (oldBeltCategories.length === 0) {
        console.log('✅ No old-style belt categories found. Nothing to migrate.\n')
        return
    }

    // Group by tournament for clean output
    const byTournament = new Map<string, typeof oldBeltCategories>()
    for (const cat of oldBeltCategories) {
        const key = cat.tournament.name
        if (!byTournament.has(key)) byTournament.set(key, [])
        byTournament.get(key)!.push(cat)
    }

    console.log(`Found ${oldBeltCategories.length} categories across ${byTournament.size} tournament(s):\n`)

    let totalRenamed = 0
    let totalCreated = 0

    for (const [tournamentName, categories] of Array.from(byTournament)) {
        console.log(`📋 Tournament: ${tournamentName}`)

        // PHASE 1: Rename (order matters!)
        // Must rename Blue→Green BEFORE Red→Blue to avoid name collision
        const renameOrder = ['Blue', 'Brown', 'Red'] // Blue first, then Brown, then Red (uses freed "Blue" name)

        for (const oldBelt of renameOrder) {
            const newBelt = BELT_RENAMES[oldBelt]
            if (!newBelt) continue

            const toRename = categories.filter(c => c.belt === oldBelt)
            for (const cat of toRename) {
                const newName = cat.name.replace(`${oldBelt} Belt`, `${newBelt} Belt`)
                console.log(`   🔄 RENAME: "${cat.name}" (${cat.gender}) → "${newName}" [${cat._count.players} players]`)

                if (!DRY_RUN) {
                    await prisma.category.update({
                        where: { id: cat.id },
                        data: {
                            name: newName,
                            belt: newBelt,
                        },
                    })
                }
                totalRenamed++
            }
        }

        // PHASE 2: Create new sibling categories
        // After renames, categories now have belts: Yellow, Green, Blue (was Red), Maroon (was Brown)
        // We need siblings: Orange, Purple, Red (new), Brown (new)

        // Refresh categories after rename to get current state
        const currentCategories = DRY_RUN
            ? categories.map(c => ({
                ...c,
                belt: BELT_RENAMES[c.belt!] || c.belt,
                name: BELT_RENAMES[c.belt!] ? c.name.replace(`${c.belt} Belt`, `${BELT_RENAMES[c.belt!]} Belt`) : c.name,
            }))
            : await prisma.category.findMany({
                where: {
                    tournamentId: categories[0].tournament.id,
                    belt: { in: ['Yellow', 'Green', 'Blue', 'Maroon'] },
                    type: { in: ['POOMSAE', 'KYUKPA'] },
                },
            })

        for (const cat of currentCategories) {
            const siblingBelt = NEW_SIBLINGS[cat.belt!]
            if (!siblingBelt) continue

            const siblingName = cat.name.replace(`${cat.belt} Belt`, `${siblingBelt} Belt`)
            const poomsaeForms = cat.type === 'POOMSAE' ? (POOMSAE_FORMS[siblingBelt] || null) : null

            console.log(`   ➕ CREATE: "${siblingName}" (${cat.gender}) [empty]`)

            if (!DRY_RUN) {
                await prisma.category.create({
                    data: {
                        tournamentId: categories[0].tournament.id,
                        name: siblingName,
                        type: cat.type,
                        subtype: cat.subtype,
                        gender: cat.gender,
                        belt: siblingBelt,
                        minAge: cat.minAge,
                        maxAge: cat.maxAge,
                        minWeight: cat.minWeight,
                        maxWeight: cat.maxWeight,
                        minHeight: cat.minHeight,
                        maxHeight: cat.maxHeight,
                        skillLevel: cat.skillLevel,
                        poomsaeForms: poomsaeForms,
                    },
                })
            }
            totalCreated++
        }

        console.log('')
    }

    console.log(`\n${'─'.repeat(50)}`)
    console.log(`📊 Summary:`)
    console.log(`   Renamed: ${totalRenamed} categories`)
    console.log(`   Created: ${totalCreated} new categories`)
    console.log(`   Players: All existing players left in place (no categoryId changes)`)

    if (DRY_RUN) {
        console.log(`\n⚠️  This was a DRY RUN. No changes were made.`)
        console.log(`   To execute, run without DRY_RUN=true\n`)
    } else {
        console.log(`\n✅ Migration complete!\n`)
    }
}

main()
    .catch((e) => {
        console.error('Migration failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
