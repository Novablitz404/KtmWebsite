import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Applies the final structure of an event, as the Central Server holds it, to the website.
 *
 * Central is the source of truth from the download until the upload, so players may have been added, moved or withdrawn
 * and matches added, redrawn or removed there. This brings the website in line BEFORE the results are uploaded, and
 * returns a map (Central id -> website id) so the results can be sent against the right matches.
 *
 * It never touches scores, winners, ranks or statuses (those arrive with the results), so it is safe to run again after an
 * interrupted upload: rows are matched by their website id, or by `centralRef` (the Central id they were created from).
 */

export interface SyncPlayer {
    /** Central's reference for this player (its own player id, or a local id for someone added there) */
    ref: string
    /** The website's Player.id, for a player that came from the website download */
    websiteId?: string | null
    /** The athlete's hidden user id, for an added player looked up in the athlete directory */
    userId?: string | null
    name: string
    gender?: string | null
    belt?: string | null
    weight?: number | null
    /** Club name as shown in Central (used to find the club record) */
    club?: string | null
    /** Set when the player was withdrawn in Central */
    withdrawn?: { reason?: string | null } | null
}

export interface SyncKyorugiMatch {
    centralId: string
    matchId?: number | null
    round: number
    player1: string
    player2: string
    nextCentralId?: string | null
    nextMatchSlot?: string | null
    court?: string | null
    scheduledDay?: number | null
}

export interface SyncPoomsaeRow {
    centralId: string
    matchId?: number | null
    round: number
    performanceNumber?: number | null
    /** A player's `ref` (or website id) for INDIVIDUAL rows */
    playerRef?: string | null
    displayName?: string | null
    memberIds?: string | null
    memberNames?: string | null
    assignedForms?: string | null
    nextMatchId?: number | null
    nextMatchSlot?: string | null
    targetRank?: number | null
    court?: string | null
    scheduledDay?: number | null
}

export interface SyncCategory {
    name: string
    discipline: 'KYORUGI' | 'POOMSAE' | 'KYUKPA'
    players: SyncPlayer[]
    kyorugiMatches?: SyncKyorugiMatch[]
    poomsaeRows?: SyncPoomsaeRow[]
}

export interface SyncPayload { categories: SyncCategory[] }

export interface SyncReport {
    categoriesApplied: number
    unknownCategories: string[]
    playersAdded: number          // created, linked to an account
    playersAddedUnlinked: string[] // created with no account (walk-ins)
    playersReused: number          // added in Central but already existed on the website
    playersMoved: number
    playersWithdrawn: number
    licenseWarnings: { name: string; athleteNumber: string | null; reason: string }[]
    problems: string[]
    kyorugi: { created: number; updated: number; removed: number }
    poomsae: { created: number; updated: number; removed: number }
}

export interface SyncResult {
    report: SyncReport
    /** Central match id -> website id */
    idMap: { kyorugi: Record<string, number>; poomsae: Record<string, number> }
    /** Central player ref -> website Player.id */
    playerMap: Record<string, string>
}

const isNumeric = (s: string) => /^\d+$/.test(s)

async function newPlayerId(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 100; i++) {
        const id = Math.floor(Math.random() * 1_000_000_000).toString().padStart(9, '0')
        if (!(await tx.player.findUnique({ where: { id }, select: { id: true } }))) return id
    }
    throw new Error('Could not generate a unique player ID')
}

export async function applyCentralSync(tournamentId: string, payload: SyncPayload): Promise<SyncResult> {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { id: true, startDate: true } })
    if (!tournament) throw new Error('Tournament not found')

    const report: SyncReport = {
        categoriesApplied: 0, unknownCategories: [], playersAdded: 0, playersAddedUnlinked: [], playersReused: 0, playersMoved: 0,
        playersWithdrawn: 0, licenseWarnings: [], problems: [],
        kyorugi: { created: 0, updated: 0, removed: 0 }, poomsae: { created: 0, updated: 0, removed: 0 },
    }
    const idMap: SyncResult['idMap'] = { kyorugi: {}, poomsae: {} }
    const playerMap: Record<string, string> = {}

    for (const cat of payload.categories) {
        const category = await prisma.category.findFirst({
            where: { tournamentId, name: cat.name, type: cat.discipline },
            select: { id: true, name: true, type: true },
        })
        if (!category) { report.unknownCategories.push(`${cat.name} (${cat.discipline})`); continue }

        await prisma.$transaction(async (tx) => {
            // ── Players ──────────────────────────────────────────────────────────────────────────────────────
            for (const p of cat.players) {
                let playerId: string | null = null

                if (p.websiteId) {
                    const existing = await tx.player.findFirst({
                        where: { id: p.websiteId, category: { tournamentId } },
                        select: { id: true, categoryId: true, registrationStatus: true, withdrawnAt: true },
                    })
                    if (!existing) {
                        report.problems.push(`${p.name}: website player ${p.websiteId} is not in this tournament`)
                        continue
                    }
                    playerId = existing.id
                    if (p.withdrawn) {
                        if (existing.registrationStatus !== 'WITHDRAWN') {
                            await tx.player.update({
                                where: { id: existing.id },
                                data: { registrationStatus: 'WITHDRAWN', withdrawnReason: p.withdrawn.reason || null, withdrawnAt: new Date() },
                            })
                            report.playersWithdrawn++
                        }
                    } else if (existing.categoryId !== category.id) {
                        await tx.player.update({ where: { id: existing.id }, data: { categoryId: category.id } })
                        report.playersMoved++
                    }
                } else {
                    // A player added in Central. Reuse an existing record where there is one (an earlier, interrupted upload, or an
                    // athlete who was already registered in this tournament), so nothing is created twice.
                    const user = p.userId ? await tx.user.findUnique({
                        where: { id: p.userId },
                        select: { id: true, name: true, clubName: true, isVerified: true, licenseExpiresAt: true, athleteNumber: true, gender: true, belt: true },
                    }) : null
                    if (p.userId && !user) report.problems.push(`${p.name}: athlete ${p.userId} was not found, added without an account`)

                    let existing = user
                        ? await tx.player.findFirst({
                            where: { userId: user.id, category: { tournamentId, type: cat.discipline } },
                            select: { id: true, categoryId: true },
                        })
                        : await tx.player.findFirst({
                            where: { categoryId: category.id, name: p.name, userId: null },
                            select: { id: true, categoryId: true },
                        })

                    if (existing) {
                        playerId = existing.id
                        report.playersReused++
                        if (!p.withdrawn && existing.categoryId !== category.id) {
                            await tx.player.update({ where: { id: existing.id }, data: { categoryId: category.id, registrationStatus: 'APPROVED', withdrawnReason: null, withdrawnAt: null } })
                            report.playersMoved++
                        }
                    } else {
                        const club = p.club
                            ? await tx.club.findFirst({ where: { name: { equals: p.club.trim(), mode: 'insensitive' } }, select: { id: true } })
                            : null
                        playerId = await newPlayerId(tx)
                        await tx.player.create({
                            data: {
                                id: playerId,
                                name: p.name,
                                gender: p.gender || user?.gender || 'Male',
                                belt: p.belt || user?.belt || 'Black',
                                weight: p.weight ?? undefined,
                                categoryId: category.id,
                                userId: user?.id ?? null,
                                clubId: club?.id ?? null,
                                registrationStatus: p.withdrawn ? 'WITHDRAWN' : 'APPROVED',
                                withdrawnReason: p.withdrawn ? (p.withdrawn.reason || null) : null,
                                withdrawnAt: p.withdrawn ? new Date() : null,
                                checkedIn: true,
                                checkedInAt: new Date(),
                            },
                        })
                        if (user) report.playersAdded++
                        else report.playersAddedUnlinked.push(`${p.name} (${cat.name})`)
                        if (p.withdrawn) report.playersWithdrawn++
                    }

                    if (user) {
                        const expired = user.licenseExpiresAt && user.licenseExpiresAt < tournament.startDate
                        if (!user.isVerified || expired) {
                            report.licenseWarnings.push({
                                name: p.name,
                                athleteNumber: user.athleteNumber,
                                reason: !user.isVerified ? 'The athlete license is not active' : 'The athlete license had expired by the event date',
                            })
                        }
                    }
                }
                if (playerId) playerMap[p.ref] = playerId
            }

            // ── Kyorugi matches ──────────────────────────────────────────────────────────────────────────────
            if (cat.kyorugiMatches) {
                const existing = await tx.match.findMany({ where: { categoryRefId: category.id }, select: { id: true, centralRef: true } })
                const byId = new Map(existing.map(m => [m.id, m]))
                const byRef = new Map(existing.filter(m => m.centralRef).map(m => [m.centralRef as string, m]))
                const local: Record<string, number> = {}
                const kept = new Set<number>()

                for (const m of cat.kyorugiMatches) {
                    const row = (isNumeric(m.centralId) ? byId.get(Number(m.centralId)) : undefined) ?? byRef.get(m.centralId)
                    const fields = {
                        round: m.round, player1: m.player1, player2: m.player2, matchId: m.matchId ?? null,
                        court: m.court || 'Unassigned', scheduledDay: m.scheduledDay ?? null,
                    }
                    if (row) {
                        await tx.match.update({ where: { id: row.id }, data: fields })
                        local[m.centralId] = row.id
                        report.kyorugi.updated++
                    } else {
                        const created = await tx.match.create({
                            data: { ...fields, category: category.name, categoryRefId: category.id, centralRef: isNumeric(m.centralId) ? null : m.centralId },
                            select: { id: true },
                        })
                        local[m.centralId] = created.id
                        report.kyorugi.created++
                    }
                    kept.add(local[m.centralId])
                }
                // links between the matches (after all of them exist), then drop what Central no longer has
                for (const m of cat.kyorugiMatches) {
                    const next = m.nextCentralId ? local[m.nextCentralId] : undefined
                    await tx.match.update({ where: { id: local[m.centralId] }, data: { nextMatchId: next ?? null, nextMatchSlot: next ? (m.nextMatchSlot ?? null) : null } })
                }
                const gone = existing.filter(m => !kept.has(m.id)).map(m => m.id)
                if (gone.length > 0) {
                    await tx.match.updateMany({ where: { nextMatchId: { in: gone } }, data: { nextMatchId: null, nextMatchSlot: null } })
                    await tx.match.deleteMany({ where: { id: { in: gone } } })
                    report.kyorugi.removed += gone.length
                }
                Object.assign(idMap.kyorugi, local)
            }

            // ── Poomsae / Kyukpa rows ────────────────────────────────────────────────────────────────────────
            if (cat.poomsaeRows) {
                const existing = await tx.poomsaeMatch.findMany({ where: { categoryRefId: category.id }, select: { id: true, centralRef: true } })
                const byId = new Map(existing.map(m => [m.id, m]))
                const byRef = new Map(existing.filter(m => m.centralRef).map(m => [m.centralRef as string, m]))
                const local: Record<string, number> = {}
                const kept = new Set<number>()

                const resolvePlayer = async (ref?: string | null): Promise<string | null> => {
                    if (!ref) return null
                    if (playerMap[ref]) return playerMap[ref]
                    const p = await tx.player.findUnique({ where: { id: ref }, select: { id: true } })
                    return p?.id ?? null
                }

                for (const r of cat.poomsaeRows) {
                    const row = (isNumeric(r.centralId) ? byId.get(Number(r.centralId)) : undefined) ?? byRef.get(r.centralId)
                    const playerId = await resolvePlayer(r.playerRef)
                    if (r.playerRef && !playerId) report.problems.push(`${cat.name}: player ${r.playerRef} of a Poomsae row was not found`)
                    const memberIds = r.memberIds
                        ? r.memberIds.split(',').map(t => t.trim()).filter(Boolean).map(t => playerMap[t] ?? t).join(', ')
                        : null
                    const fields = {
                        round: r.round, matchId: r.matchId ?? null, performanceNumber: r.performanceNumber ?? null,
                        playerId, displayName: r.displayName ?? null, memberIds, memberNames: r.memberNames ?? null,
                        assignedForms: r.assignedForms ?? null, nextMatchId: r.nextMatchId ?? null, nextMatchSlot: r.nextMatchSlot ?? null,
                        targetRank: r.targetRank ?? null, court: r.court || 'Unassigned', scheduledDay: r.scheduledDay ?? null,
                    }
                    if (row) {
                        await tx.poomsaeMatch.update({ where: { id: row.id }, data: fields })
                        local[r.centralId] = row.id
                        report.poomsae.updated++
                    } else {
                        const created = await tx.poomsaeMatch.create({
                            data: { ...fields, category: category.name, categoryRefId: category.id, centralRef: isNumeric(r.centralId) ? null : r.centralId },
                            select: { id: true },
                        })
                        local[r.centralId] = created.id
                        report.poomsae.created++
                    }
                    kept.add(local[r.centralId])
                }
                const gone = existing.filter(m => !kept.has(m.id)).map(m => m.id)
                if (gone.length > 0) {
                    await tx.poomsaeMatch.deleteMany({ where: { id: { in: gone } } })
                    report.poomsae.removed += gone.length
                }
                Object.assign(idMap.poomsae, local)
            }
        }, { timeout: 120_000, maxWait: 20_000 })

        report.categoriesApplied++
    }

    return { report, idMap, playerMap }
}
