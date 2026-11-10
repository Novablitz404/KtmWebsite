import { prisma } from '@/lib/prisma'

/**
 * Once the Central Server has downloaded the draft brackets it is the source of truth: the brackets and players of that
 * tournament must not change here any more (a change would no longer match what Central holds, and the results Central
 * uploads later would not find their matches). The lock is lifted when the results are uploaded, or by the organizer.
 */
export const LOCKED_MESSAGE =
    'This tournament is locked: the Central Server has taken over the brackets. Make changes there. The organizer can unlock it from the tournament page.'

/** Returns the message to show when the tournament is locked, or null when it can be changed. */
export async function lockedMessage(tournamentId: string | null | undefined): Promise<string | null> {
    if (!tournamentId) return null
    const t = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { centralTakeoverAt: true } })
    return t?.centralTakeoverAt ? LOCKED_MESSAGE : null
}

/** Same check for an action that only knows a category. */
export async function lockedMessageForCategory(categoryId: string): Promise<string | null> {
    const c = await prisma.category.findUnique({ where: { id: categoryId }, select: { tournamentId: true } })
    return lockedMessage(c?.tournamentId)
}

/** Same check for an action that only knows a player. */
export async function lockedMessageForPlayer(playerId: string): Promise<string | null> {
    const p = await prisma.player.findUnique({ where: { id: playerId }, select: { category: { select: { tournamentId: true } } } })
    return lockedMessage(p?.category?.tournamentId)
}
