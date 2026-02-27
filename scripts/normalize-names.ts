/**
 * Batch-update all existing names to Title Case.
 * 
 * Usage:
 *   DRY RUN (preview only):  npx tsx scripts/normalize-names.ts
 *   APPLY CHANGES:           npx tsx scripts/normalize-names.ts --apply
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const applyChanges = process.argv.includes('--apply')

// ─── Title Case Helper ───
const ROMAN_NUMERALS = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'])
const LOWERCASE_WORDS = new Set(['of', 'the', 'and', 'in', 'at', 'for', 'de', 'del'])

function toTitleCase(str: string): string {
    if (!str) return str
    return str
        .split(' ')
        .map((word, index) => {
            if (word.includes('-')) {
                return word.split('-').map(part => {
                    const upper = part.toUpperCase()
                    if (ROMAN_NUMERALS.has(upper)) return upper
                    if (part.length <= 1) return upper
                    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                }).join('-')
            }
            const upper = word.toUpperCase()
            if (ROMAN_NUMERALS.has(upper)) return upper
            if (index > 0 && LOWERCASE_WORDS.has(word.toLowerCase())) return word.toLowerCase()
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        })
        .join(' ')
}

async function main() {
    console.log(applyChanges ? '🔴 LIVE MODE — changes will be saved!\n' : '🟢 DRY RUN — previewing changes only\n')

    let totalChanges = 0

    // ─── 1. User names ───
    const users = await prisma.user.findMany({ select: { id: true, name: true, clubName: true } })
    const userChanges: { id: string; field: string; from: string; to: string }[] = []

    for (const user of users) {
        if (user.name) {
            const newName = toTitleCase(user.name)
            if (newName !== user.name) {
                userChanges.push({ id: user.id, field: 'name', from: user.name, to: newName })
            }
        }
        if (user.clubName) {
            const newClubName = toTitleCase(user.clubName)
            if (newClubName !== user.clubName) {
                userChanges.push({ id: user.id, field: 'clubName', from: user.clubName, to: newClubName })
            }
        }
    }

    if (userChanges.length > 0) {
        console.log(`👤 Users — ${userChanges.length} changes:`)
        for (const c of userChanges) {
            console.log(`   ${c.field}: "${c.from}" → "${c.to}"`)
        }
        totalChanges += userChanges.length

        if (applyChanges) {
            for (const c of userChanges) {
                await prisma.user.update({
                    where: { id: c.id },
                    data: { [c.field]: c.to }
                })
            }
            console.log('   ✅ Applied\n')
        } else {
            console.log('')
        }
    } else {
        console.log('👤 Users — no changes needed\n')
    }

    // ─── 2. Club names ───
    const clubs = await prisma.club.findMany({ select: { id: true, name: true } })
    const clubChanges: { id: string; from: string; to: string }[] = []

    for (const club of clubs) {
        const newName = toTitleCase(club.name)
        if (newName !== club.name) {
            clubChanges.push({ id: club.id, from: club.name, to: newName })
        }
    }

    if (clubChanges.length > 0) {
        console.log(`🏛️  Clubs — ${clubChanges.length} changes:`)
        for (const c of clubChanges) {
            console.log(`   "${c.from}" → "${c.to}"`)
        }
        totalChanges += clubChanges.length

        if (applyChanges) {
            for (const c of clubChanges) {
                await prisma.club.update({ where: { id: c.id }, data: { name: c.to } })
            }
            console.log('   ✅ Applied\n')
        } else {
            console.log('')
        }
    } else {
        console.log('🏛️  Clubs — no changes needed\n')
    }

    // ─── 3. Organization names ───
    const orgs = await prisma.organization.findMany({ select: { id: true, name: true } })
    const orgChanges: { id: string; from: string; to: string }[] = []

    for (const org of orgs) {
        const newName = toTitleCase(org.name)
        if (newName !== org.name) {
            orgChanges.push({ id: org.id, from: org.name, to: newName })
        }
    }

    if (orgChanges.length > 0) {
        console.log(`🏢 Organizations — ${orgChanges.length} changes:`)
        for (const c of orgChanges) {
            console.log(`   "${c.from}" → "${c.to}"`)
        }
        totalChanges += orgChanges.length

        if (applyChanges) {
            for (const c of orgChanges) {
                await prisma.organization.update({ where: { id: c.id }, data: { name: c.to } })
            }
            console.log('   ✅ Applied\n')
        } else {
            console.log('')
        }
    } else {
        console.log('🏢 Organizations — no changes needed\n')
    }

    // ─── 4. Player names ───
    const players = await prisma.player.findMany({ select: { id: true, name: true } })
    const playerChanges: { id: string; from: string; to: string }[] = []

    for (const player of players) {
        const newName = toTitleCase(player.name)
        if (newName !== player.name) {
            playerChanges.push({ id: player.id, from: player.name, to: newName })
        }
    }

    if (playerChanges.length > 0) {
        console.log(`🥋 Players — ${playerChanges.length} changes:`)
        for (const c of playerChanges.slice(0, 20)) {
            console.log(`   "${c.from}" → "${c.to}"`)
        }
        if (playerChanges.length > 20) console.log(`   ... and ${playerChanges.length - 20} more`)
        totalChanges += playerChanges.length

        if (applyChanges) {
            for (const c of playerChanges) {
                await prisma.player.update({ where: { id: c.id }, data: { name: c.to } })
            }
            console.log('   ✅ Applied\n')
        } else {
            console.log('')
        }
    } else {
        console.log('🥋 Players — no changes needed\n')
    }

    console.log('─'.repeat(40))
    console.log(`Total: ${totalChanges} changes ${applyChanges ? 'applied ✅' : '(dry run — run with --apply to save)'}`)

    await prisma.$disconnect()
}

main().catch(e => {
    console.error('Error:', e)
    prisma.$disconnect()
    process.exit(1)
})
