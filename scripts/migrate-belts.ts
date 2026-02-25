// Belt System Migration Script
// Migrates belt values from old naming to new color-based naming
//
// Old → New:
//   White       → White       (no change)
//   Low Yellow  → Yellow
//   High Yellow → Orange
//   Low Blue    → Green
//   High Blue   → Purple
//   Low Red     → Blue
//   High Red    → Maroon
//   Low Brown   → Red
//   High Brown  → Brown
//   Black       → Black       (no change)
//
// Run with: npx tsx scripts/migrate-belts.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BELT_MAPPING: Record<string, string> = {
    'Low Yellow': 'Yellow',
    'High Yellow': 'Orange',
    'Low Blue': 'Green',
    'High Blue': 'Purple',
    'Low Red': 'Blue',
    'High Red': 'Maroon',
    'Low Brown': 'Red',
    'High Brown': 'Brown',
}

async function migrateBelts() {
    console.log('🥋 Starting belt system migration...\n')

    // 1. Migrate User belts
    console.log('📋 Migrating User belts...')
    for (const [oldBelt, newBelt] of Object.entries(BELT_MAPPING)) {
        const result = await prisma.user.updateMany({
            where: { belt: oldBelt },
            data: { belt: newBelt }
        })
        if (result.count > 0) {
            console.log(`   ${oldBelt} → ${newBelt}: ${result.count} users`)
        }
    }

    // 2. Migrate Player belts
    console.log('\n📋 Migrating Player belts...')
    for (const [oldBelt, newBelt] of Object.entries(BELT_MAPPING)) {
        const result = await prisma.player.updateMany({
            where: { belt: oldBelt },
            data: { belt: newBelt }
        })
        if (result.count > 0) {
            console.log(`   ${oldBelt} → ${newBelt}: ${result.count} players`)
        }
    }

    // 3. Migrate Category belt requirements
    console.log('\n📋 Migrating Category belt requirements...')
    for (const [oldBelt, newBelt] of Object.entries(BELT_MAPPING)) {
        const result = await prisma.category.updateMany({
            where: { belt: oldBelt },
            data: { belt: newBelt }
        })
        if (result.count > 0) {
            console.log(`   ${oldBelt} → ${newBelt}: ${result.count} categories`)
        }
    }

    // Summary
    const userCount = await prisma.user.count({ where: { belt: { not: null } } })
    const playerCount = await prisma.player.count({ where: { belt: { not: null } } })
    console.log(`\n✅ Migration complete!`)
    console.log(`   ${userCount} users with belts`)
    console.log(`   ${playerCount} players with belts`)

    // Verify no old values remain
    const oldBelts = Object.keys(BELT_MAPPING)
    const remainingUsers = await prisma.user.count({ where: { belt: { in: oldBelts } } })
    const remainingPlayers = await prisma.player.count({ where: { belt: { in: oldBelts } } })

    if (remainingUsers === 0 && remainingPlayers === 0) {
        console.log('   ✅ No old belt values remaining!')
    } else {
        console.log(`   ⚠️ ${remainingUsers} users and ${remainingPlayers} players still have old belt values`)
    }
}

migrateBelts()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
