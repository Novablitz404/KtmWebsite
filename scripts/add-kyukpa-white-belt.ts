/**
 * Add Kyukpa White Belt
 *
 * The Kyukpa belt divisions in the guideline templates were missing "White
 * Belt" (the entry-level belt, below Yellow) entirely. This script adds one
 * "Kyukpa - White Belt" WeightCategory per (division, gender) that already
 * has a "Kyukpa - Yellow Belt" row, copying that row's weight/height/subtype/
 * format fields and inserting it just before Yellow in display order.
 *
 * Idempotent — skips any (division, gender) that already has a White Belt
 * Kyukpa row, so it's safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/add-kyukpa-white-belt.ts --template=<id>            (dry run, one template)
 *   npx tsx scripts/add-kyukpa-white-belt.ts --template=<id> --apply    (apply, one template)
 *   npx tsx scripts/add-kyukpa-white-belt.ts --all [--apply]            (every template)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const all = process.argv.includes('--all')
const templateArg = process.argv.find(a => a.startsWith('--template='))
const templateId = templateArg ? templateArg.split('=')[1] : null

async function main() {
    if (!all && !templateId) {
        console.error('Usage: npx tsx scripts/add-kyukpa-white-belt.ts (--template=<id> | --all) [--apply]')
        process.exit(1)
    }

    console.log(apply ? 'APPLYING changes...\n' : 'DRY RUN — pass --apply to write changes.\n')

    const yellowRows = await prisma.weightCategory.findMany({
        where: {
            type: 'KYUKPA',
            belt: 'Yellow',
            ...(templateId ? { division: { templateId } } : {}),
        },
        include: { division: { include: { template: true } } },
    })

    const existingWhite = await prisma.weightCategory.findMany({
        where: { type: 'KYUKPA', belt: 'White' },
        select: { divisionId: true, gender: true },
    })
    const hasWhite = new Set(existingWhite.map(w => `${w.divisionId}::${w.gender}`))

    let toCreate = 0, skipped = 0
    const creates: any[] = []

    for (const y of yellowRows) {
        const key = `${y.divisionId}::${y.gender}`
        if (hasWhite.has(key)) { skipped++; continue }

        const name = y.name.replace(/Yellow Belt/i, 'White Belt')
        console.log(`ADD: "${name}" (${y.gender}) -> ${y.division.template.name} / ${y.division.name} [displayOrder ${y.displayOrder - 2}]`)

        creates.push({
            name,
            gender: y.gender,
            minWeight: y.minWeight,
            maxWeight: y.maxWeight,
            minHeight: y.minHeight,
            maxHeight: y.maxHeight,
            displayOrder: y.displayOrder - 2, // sorts just before this Yellow Belt row
            type: 'KYUKPA',
            subtype: y.subtype,
            poomsaeForms: y.poomsaeForms,
            belt: 'White',
            poomsaeFormat: y.poomsaeFormat || 'SCORED',
            divisionId: y.divisionId,
        })
        toCreate++
    }

    if (apply && creates.length > 0) {
        await prisma.weightCategory.createMany({ data: creates })
    }

    console.log(`\n${toCreate} White Belt row(s) ${apply ? 'created' : 'would be created'}`)
    console.log(`${skipped} (division, gender) pair(s) already had a White Belt row — skipped`)
    if (!apply && toCreate > 0) console.log('\nRe-run with --apply to write these changes.')
}

main().finally(() => prisma.$disconnect())
