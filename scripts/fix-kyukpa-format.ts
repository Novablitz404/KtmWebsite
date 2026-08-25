/**
 * Fix Kyukpa Format
 *
 * Kyukpa is a scored discipline (like Poomsae's ranked-rounds format) — it
 * should never be HEAD_TO_HEAD. This script forces poomsaeFormat = 'SCORED'
 * on every KYUKPA row, in both:
 *   - Category      (already-generated tournaments)
 *   - WeightCategory (admin guideline templates)
 *
 * Usage:
 *   DRY RUN:  npx tsx scripts/fix-kyukpa-format.ts
 *   REAL RUN: npx tsx scripts/fix-kyukpa-format.ts --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')

async function main() {
    console.log(apply ? 'APPLYING changes...' : 'DRY RUN — pass --apply to write changes.\n')

    // -- Category (per-tournament, already-generated events) --
    const badCategories = await prisma.category.findMany({
        where: { type: 'KYUKPA', poomsaeFormat: { not: 'SCORED' } },
        select: { id: true, name: true, poomsaeFormat: true, tournamentId: true },
    })
    console.log(`Category rows to fix: ${badCategories.length}`)
    for (const c of badCategories) {
        console.log(`  ${c.name} (tournament ${c.tournamentId}): ${c.poomsaeFormat} -> SCORED`)
    }
    if (apply && badCategories.length > 0) {
        const result = await prisma.category.updateMany({
            where: { type: 'KYUKPA', poomsaeFormat: { not: 'SCORED' } },
            data: { poomsaeFormat: 'SCORED' },
        })
        console.log(`  Updated ${result.count} Category rows.`)
    }

    // -- WeightCategory (admin guideline templates) --
    const badTemplates = await prisma.weightCategory.findMany({
        where: { type: 'KYUKPA', poomsaeFormat: { not: 'SCORED' } },
        select: { id: true, name: true, poomsaeFormat: true, divisionId: true },
    })
    console.log(`\nWeightCategory (template) rows to fix: ${badTemplates.length}`)
    for (const c of badTemplates) {
        console.log(`  ${c.name} (division ${c.divisionId}): ${c.poomsaeFormat} -> SCORED`)
    }
    if (apply && badTemplates.length > 0) {
        const result = await prisma.weightCategory.updateMany({
            where: { type: 'KYUKPA', poomsaeFormat: { not: 'SCORED' } },
            data: { poomsaeFormat: 'SCORED' },
        })
        console.log(`  Updated ${result.count} WeightCategory rows.`)
    }

    if (badCategories.length === 0 && badTemplates.length === 0) {
        console.log('\nNothing to fix — every Kyukpa row is already SCORED.')
    } else if (!apply) {
        console.log('\nRe-run with --apply to write these changes.')
    }
}

main().finally(() => prisma.$disconnect())
