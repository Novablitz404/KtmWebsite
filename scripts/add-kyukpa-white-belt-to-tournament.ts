/**
 * Add Kyukpa White Belt (to an already-generated tournament)
 *
 * The template fix (scripts/add-kyukpa-white-belt.ts) only affects NEW
 * tournaments generated going forward. This script is the equivalent for
 * tournaments that already had their Kyukpa categories generated (and
 * already had the Novice/Intermediate/Advance duplicates merged via
 * scripts/merge-kyukpa-skill-duplicates.ts) — it adds the missing "White
 * Belt" Category row per (division, gender) family that's missing one,
 * cloning the sibling "Yellow Belt" category's settings (age/weight/height
 * bounds, subtype, poomsaeFormat, court/schedule defaults) with belt/name
 * swapped to White and a fresh empty seedOrder.
 *
 * Grouping: KYUKPA categories in the same tournament whose name is
 * identical once the belt word is stripped are one "family" (e.g. "Grade
 * School Female Kyukpa - Yellow Belt" and "...- Black Belt" both normalize
 * to "Grade School Female Kyukpa -"). A family missing a White member gets
 * one added, cloned from its Yellow member (or any member if Yellow is
 * somehow missing).
 *
 * Idempotent — skips any family that already has a White Belt category.
 *
 * Usage:
 *   npx tsx scripts/add-kyukpa-white-belt-to-tournament.ts --tournament=<id>            (dry run)
 *   npx tsx scripts/add-kyukpa-white-belt-to-tournament.ts --tournament=<id> --apply    (apply)
 *   npx tsx scripts/add-kyukpa-white-belt-to-tournament.ts --all [--apply]              (every tournament)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const all = process.argv.includes('--all')
const tournamentArg = process.argv.find(a => a.startsWith('--tournament='))
const tournamentId = tournamentArg ? tournamentArg.split('=')[1] : null

const BELT_WORDS = ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Red', 'Maroon', 'Brown', 'Black']

function stripBeltWord(name: string): string {
    let stripped = name
    for (const word of BELT_WORDS) {
        stripped = stripped.replace(new RegExp(`\\b${word} Belt\\b`), '')
    }
    return stripped.replace(/\s+/g, ' ').trim()
}

async function main() {
    if (!all && !tournamentId) {
        console.error('Usage: npx tsx scripts/add-kyukpa-white-belt-to-tournament.ts (--tournament=<id> | --all) [--apply]')
        process.exit(1)
    }

    console.log(apply ? 'APPLYING changes...\n' : 'DRY RUN — pass --apply to write changes.\n')

    const categories = await prisma.category.findMany({
        where: { type: 'KYUKPA', ...(tournamentId ? { tournamentId } : {}) },
    })

    const families = new Map<string, typeof categories>()
    for (const cat of categories) {
        const key = `${cat.tournamentId}::${stripBeltWord(cat.name)}`
        if (!families.has(key)) families.set(key, [])
        families.get(key)!.push(cat)
    }

    let toCreate = 0, skipped = 0
    const creates: any[] = []

    for (const [key, family] of families) {
        if (family.some(c => c.belt === 'White')) { skipped++; continue }

        const template = family.find(c => c.belt === 'Yellow') || family[0]
        const familyName = stripBeltWord(template.name)
        const newName = `${familyName} White Belt`

        console.log(`ADD: "${newName}" [tournament ${template.tournamentId}] (cloned from "${template.name}")`)

        creates.push({
            name: newName,
            tournamentId: template.tournamentId,
            type: 'KYUKPA',
            subtype: template.subtype,
            poomsaeForms: template.poomsaeForms,
            poomsaeFormat: template.poomsaeFormat || 'SCORED',
            court: null,
            skillLevel: null,
            deferFinals: template.deferFinals,
            scheduleDay: template.scheduleDay,
            deferFinalsToDay: template.deferFinalsToDay,
            deferSemisToDay: template.deferSemisToDay,
            minAge: template.minAge,
            maxAge: template.maxAge,
            minWeight: template.minWeight,
            maxWeight: template.maxWeight,
            minHeight: template.minHeight,
            maxHeight: template.maxHeight,
            gender: template.gender,
            belt: 'White',
            seedOrder: [],
        })
        toCreate++
    }

    if (apply && creates.length > 0) {
        await prisma.category.createMany({ data: creates })
    }

    console.log(`\n${toCreate} White Belt categor${toCreate === 1 ? 'y' : 'ies'} ${apply ? 'created' : 'would be created'}`)
    console.log(`${skipped} famil${skipped === 1 ? 'y' : 'ies'} already had a White Belt category — skipped`)
    if (!apply && toCreate > 0) console.log('\nRe-run with --apply to write these changes.')
}

main().finally(() => prisma.$disconnect())
