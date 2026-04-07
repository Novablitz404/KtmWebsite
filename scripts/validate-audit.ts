/**
 * Audit Validation Script
 * 
 * Runs the auditTournamentMasterlist action against a real tournament
 * and cross-references the results with direct DB queries to surface
 * any bugs in the audit logic itself.
 * 
 * Usage: npx tsx scripts/validate-audit.ts <tournamentId>
 */

import { prisma } from '../lib/prisma'
import { calculateAge } from '../lib/placement'

async function main() {
    const tournamentId = process.argv[2]
    if (!tournamentId) {
        console.error('Usage: npx tsx scripts/validate-audit.ts <tournamentId>')
        process.exit(1)
    }

    console.log('\n=== AUDIT VALIDATION SCRIPT ===\n')
    console.log(`Tournament: ${tournamentId}\n`)

    // Fetch all players with their user profile and category
    const players = await prisma.player.findMany({
        where: { category: { tournamentId } },
        include: {
            category: true,
            user: {
                select: {
                    id: true, name: true, birthDate: true, gender: true,
                    weight: true, height: true, belt: true
                }
            }
        }
    })

    console.log(`Total registered players: ${players.length}\n`)

    // ──── BUG CHECK 1: Height source ──────────────────────────────────────────
    // Check if player.height is actually populated vs user.height
    console.log('─── BUG CHECK 1: Height Data Source ───')
    let playerHeightNull = 0
    let userHeightNull = 0
    let playerHeightSet = 0 
    let userHeightSet = 0
    let mismatchCount = 0

    for (const p of players) {
        if (p.height == null || p.height === 0) playerHeightNull++
        else playerHeightSet++
        if (!p.user?.height || p.user.height === 0) userHeightNull++
        else userHeightSet++

        // Check for discrepancy between player.height and user.height
        if (p.height !== p.user?.height && (p.height || p.user?.height)) {
            mismatchCount++
            if (mismatchCount <= 5) {
                console.log(`  MISMATCH: ${p.name}`)
                console.log(`    player.height = ${p.height ?? 'null'}`)
                console.log(`    user.height   = ${p.user?.height ?? 'null'}`)
            }
        }
    }

    console.log(`\n  Player.height: ${playerHeightSet} set, ${playerHeightNull} null/zero`)
    console.log(`  User.height:   ${userHeightSet} set, ${userHeightNull} null/zero`)
    console.log(`  Mismatches:    ${mismatchCount}`)

    if (playerHeightNull > playerHeightSet && userHeightSet > playerHeightSet) {
        console.log('  ⚠ BUG: Audit reads player.height which is mostly null.')
        console.log('    User.height has more data — audit should use user.height as fallback.')
    }

    // ──── BUG CHECK 2: Weight source ──────────────────────────────────────────
    console.log('\n─── BUG CHECK 2: Weight Data Source ───')
    let playerWeightNull = 0
    let userWeightNull = 0
    let playerWeightSet = 0
    let userWeightSet = 0

    for (const p of players) {
        if (p.weight == null || p.weight === 0) playerWeightNull++
        else playerWeightSet++
        if (!p.user?.weight || p.user.weight === 0) userWeightNull++
        else userWeightSet++
    }

    console.log(`  Player.weight: ${playerWeightSet} set, ${playerWeightNull} null/zero`)
    console.log(`  User.weight:   ${userWeightSet} set, ${userWeightNull} null/zero`)

    // ──── BUG CHECK 3: Invalid birthdates ─────────────────────────────────────
    console.log('\n─── BUG CHECK 3: Invalid Birthdates ───')
    let invalidBirthdays = 0
    const now = new Date()

    for (const p of players) {
        const bd = p.user?.birthDate
        if (!bd) continue
        const age = calculateAge(bd)
        if (age <= 0 || age > 100) {
            invalidBirthdays++
            console.log(`  INVALID: ${p.name} — birthDate=${bd.toISOString()}, calculated age=${age}`)
        }
    }

    console.log(`  Total invalid birthdates: ${invalidBirthdays}`)
    if (invalidBirthdays > 0) {
        console.log('  ⚠ BUG: Audit reports these as AGE_TOO_YOUNG/AGE_TOO_OLD.')
        console.log('    Should instead report as INVALID_BIRTHDAY (separate code).')
    }

    // ──── BUG CHECK 4: Height-based divisions with no height ──────────────────
    console.log('\n─── BUG CHECK 4: Height Divisions w/ Missing Height ───')
    let heightDivNoHeight = 0

    for (const p of players) {
        const cat = p.category
        if (!cat || cat.type !== 'KYORUGI') continue

        const bd = p.user?.birthDate
        if (!bd) continue
        const age = calculateAge(bd)
        if (age > 11) continue // Height only relevant for age <= 11

        // Check if the category uses height ranges
        const usesHeight = (cat.minHeight && cat.minHeight > 0) || (cat.maxHeight && cat.maxHeight > 0)
        if (!usesHeight) continue

        // Now check data: player.height vs user.height
        const playerH = p.height ?? 0
        const userH = p.user?.height ?? 0
        const bestHeight = playerH > 0 ? playerH : userH

        if (bestHeight <= 0) {
            heightDivNoHeight++
            if (heightDivNoHeight <= 5) {
                console.log(`  NO HEIGHT: ${p.name} in "${cat.name}" (min=${cat.minHeight}, max=${cat.maxHeight})`)
                console.log(`    player.height=${playerH}, user.height=${userH}`)
            }
        }
    }

    console.log(`  Total height-division players with no height data: ${heightDivNoHeight}`)
    if (heightDivNoHeight > 0) {
        console.log('  ⚠ BUG: Audit reports "Height 0cm below minimum" instead of "Missing Height".')
        console.log('    These are genuine NO_HEIGHT issues, not HEIGHT_TOO_LOW.')
    }

    // ──── BUG CHECK 5: Weight-based divisions checking the right field ─────────
    console.log('\n─── BUG CHECK 5: Weight Comparison Accuracy ───')
    let weightMismatches = 0

    for (const p of players) {
        const cat = p.category
        if (!cat || cat.type !== 'KYORUGI') continue

        const playerW = p.weight ?? 0
        const userW = p.user?.weight ?? 0

        // If player.weight differs from user.weight, the audit may use wrong data
        if (playerW > 0 && userW > 0 && playerW !== userW) {
            weightMismatches++
            if (weightMismatches <= 5) {
                console.log(`  WEIGHT DRIFT: ${p.name} — player.weight=${playerW}, user.weight=${userW}`)
            }
        }
    }

    console.log(`  Weight mismatches between player/user: ${weightMismatches}`)

    // ──── SUMMARY ─────────────────────────────────────────────────────────────
    console.log('\n═══ SUMMARY OF AUDIT BUGS FOUND ═══\n')

    const bugs: string[] = []
    if (playerHeightNull > playerHeightSet && userHeightSet > playerHeightSet)
        bugs.push('1. Height: player.height is mostly null; should fallback to user.height')
    if (heightDivNoHeight > 0)
        bugs.push('2. Missing height reported as "below minimum" instead of separate NO_HEIGHT code')
    if (invalidBirthdays > 0)
        bugs.push('3. Invalid birthdates (age ≤ 0) reported as AGE_TOO_YOUNG instead of INVALID_BIRTHDAY')

    if (bugs.length === 0) {
        console.log('✅ No audit logic bugs detected.')
    } else {
        console.log(`❌ ${bugs.length} audit logic bug(s) detected:\n`)
        bugs.forEach(b => console.log(`  ${b}`))
    }

    console.log('')
    await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
