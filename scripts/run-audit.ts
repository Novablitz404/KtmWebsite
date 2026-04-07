import { PrismaClient } from '@prisma/client'
import { deriveSkillLevel } from '../lib/skill-logic'

const prisma = new PrismaClient()

// ── Placement logic (mirrored from lib/placement.ts) ─────────────────────────
function calculateAge(birthDate: Date | string): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
    }
    return age
}


// ── Types ────────────────────────────────────────────────────────────────────
type AuditIssue = {
    playerId: string
    playerName: string
    categoryName: string
    categoryType: string
    severity: 'error' | 'warning'
    code: string
    message: string
}

const tournamentId = process.argv[2]
if (!tournamentId) {
    console.error('Usage: npx tsx scripts/run-audit.ts <tournamentId>')
    process.exit(1)
}

async function main() {
    console.log(`\n🔍 Running Masterlist Audit for tournament: ${tournamentId}\n`)

    // Fetch all players with User profile and category
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

    console.log(`📋 Total registered players: ${players.length}\n`)

    const issues: AuditIssue[] = []

    for (const player of players) {
        const cat = player.category
        if (!cat) continue

        const ctx = {
            playerId: player.id,
            playerName: player.name,
            categoryName: cat.name,
            categoryType: cat.type,
        }

        // DATA: User profile (source of truth) → Player record (fallback for guest/orphaned)
        const user = player.user
        const birthDate = user?.birthDate ?? null
        const gender = user?.gender ?? player.gender ?? null
        const weight = user?.weight ?? player.weight ?? 0
        const height = user?.height ?? player.height ?? 0
        const belt = user?.belt ?? player.belt ?? null
        const skillLevel = belt ? deriveSkillLevel(belt) : null

        // Category metric detection
        const usesHeight = (cat.minHeight != null && cat.minHeight > 0) || (cat.maxHeight != null && cat.maxHeight > 0)
        const usesWeight = (cat.minWeight != null && cat.minWeight > 0) || (cat.maxWeight != null && cat.maxWeight > 0)

        // 1. No birthday
        if (!birthDate) {
            issues.push({ ...ctx, severity: 'error', code: 'NO_BIRTHDAY',
                message: 'No birthday on file — age division cannot be verified.' })
        }

        // 2. Invalid birthday
        const age = birthDate ? calculateAge(birthDate) : null
        const validAge = age !== null && age > 0 && age <= 100

        if (age !== null && !validAge) {
            issues.push({ ...ctx, severity: 'error', code: 'INVALID_BIRTHDAY',
                message: `Birthday ${birthDate!.toISOString().slice(0, 10)} is invalid (calculated age: ${age}).` })
        }

        // 3. No gender
        if (!gender) {
            issues.push({ ...ctx, severity: 'error', code: 'NO_GENDER',
                message: 'No gender on file.' })
        }

        // 4. No weight — ONLY for weight-based categories
        if (cat.type === 'KYORUGI' && usesWeight && weight <= 0) {
            issues.push({ ...ctx, severity: 'error', code: 'NO_WEIGHT',
                message: 'No weight on file — required for weight-based division.' })
        }

        // 5. No height — ONLY for height-based categories
        if (cat.type === 'KYORUGI' && usesHeight && height <= 0) {
            issues.push({ ...ctx, severity: 'error', code: 'NO_HEIGHT',
                message: 'No height on file — required for height-based division.' })
        }

        // 6. Age out of range
        if (validAge) {
            if (cat.minAge && age! < cat.minAge) {
                issues.push({ ...ctx, severity: 'error', code: 'AGE_TOO_YOUNG',
                    message: `Age ${age} is below the category minimum of ${cat.minAge}.` })
            }
            if (cat.maxAge && age! > cat.maxAge) {
                issues.push({ ...ctx, severity: 'error', code: 'AGE_TOO_OLD',
                    message: `Age ${age} exceeds the category maximum of ${cat.maxAge}.` })
            }
        }

        // 7. Gender mismatch
        if (gender && cat.gender && cat.gender !== 'Both' && cat.gender !== 'Mixed' && cat.gender !== gender) {
            issues.push({ ...ctx, severity: 'error', code: 'GENDER_MISMATCH',
                message: `Gender (${gender}) ≠ category (${cat.gender}).` })
        }

        // 8. Weight out of range — ONLY weight-based
        if (cat.type === 'KYORUGI' && usesWeight && weight > 0) {
            if (cat.minWeight && weight < cat.minWeight) {
                issues.push({ ...ctx, severity: 'error', code: 'WEIGHT_TOO_LOW',
                    message: `Weight ${weight}kg < min ${cat.minWeight}kg.` })
            }
            if (cat.maxWeight && weight >= cat.maxWeight) {
                issues.push({ ...ctx, severity: 'error', code: 'WEIGHT_TOO_HIGH',
                    message: `Weight ${weight}kg ≥ limit ${cat.maxWeight}kg.` })
            }
        }

        // 9. Height out of range — ONLY height-based
        if (cat.type === 'KYORUGI' && usesHeight && height > 0) {
            if (cat.minHeight && height < cat.minHeight) {
                issues.push({ ...ctx, severity: 'error', code: 'HEIGHT_TOO_LOW',
                    message: `Height ${height}cm < min ${cat.minHeight}cm.` })
            }
            if (cat.maxHeight && height > cat.maxHeight) {
                issues.push({ ...ctx, severity: 'error', code: 'HEIGHT_TOO_HIGH',
                    message: `Height ${height}cm > max ${cat.maxHeight}cm.` })
            }
        }

        // 10. Belt mismatch
        if (cat.belt && belt && cat.belt !== belt) {
            issues.push({ ...ctx, severity: 'warning', code: 'BELT_MISMATCH',
                message: `Belt (${belt}) ≠ category belt (${cat.belt}).` })
        }

        // 11. Skill level mismatch
        if (cat.skillLevel && skillLevel && cat.skillLevel !== skillLevel) {
            issues.push({ ...ctx, severity: 'warning', code: 'SKILL_MISMATCH',
                message: `Derived skill (${skillLevel}) ≠ category (${cat.skillLevel}).` })
        }
    }

    // ── Print Results ─────────────────────────────────────────────────────────
    const errors = issues.filter(i => i.severity === 'error')
    const warnings = issues.filter(i => i.severity === 'warning')

    console.log(`${'═'.repeat(70)}`)
    console.log(`  AUDIT RESULTS`)
    console.log(`${'═'.repeat(70)}`)
    console.log(`  Total Players: ${players.length}`)
    console.log(`  Errors:   ${errors.length}`)
    console.log(`  Warnings: ${warnings.length}`)
    console.log(`  Clean:    ${players.length - new Set(issues.map(i => i.playerId)).size}`)
    console.log(`${'═'.repeat(70)}\n`)

    if (errors.length > 0) {
        console.log(`❌ ERRORS (${errors.length})`)
        console.log(`${'─'.repeat(70)}`)

        // Group by code
        const byCode = new Map<string, AuditIssue[]>()
        for (const e of errors) {
            if (!byCode.has(e.code)) byCode.set(e.code, [])
            byCode.get(e.code)!.push(e)
        }

        for (const [code, items] of byCode) {
            console.log(`\n  📌 ${code} (${items.length} issues)`)
            for (const item of items.slice(0, 10)) {
                console.log(`     • ${item.playerName} — ${item.categoryName}`)
                console.log(`       ${item.message}`)
            }
            if (items.length > 10) {
                console.log(`     ... and ${items.length - 10} more`)
            }
        }
    }

    if (warnings.length > 0) {
        console.log(`\n⚠️  WARNINGS (${warnings.length})`)
        console.log(`${'─'.repeat(70)}`)

        const byCode = new Map<string, AuditIssue[]>()
        for (const w of warnings) {
            if (!byCode.has(w.code)) byCode.set(w.code, [])
            byCode.get(w.code)!.push(w)
        }

        for (const [code, items] of byCode) {
            console.log(`\n  📌 ${code} (${items.length} issues)`)
            for (const item of items.slice(0, 10)) {
                console.log(`     • ${item.playerName} — ${item.categoryName}`)
                console.log(`       ${item.message}`)
            }
            if (items.length > 10) {
                console.log(`     ... and ${items.length - 10} more`)
            }
        }
    }

    if (issues.length === 0) {
        console.log(`✅ All ${players.length} players passed the audit — no discrepancies found!`)
    }

    console.log('')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
