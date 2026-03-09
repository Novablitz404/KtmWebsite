/**
 * One-time migration: Normalize all existing names in the database to Title Case.
 * 
 * Usage:
 *   npx tsx prisma/normalize-names.ts              # Dry run (preview only)
 *   DRY_RUN=false npx tsx prisma/normalize-names.ts # Live execution
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.env.DRY_RUN !== 'false'

function toTitleCase(str: string): string {
    if (!str) return ''
    const romanNumerals = /^(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XX)$/
    return str
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\.(?=\p{L})/gu, '. ')
        .split(/\s+/)
        .map(word =>
            word.split('-')
                .map(part => {
                    if (romanNumerals.test(part)) return part.toUpperCase()
                    if (!part) return part
                    return part.charAt(0).toUpperCase() + part.substring(1).toLowerCase()
                })
                .join('-')
        )
        .join(' ')
}

async function main() {
    console.log(`\n🔤 Name Normalization Migration ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}\n`)

    // 1. Normalize User names
    const users = await prisma.user.findMany({
        where: { name: { not: null } },
        select: { id: true, name: true }
    })

    let userChanges = 0
    for (const user of users) {
        if (!user.name) continue
        const normalized = toTitleCase(user.name)
        if (normalized !== user.name) {
            console.log(`  User: "${user.name}" → "${normalized}"`)
            if (!DRY_RUN) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { name: normalized }
                })
            }
            userChanges++
        }
    }

    // 2. Normalize Player names
    const players = await prisma.player.findMany({
        select: { id: true, name: true }
    })

    let playerChanges = 0
    for (const player of players) {
        if (!player.name) continue
        const normalized = toTitleCase(player.name)
        if (normalized !== player.name) {
            console.log(`  Player: "${player.name}" → "${normalized}"`)
            if (!DRY_RUN) {
                await prisma.player.update({
                    where: { id: player.id },
                    data: { name: normalized }
                })
            }
            playerChanges++
        }
    }

    // 3. Normalize Promotion Test Registration playerNames
    const promotions = await prisma.promotionTestRegistration.findMany({
        select: { id: true, playerName: true }
    })

    let promotionChanges = 0
    for (const reg of promotions) {
        if (!reg.playerName) continue
        const normalized = toTitleCase(reg.playerName)
        if (normalized !== reg.playerName) {
            console.log(`  Promotion: "${reg.playerName}" → "${normalized}"`)
            if (!DRY_RUN) {
                await prisma.promotionTestRegistration.update({
                    where: { id: reg.id },
                    data: { playerName: normalized }
                })
            }
            promotionChanges++
        }
    }

    // 4. Normalize Seminar Registration playerNames
    const seminars = await prisma.seminarRegistration.findMany({
        select: { id: true, playerName: true }
    })

    let seminarChanges = 0
    for (const reg of seminars) {
        if (!reg.playerName) continue
        const normalized = toTitleCase(reg.playerName)
        if (normalized !== reg.playerName) {
            console.log(`  Seminar: "${reg.playerName}" → "${normalized}"`)
            if (!DRY_RUN) {
                await prisma.seminarRegistration.update({
                    where: { id: reg.id },
                    data: { playerName: normalized }
                })
            }
            seminarChanges++
        }
    }

    const totalChanges = userChanges + playerChanges + promotionChanges + seminarChanges

    console.log(`\n📊 Summary:`)
    console.log(`  Users:      ${userChanges} of ${users.length} need updating`)
    console.log(`  Players:    ${playerChanges} of ${players.length} need updating`)
    console.log(`  Promotions: ${promotionChanges} of ${promotions.length} need updating`)
    console.log(`  Seminars:   ${seminarChanges} of ${seminars.length} need updating`)

    if (DRY_RUN && totalChanges > 0) {
        console.log(`\n⚠️  This was a DRY RUN. To apply changes, run:`)
        console.log(`  DRY_RUN=false npx tsx prisma/normalize-names.ts\n`)
    } else if (!DRY_RUN) {
        console.log(`\n✅ All names normalized!\n`)
    } else {
        console.log(`\n✅ All names are already normalized!\n`)
    }

    await prisma.$disconnect()
}

main().catch(console.error)
