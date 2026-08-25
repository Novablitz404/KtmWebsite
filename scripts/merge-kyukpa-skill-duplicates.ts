/**
 * Merge Kyukpa Skill-Level Duplicates
 *
 * Kyukpa is a scored discipline (like Poomsae) and should never have been
 * split into Novice/Intermediate/Advance variants — that was a bug in the
 * template-generation code (fixed in app/actions.ts) that treated Kyukpa
 * like Kyorugi. This script cleans up categories that were already created
 * by the buggy generator: for every belt division that has 2-3 duplicate
 * Kyukpa categories differing only by the "Novice"/"Intermediate"/"Advance"
 * word in their name, it merges them into a single category with no skill
 * level, moving over any players and any already-generated matches.
 *
 * Grouping: KYUKPA categories in the same tournament whose name is
 * identical once the skill-level word is stripped out are treated as one
 * group (e.g. "Cadet Female Advance Kyukpa - Red Belt" and "Cadet Female
 * Novice Kyukpa - Red Belt" both normalize to "Cadet Female Kyukpa - Red
 * Belt"). Groups of size 1 (nothing to merge) are left untouched.
 *
 * Keeper selection: if any category in a group already has matches
 * generated (poomsaeMatches.length > 0), that one MUST be the keeper —
 * matches never get discarded. If more than one variant in a group has
 * matches, the group is skipped and flagged for manual review (ambiguous —
 * can't auto-decide which bracket to keep). Otherwise the keeper is
 * whichever variant has the most players.
 *
 * The keeper is renamed to the skill-level-stripped name, skillLevel is set
 * to null, and poomsaeFormat is forced to SCORED. Players and any
 * PoomsaeMatch rows on the other variants are reassigned onto the keeper,
 * then the emptied duplicate categories are deleted. Each group's changes
 * run in a single transaction.
 *
 * Usage:
 *   npx tsx scripts/merge-kyukpa-skill-duplicates.ts --tournament=<id>            (dry run, one tournament)
 *   npx tsx scripts/merge-kyukpa-skill-duplicates.ts --tournament=<id> --apply    (apply, one tournament)
 *   npx tsx scripts/merge-kyukpa-skill-duplicates.ts --all                       (dry run, every tournament)
 *   npx tsx scripts/merge-kyukpa-skill-duplicates.ts --all --apply               (apply, every tournament)
 *
 * Test against a testnet/staging database first — point DATABASE_URL at it
 * before running. Always run the dry run and read the report before --apply.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const apply = process.argv.includes('--apply')
const all = process.argv.includes('--all')
const tournamentArg = process.argv.find(a => a.startsWith('--tournament='))
const tournamentId = tournamentArg ? tournamentArg.split('=')[1] : null

const SKILL_WORDS = ['Novice', 'Intermediate', 'Advance']

function stripSkillWord(name: string): string {
    let stripped = name
    for (const word of SKILL_WORDS) {
        stripped = stripped.replace(new RegExp(`\\b${word}\\b`), '')
    }
    return stripped.replace(/\s+/g, ' ').trim()
}

async function main() {
    if (!all && !tournamentId) {
        console.error('Usage: npx tsx scripts/merge-kyukpa-skill-duplicates.ts (--tournament=<id> | --all) [--apply]')
        process.exit(1)
    }

    console.log(apply ? 'APPLYING changes...\n' : 'DRY RUN — pass --apply to write changes.\n')

    const categories = await prisma.category.findMany({
        where: { type: 'KYUKPA', ...(tournamentId ? { tournamentId } : {}) },
        select: {
            id: true, name: true, tournamentId: true, skillLevel: true, poomsaeFormat: true,
            _count: { select: { players: true, poomsaeMatches: true } },
        },
    })

    // Group by (tournamentId, name-with-skill-word-stripped)
    const groups = new Map<string, typeof categories>()
    for (const cat of categories) {
        const key = `${cat.tournamentId}::${stripSkillWord(cat.name)}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(cat)
    }

    let mergedGroups = 0, skippedGroups = 0, untouchedGroups = 0
    let playersMoved = 0, matchesMoved = 0, categoriesDeleted = 0

    for (const [key, group] of groups) {
        if (group.length < 2) { untouchedGroups++; continue }

        const normalizedName = stripSkillWord(group[0].name)
        const withMatches = group.filter(c => c._count.poomsaeMatches > 0)

        if (withMatches.length > 1) {
            console.log(`SKIP (ambiguous — ${withMatches.length} variants already have matches): ${normalizedName} [tournament ${group[0].tournamentId}]`)
            for (const c of group) console.log(`    [${c.skillLevel || 'null'}] ${c.name} — players:${c._count.players} matches:${c._count.poomsaeMatches}`)
            skippedGroups++
            continue
        }

        const keeper = withMatches[0]
            || [...group].sort((a, b) => b._count.players - a._count.players)[0]
        const losers = group.filter(c => c.id !== keeper.id)

        console.log(`MERGE: ${normalizedName} [tournament ${keeper.tournamentId}]`)
        console.log(`  keep    [${keeper.skillLevel || 'null'}] ${keeper.name} (id ${keeper.id}) — players:${keeper._count.players} matches:${keeper._count.poomsaeMatches}`)
        for (const l of losers) {
            console.log(`  merge   [${l.skillLevel || 'null'}] ${l.name} (id ${l.id}) — players:${l._count.players} matches:${l._count.poomsaeMatches} -> keeper`)
        }

        playersMoved += losers.reduce((sum, l) => sum + l._count.players, 0)
        matchesMoved += losers.reduce((sum, l) => sum + l._count.poomsaeMatches, 0)
        categoriesDeleted += losers.length
        mergedGroups++

        if (apply) {
            await prisma.$transaction([
                ...losers.map(l => prisma.player.updateMany({
                    where: { categoryId: l.id },
                    data: { categoryId: keeper.id },
                })),
                ...losers.map(l => prisma.poomsaeMatch.updateMany({
                    where: { categoryRefId: l.id },
                    data: { categoryRefId: keeper.id, category: normalizedName },
                })),
                prisma.category.deleteMany({ where: { id: { in: losers.map(l => l.id) } } }),
                prisma.category.update({
                    where: { id: keeper.id },
                    data: { name: normalizedName, skillLevel: null, poomsaeFormat: 'SCORED' },
                }),
                // Keeper's own already-generated matches (if any) still reference its old name.
                prisma.poomsaeMatch.updateMany({
                    where: { categoryRefId: keeper.id },
                    data: { category: normalizedName },
                }),
            ])
        }
    }

    console.log(`\n${mergedGroups} group(s) ${apply ? 'merged' : 'would be merged'} (${categoriesDeleted} categories ${apply ? 'deleted' : 'would be deleted'}, ${playersMoved} players ${apply ? 'moved' : 'would move'}, ${matchesMoved} matches ${apply ? 'moved' : 'would move'})`)
    if (skippedGroups > 0) console.log(`${skippedGroups} group(s) skipped — needs manual review (see SKIP lines above)`)
    console.log(`${untouchedGroups} group(s) already had no duplicates`)
    if (!apply && mergedGroups > 0) console.log('\nRe-run with --apply to write these changes.')
}

main().finally(() => prisma.$disconnect())
