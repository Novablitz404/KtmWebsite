/**
 * Recalculate Skill Levels & Re-Place Players
 * 
 * This script:
 * 1. Reads each Player's belt from their linked User record
 * 2. Derives the correct skillLevel from the belt
 * 3. If the Player's skillLevel is wrong, recalculates it
 * 4. Re-runs category placement for mismatched players (active tournaments only)
 * 5. Skips players in "special" categories (manually assigned / custom names)
 * 
 * Usage:
 *   DRY RUN:  npx tsx scripts/recalculate-skill-levels.ts
 *   REAL RUN: npx tsx scripts/recalculate-skill-levels.ts --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// -- Skill Level Derivation (mirrors lib/skill-logic.ts) --
function deriveSkillLevel(beltInput: string | null): string {
    if (!beltInput) return 'Novice'
    const belt = beltInput.toLowerCase()

    if (
        belt.includes('blue') || belt.includes('maroon') || belt.includes('red') ||
        belt.includes('brown') || belt.includes('black') || belt.includes('poom') ||
        belt.includes('dan')
    ) return 'Advance'

    if (
        belt.includes('yellow') || belt.includes('orange') ||
        belt.includes('green') || belt.includes('purple')
    ) return 'Intermediate'

    return 'Novice'
}

// -- Simple Category Matching (mirrors lib/placement.ts) --
function calculateAge(birthDate: Date): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
    }
    return age
}

// Known belt colors for fuzzy matching
const KNOWN_BELTS = ['white', 'yellow', 'orange', 'green', 'purple', 'blue', 'maroon', 'red', 'brown', 'black', 'poom', 'dan']

function findBestCategory(player: any, categories: any[], correctSkillLevel: string, userBelt: string): any | null {
    const age = player.user?.birthDate ? calculateAge(new Date(player.user.birthDate)) : null
    const gender = player.gender || player.user?.gender || 'Male'
    const weight = player.weight ?? player.user?.weight ?? 0
    const height = player.height ?? player.user?.height ?? undefined
    const type = player.category?.type || 'KYORUGI'
    const poomsaeType = player.poomsaeType || undefined

    const matches = categories.filter(cat => {
        // Skill level
        if (cat.skillLevel && cat.skillLevel !== correctSkillLevel) return false
        // Type
        if (cat.type !== type) return false
        // Age
        if (age !== null) {
            if (cat.minAge && age < cat.minAge) return false
            if (cat.maxAge && age > cat.maxAge) return false
        }
        // Gender
        if (cat.gender && cat.gender !== 'Both' && cat.gender !== 'Mixed' && cat.gender !== gender) return false

        // Kyorugi specifics
        if (type === 'KYORUGI') {
            if (cat.minWeight && weight < cat.minWeight) return false
            if (cat.maxWeight && weight >= cat.maxWeight) return false
            if (cat.minHeight && (height || 0) < cat.minHeight) return false
            if (cat.maxHeight && (height || 0) > cat.maxHeight) return false
        }

        // Poomsae specifics
        if (type === 'POOMSAE') {
            if (cat.belt) {
                if (userBelt && cat.belt !== userBelt) return false
            } else if (userBelt) {
                const normalizedCatName = cat.name.toLowerCase()
                const normalizedPlayerBelt = userBelt.toLowerCase()
                const mentionedBelts = KNOWN_BELTS.filter(b => normalizedCatName.includes(b))
                if (mentionedBelts.length > 0) {
                    if (!normalizedCatName.includes(normalizedPlayerBelt)) return false
                }
            }
            if (poomsaeType && cat.subtype !== poomsaeType) return false
        }

        // Kyukpa specifics
        if (type === 'KYUKPA') {
            if (cat.belt) {
                if (userBelt && cat.belt !== userBelt) return false
            } else if (userBelt) {
                const normalizedCatName = cat.name.toLowerCase()
                const normalizedPlayerBelt = userBelt.toLowerCase()
                const mentionedBelts = KNOWN_BELTS.filter(b => normalizedCatName.includes(b))
                if (mentionedBelts.length > 0) {
                    if (!normalizedCatName.includes(normalizedPlayerBelt)) return false
                }
            }
        }

        return true
    })

    return matches[0] || null
}

// Check if category is "special" (manually created, no standard structure)
function isSpecialCategory(categoryName: string): boolean {
    const name = categoryName.toLowerCase()
    // Standard categories contain age group + gender + type keywords
    // Special categories might be "Exhibition Match", "Demo Team", etc.
    const standardKeywords = [
        'toddler', 'children', 'cadet', 'junior', 'senior', 'youth', 'adult',
        'male', 'female', 'mixed', 'both',
        'kyorugi', 'poomsae', 'kyukpa',
        'novice', 'intermediate', 'advance'
    ]
    const hasStandard = standardKeywords.some(kw => name.includes(kw))
    return !hasStandard
}

async function main() {
    const dryRun = !process.argv.includes('--apply')

    console.log('='.repeat(70))
    console.log(dryRun ? '🔍 DRY RUN — No changes will be made' : '⚡ LIVE RUN — Changes will be applied')
    console.log('='.repeat(70))
    console.log('')

    // Get all players with their user, category, and tournament
    const players = await prisma.player.findMany({
        where: {
            category: {
                tournament: {
                    status: { in: ['UPCOMING', 'OPEN'] }
                }
            }
        },
        include: {
            user: { select: { birthDate: true, gender: true, weight: true, height: true, belt: true } },
            category: {
                include: {
                    tournament: { select: { id: true, name: true, status: true } }
                }
            },
            club: { select: { name: true } }
        }
    })

    console.log(`Found ${players.length} players in active tournaments\n`)

    // Pre-load all categories for each tournament
    const tournamentIds = [...new Set(players.map(p => p.category?.tournament?.id).filter(Boolean))] as string[]
    const allCategories: Record<string, any[]> = {}
    for (const tid of tournamentIds) {
        allCategories[tid] = await prisma.category.findMany({ where: { tournamentId: tid } })
    }

    let skillLevelFixes = 0
    let beltFixes = 0
    let categoryFixes = 0
    let skippedSpecial = 0
    let skippedNoUser = 0

    const changes: { playerId: string; playerName: string; tournament: string; field: string; from: string; to: string }[] = []

    for (const player of players) {
        if (!player.user) {
            skippedNoUser++
            continue
        }

        const userBelt = player.user.belt || null
        const correctSkillLevel = deriveSkillLevel(userBelt)
        const currentSkillLevel = player.skillLevel || 'Novice'
        const currentBelt = player.belt || null
        const tournamentName = player.category?.tournament?.name || 'Unknown'
        const tournamentId = player.category?.tournament?.id

        // Check if in special category
        if (player.category && isSpecialCategory(player.category.name)) {
            skippedSpecial++
            continue
        }

        let needsUpdate = false
        const updateData: any = {}

        // 1. Fix belt if it differs from User's belt
        if (userBelt && currentBelt !== userBelt) {
            changes.push({
                playerId: player.id,
                playerName: player.name,
                tournament: tournamentName,
                field: 'belt',
                from: currentBelt || '(null)',
                to: userBelt
            })
            updateData.belt = userBelt
            beltFixes++
            needsUpdate = true
        }

        // 2. Fix skill level
        if (currentSkillLevel !== correctSkillLevel) {
            changes.push({
                playerId: player.id,
                playerName: player.name,
                tournament: tournamentName,
                field: 'skillLevel',
                from: currentSkillLevel,
                to: correctSkillLevel
            })
            updateData.skillLevel = correctSkillLevel
            skillLevelFixes++
            needsUpdate = true
        }

        // 3. Re-place in correct category
        if (needsUpdate && tournamentId && allCategories[tournamentId]) {
            const newCat = findBestCategory(player, allCategories[tournamentId], correctSkillLevel, userBelt || '')
            if (newCat && newCat.id !== player.categoryId) {
                changes.push({
                    playerId: player.id,
                    playerName: player.name,
                    tournament: tournamentName,
                    field: 'category',
                    from: player.category?.name || '(null)',
                    to: newCat.name
                })
                updateData.categoryId = newCat.id
                categoryFixes++
            }
        }

        // Apply
        if (needsUpdate && Object.keys(updateData).length > 0) {
            if (!dryRun) {
                await prisma.player.update({
                    where: { id: player.id },
                    data: updateData
                })
            }
        }
    }

    // Print results
    console.log('\n' + '='.repeat(70))
    console.log('CHANGES' + (dryRun ? ' (PREVIEW)' : ' (APPLIED)'))
    console.log('='.repeat(70))

    if (changes.length === 0) {
        console.log('\n✅ No discrepancies found! All players are correctly placed.')
    } else {
        // Group by player
        const grouped: Record<string, typeof changes> = {}
        for (const c of changes) {
            const key = `${c.playerName} (${c.playerId}) — ${c.tournament}`
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(c)
        }

        for (const [key, playerChanges] of Object.entries(grouped)) {
            console.log(`\n📌 ${key}`)
            for (const c of playerChanges) {
                console.log(`   ${c.field}: ${c.from} → ${c.to}`)
            }
        }
    }

    console.log('\n' + '-'.repeat(70))
    console.log(`Summary:`)
    console.log(`  Belt mismatches fixed:        ${beltFixes}`)
    console.log(`  Skill level mismatches fixed: ${skillLevelFixes}`)
    console.log(`  Category re-placements:       ${categoryFixes}`)
    console.log(`  Skipped (special category):   ${skippedSpecial}`)
    console.log(`  Skipped (no linked user):     ${skippedNoUser}`)
    console.log(`  Total players scanned:        ${players.length}`)
    console.log('-'.repeat(70))

    if (dryRun && changes.length > 0) {
        console.log('\n⚠️  This was a DRY RUN. To apply these changes, run:')
        console.log('    npx tsx scripts/recalculate-skill-levels.ts --apply\n')
    }

    await prisma.$disconnect()
}

main().catch(e => {
    console.error('Script failed:', e)
    prisma.$disconnect()
    process.exit(1)
})
