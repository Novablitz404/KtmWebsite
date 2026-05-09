/**
 * GSS Cold Start: Initialize Elo Ratings from Belt Ranks
 *
 * One-time script that seeds AthleteEloRating records for all verified athletes.
 * Creates up to 3 records per athlete per discipline (global + direct org + parent org).
 *
 * Usage:
 *   npx tsx scripts/initialize-gss.ts              # Full run
 *   npx tsx scripts/initialize-gss.ts --dry-run    # Preview only
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// Belt → Initial Elo mapping (same as lib/elo.ts)
function getInitialElo(belt: string | null | undefined): number {
    if (!belt) return 1200

    const normalized = belt.trim().toLowerCase()

    const danMatch = normalized.match(/^(\d+)(?:st|nd|rd|th)?\s*dan$/i)
    if (danMatch) {
        const danLevel = parseInt(danMatch[1], 10)
        return 1400 + danLevel * 25
    }

    const beltMap: Record<string, number> = {
        'white': 800, 'yellow': 900, 'orange': 1000, 'green': 1050,
        'purple': 1100, 'blue': 1150, 'maroon': 1200, 'red': 1250,
        'brown': 1300, 'black': 1400, 'poom': 1400,
    }

    return beltMap[normalized] ?? 1200
}

async function main() {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`  🏅 GSS Cold Start — Initialize Elo Ratings`)
    console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE'}`)
    console.log(`${'='.repeat(60)}\n`)

    // Fetch all verified athletes with their club → org → parent chain
    const athletes = await prisma.user.findMany({
        where: { isVerified: true, role: 'ATHLETE' },
        select: {
            id: true,
            name: true,
            belt: true,
            clubName: true,
        },
    })

    // Pre-fetch club → org → affiliation mapping for all clubs
    const clubs = await prisma.club.findMany({
        select: {
            name: true,
            organizationId: true,
            affiliations: {
                where: { status: 'ACTIVE' },
                select: { organizationId: true },
                take: 1,
            },
        },
    })
    const clubMap = new Map(clubs.map(c => [c.name, c]))

    console.log(`📋 Found ${athletes.length} verified athletes\n`)

    // Stats
    const eloDistribution: Record<number, number> = {}
    const scopeStats = { global: 0, directOrg: 0, parentOrg: 0 }
    let created = 0
    let skipped = 0

    for (const athlete of athletes) {
        const elo = getInitialElo(athlete.belt)
        eloDistribution[elo] = (eloDistribution[elo] || 0) + 1

        // Resolve org chain via clubName → Club → affiliations
        const club = athlete.clubName ? clubMap.get(athlete.clubName) : null
        const directOrgId = club?.organizationId || null
        const parentOrgId = club?.affiliations?.[0]?.organizationId || null

        // Build scopes
        const scopes: Array<{ scope: string; organizationId: string | null }> = [
            { scope: 'GLOBAL', organizationId: null },
        ]
        scopeStats.global++

        if (directOrgId) {
            scopes.push({ scope: directOrgId, organizationId: directOrgId })
            scopeStats.directOrg++
        }

        if (parentOrgId && parentOrgId !== directOrgId) {
            scopes.push({ scope: parentOrgId, organizationId: parentOrgId })
            scopeStats.parentOrg++
        }

        // Create records for KYORUGI (all athletes get a Kyorugi rating)
        for (const { scope, organizationId } of scopes) {
            const id = `${athlete.id}-KYORUGI-${scope}`

            if (DRY_RUN) {
                console.log(`  [DRY] ${athlete.name} → ${scope === 'GLOBAL' ? 'GLOBAL' : `ORG:${scope.substring(0, 8)}...`} (Elo: ${elo})`)
            } else {
                try {
                    await prisma.athleteEloRating.upsert({
                        where: { id },
                        create: {
                            id,
                            userId: athlete.id,
                            type: 'KYORUGI',
                            scope,
                            organizationId,
                            rating: elo,
                            matchCount: 0,
                        },
                        update: {}, // Don't overwrite if already exists
                    })
                    created++
                } catch (e: any) {
                    console.error(`  ❌ Failed: ${athlete.name} (${scope}): ${e.message}`)
                    skipped++
                }
            }
        }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`)
    console.log(`  📊 Summary`)
    console.log(`${'='.repeat(60)}`)
    console.log(`  Athletes: ${athletes.length}`)
    console.log(`  Records ${DRY_RUN ? 'would be' : ''} created: ${DRY_RUN ? athletes.length : created}`)
    console.log(`  Skipped: ${skipped}`)
    console.log(`\n  Scope breakdown:`)
    console.log(`    Global: ${scopeStats.global}`)
    console.log(`    Direct Org: ${scopeStats.directOrg}`)
    console.log(`    Parent Org: ${scopeStats.parentOrg}`)
    console.log(`\n  Elo distribution:`)
    Object.entries(eloDistribution)
        .sort(([a], [b]) => Number(a) - Number(b))
        .forEach(([elo, count]) => {
            console.log(`    Elo ${elo}: ${count} athletes`)
        })
    console.log(`${'='.repeat(60)}\n`)

    if (!DRY_RUN) {
        console.log('🔄 Refreshing materialized view...')
        try {
            await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW "GlobalAthleteRanking"')
            console.log('✅ Materialized view refreshed\n')
        } catch (e) {
            console.warn('⚠️ View refresh failed (may not exist yet):', e)
        }
    }

    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})
