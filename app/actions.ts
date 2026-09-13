'use server'

import { revalidatePath } from 'next/cache'
import type { Match, PoomsaeMatch } from '@prisma/client'
import { findCategoryForPlayer } from '@/lib/placement'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getClubEventsData } from '@/app/club/data'
import { generatePoomsaeBracket, type PoomsaeMatchSpec } from '@/lib/poomsae-logic'
import { BracketMatchSpec, generateSingleEliminationBracket, shuffleArray } from '@/lib/bracket-logic'
import type { PreviewMatch } from '@/lib/bracket-preview-helpers'
import { deriveSkillLevel, extractBeltFromCategoryName } from '@/lib/skill-logic'
import { toTitleCase } from '@/lib/utils'
import { sendEmail } from '@/lib/email-service'
import RegistrationApprovedEmail from '@/emails/RegistrationApprovedEmail'
import QRCode from 'qrcode'


export async function fetchClubRegistrationData(clubId: string) {
    const { pendingPlayers, approvedPlayers } = await getClubEventsData(clubId, '') // clubName not needed for tournament part
    return { pendingPlayers, approvedPlayers }
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function createTournament(formData: FormData) {
    const name = formData.get('name') as string
    const venue = formData.get('venue') as string | null
    const startDateStr = formData.get('startDate') as string
    const registrationStartStr = formData.get('registrationStart') as string | null
    const registrationEndStr = formData.get('registrationEnd') as string | null
    const guidelineTemplateId = formData.get('guidelineTemplateId') as string | null
    const tier = formData.get('tier') as string | null
    const headerImage = formData.get('headerImage') as File | null

    // Time fields
    const startTime = formData.get('startTime') as string || '08:00'
    const regStartTime = formData.get('regStartTime') as string || '00:00'
    const regEndTime = formData.get('regEndTime') as string || '23:59'

    // Early bird fields
    const earlyBirdDeadlineStr = formData.get('earlyBirdDeadline') as string | null
    const earlyBirdTimeStr = formData.get('earlyBirdTime') as string || '23:59'
    const earlyBirdPriceStr = formData.get('earlyBirdPrice') as string | null
    const regularPriceStr = formData.get('regularPrice') as string | null

    // Pricing visibility & per-category pricing
    const showPricing = formData.get('showPricing') === 'true'
    const categoryPricingStr = formData.get('categoryPricing') as string | null
    let categoryPricing = null
    if (categoryPricingStr) {
        try { categoryPricing = JSON.parse(categoryPricingStr) } catch { /* ignore invalid JSON */ }
    }

    const currency = (formData.get('currency') as string | null) || 'PHP'

    // Date TBA
    const dateTBA = formData.get('dateTBA') === 'true'

    if (!name || !startDateStr) {
        return { error: 'Tournament name and date are required' }
    }

    // Get current user
    const dbUser = await getAuthUser()
    if (!dbUser) {
        return { error: 'You must be logged in to create a tournament' }
    }

    // Parse dates with times
    const startDate = new Date(`${startDateStr}T${startTime}:00`)
    const registrationStart = registrationStartStr ? new Date(`${registrationStartStr}T${regStartTime}:00`) : null
    const registrationEnd = registrationEndStr ? new Date(`${registrationEndStr}T${regEndTime}:00`) : null
    const earlyBirdDeadline = earlyBirdDeadlineStr ? new Date(`${earlyBirdDeadlineStr}T${earlyBirdTimeStr}:00`) : null
    const earlyBirdPrice = earlyBirdPriceStr ? parseFloat(earlyBirdPriceStr) : null
    const regularPrice = regularPriceStr ? parseFloat(regularPriceStr) : null

    // Handle Header Image upload
    let headerImageUrl: string | null = null
    if (headerImage && headerImage.size > 0) {
        try {
            const bytes = await headerImage.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Generate unique filename
            const timestamp = Date.now()
            const safeName = headerImage.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `header-${timestamp}-${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, buffer, {
                    contentType: headerImage.type,
                    upsert: false
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filename)

            headerImageUrl = publicUrl
        } catch (error) {
            console.error('Header image upload error:', error)
            return { error: 'Failed to upload Header Image' }
        }
    }

    const tournament = await prisma.tournament.create({
        data: {
            name,
            venue: venue || null,
            startDate,
            registrationStart,
            registrationEnd,
            guidelineTemplateId: guidelineTemplateId || null,
            tier: tier || 'J-2',
            earlyBirdDeadline,
            earlyBirdPrice,
            regularPrice,
            headerImageUrl,
            organizerId: dbUser.id,
            showPricing,
            categoryPricing,
            currency,
            dateTBA,
        },
    })

    // If template selected, apply it
    if (guidelineTemplateId) {
        try {
            const template = await prisma.guidelineTemplate.findUnique({
                where: { id: guidelineTemplateId },
                include: {
                    divisions: {
                        orderBy: { displayOrder: 'asc' },
                        include: {
                            categories: {
                                orderBy: { minWeight: 'asc' }
                            }
                        }
                    }
                }
            })

            if (template) {
                const categoriesToCreate: {
                    name: string;
                    tournamentId: string;
                    type: string;
                    subtype: string;
                    poomsaeForms: string | null;
                    court: string | null;
                    minAge: number | null;
                    maxAge: number | null;
                    minWeight: number | null;
                    maxWeight: number | null;
                    minHeight: number | null;
                    maxHeight: number | null;
                    gender: string | null;
                    belt: string | null;
                    division: string | null;
                    weightClass: string | null;
                }[] = []

                for (const division of template.divisions) {
                    for (const weightCat of division.categories) {
                        const genderLabel = weightCat.gender === 'Both' ? '' : weightCat.gender

                        if (weightCat.type === 'POOMSAE' || weightCat.type === 'KYUKPA') {
                            // POOMSAE/KYUKPA: Create single category (No Skill Level Split) — both
                            // are scored disciplines, unlike Kyorugi's Novice/Intermediate/Advance split.
                            const categoryName = `${division.name} ${genderLabel} ${weightCat.name}`.replace(/\s+/g, ' ').trim()

                            // Try to extract belt from name if not present in template
                            // @ts-ignore
                            const belt = weightCat.belt || extractBeltFromCategoryName(categoryName)

                            categoriesToCreate.push({
                                name: categoryName,
                                tournamentId: tournament.id,
                                type: weightCat.type,
                                subtype: weightCat.subtype,
                                poomsaeForms: weightCat.poomsaeForms,
                                // @ts-ignore — poomsaeFormat is present in the DB but the generated
                                // Prisma Client types haven't been regenerated (dev server file lock)
                                poomsaeFormat: (weightCat as any).poomsaeFormat || 'SCORED',
                                court: null,
                                minAge: division.minAge,
                                maxAge: division.maxAge,
                                minWeight: weightCat.minWeight,
                                maxWeight: weightCat.maxWeight,
                                minHeight: weightCat.minHeight,
                                maxHeight: weightCat.maxHeight,
                                gender: weightCat.gender,
                                // @ts-ignore
                                belt: belt,
                                // @ts-ignore
                                skillLevel: null, // No skill level for Poomsae
                                division: division.name,
                                weightClass: weightCat.name,
                            })
                        } else {
                            // KYORUGI: Create Novice, Intermediate & Advance Variants

                            // 1. Novice
                            const noviceName = `${division.name} ${genderLabel} Novice ${weightCat.name}`.replace(/\s+/g, ' ').trim()
                            categoriesToCreate.push({
                                name: noviceName,
                                tournamentId: tournament.id,
                                type: weightCat.type,
                                subtype: weightCat.subtype,
                                poomsaeForms: weightCat.poomsaeForms,
                                court: null,
                                minAge: division.minAge,
                                maxAge: division.maxAge,
                                minWeight: weightCat.minWeight,
                                maxWeight: weightCat.maxWeight,
                                minHeight: weightCat.minHeight,
                                maxHeight: weightCat.maxHeight,
                                gender: weightCat.gender,
                                // @ts-ignore
                                belt: weightCat.belt,
                                // @ts-ignore
                                skillLevel: 'Novice',
                                division: division.name,
                                weightClass: weightCat.name,
                            })

                            // 2. Intermediate
                            const intermediateName = `${division.name} ${genderLabel} Intermediate ${weightCat.name}`.replace(/\s+/g, ' ').trim()
                            categoriesToCreate.push({
                                name: intermediateName,
                                tournamentId: tournament.id,
                                type: weightCat.type,
                                subtype: weightCat.subtype,
                                poomsaeForms: weightCat.poomsaeForms,
                                court: null,
                                minAge: division.minAge,
                                maxAge: division.maxAge,
                                minWeight: weightCat.minWeight,
                                maxWeight: weightCat.maxWeight,
                                minHeight: weightCat.minHeight,
                                maxHeight: weightCat.maxHeight,
                                gender: weightCat.gender,
                                // @ts-ignore
                                belt: weightCat.belt,
                                // @ts-ignore
                                skillLevel: 'Intermediate',
                                division: division.name,
                                weightClass: weightCat.name,
                            })

                            // 3. Advance
                            const advanceName = `${division.name} ${genderLabel} Advance ${weightCat.name}`.replace(/\s+/g, ' ').trim()
                            categoriesToCreate.push({
                                name: advanceName,
                                tournamentId: tournament.id,
                                type: weightCat.type,
                                subtype: weightCat.subtype,
                                poomsaeForms: weightCat.poomsaeForms,
                                court: null,
                                minAge: division.minAge,
                                maxAge: division.maxAge,
                                minWeight: weightCat.minWeight,
                                maxWeight: weightCat.maxWeight,
                                minHeight: weightCat.minHeight,
                                maxHeight: weightCat.maxHeight,
                                gender: weightCat.gender,
                                // @ts-ignore
                                belt: weightCat.belt,
                                // @ts-ignore
                                skillLevel: 'Advance',
                                division: division.name,
                                weightClass: weightCat.name,
                            })
                        }
                    }
                }

                if (categoriesToCreate.length > 0) {
                    await prisma.category.createMany({
                        data: categoriesToCreate
                    })
                }
            }
        } catch (e) {
            console.error("Failed to apply template during creation", e)
        }
    }

    revalidatePath('/')
    revalidatePath('/tournaments')
    revalidatePath('/organization')
    revalidatePath('/admin')
    return { success: true, id: tournament.id }
}

export async function deleteTournament(id: string) {
    const dbUser = await getAuthUser()
    if (!dbUser) throw new Error('Not authenticated')

    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { managers: true }
    })

    if (!tournament) throw new Error('Tournament not found')

    // Authorization: Only Organizer or Admin can delete
    // Managers typically shouldn't delete the entire tournament, but if needed we can add them.
    // For now, strict: Organizer or Owner only.
    if (tournament.organizerId !== dbUser.id && dbUser.role !== 'ADMIN') {
        throw new Error('Unauthorized to delete this tournament')
    }

    // Manual Cascade Delete (since schema might not have all onDelete: Cascade)
    // 1. Delete Matches (found via Categories)
    // 2. Delete Players (found via Categories)
    // 3. Delete Categories
    // 4. Delete Manager Invites
    // 5. Finally Delete Tournament

    const categories = await prisma.category.findMany({
        where: { tournamentId: id },
        select: { id: true }
    })

    const categoryIds = categories.map(c => c.id)

    if (categoryIds.length > 0) {
        // Delete all matches for these categories
        await prisma.match.deleteMany({
            where: { categoryRefId: { in: categoryIds } }
        })

        // Delete all players for these categories
        await prisma.player.deleteMany({
            where: { categoryId: { in: categoryIds } }
        })

        // Delete the categories
        await prisma.category.deleteMany({
            where: { tournamentId: id }
        })
    }

    // Delete Manager Invites
    await prisma.tournamentManagerInvite.deleteMany({
        where: { tournamentId: id }
    })

    // Delete Poomsae Matches (Cascade manual)
    // Find all categories for this tournament first? We already have categoryIds from line 186
    if (categoryIds.length > 0) {
        await prisma.poomsaeMatch.deleteMany({
            where: { categoryRefId: { in: categoryIds } }
        })
    }

    // Delete Tournament
    await prisma.tournament.delete({
        where: { id }
    })

    revalidatePath('/organization')
    revalidatePath('/')
    revalidatePath('/admin')
    return { success: true }
}



export async function createPlayer(formData: FormData) {
    const name = formData.get('name') as string
    const gender = formData.get('gender') as string
    const belt = formData.get('belt') as string
    const weight = parseFloat(formData.get('weight') as string)
    const height = parseFloat(formData.get('height') as string)
    const club = formData.get('club') as string
    const userId = formData.get('userId') as string | null
    const skillLevel = formData.get('skillLevel') as string
    const categoryId = formData.get('categoryId') as string
    const poomsaeType = formData.get('poomsaeType') as string
    const tournamentId = formData.get('tournamentId') as string

    if (!name || !categoryId) return

    // ─── Auth ───
    const dbUser = await getAuthUser()
    if (!dbUser) throw new Error('Not authenticated')

    // ─── Fetch tournament for deadline + status + permission checks ───
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: {
            registrationStart: true,
            registrationEnd: true,
            status: true,
            organizerId: true,
            managers: { select: { id: true } }
        }
    })

    if (!tournament) throw new Error('Tournament not found')

    // ─── Role-based bypass: organizers, managers, and admins can always add ───
    const isPrivileged =
        dbUser.role === 'ADMIN' ||
        tournament.organizerId === dbUser.id ||
        tournament.managers.some(m => m.id === dbUser.id)

    if (!isPrivileged) {
        // Block if tournament is cancelled or completed
        if (tournament.status === 'CANCELLED') {
            throw new Error('This tournament has been cancelled.')
        }
        if (tournament.status === 'COMPLETED') {
            throw new Error('This tournament is already completed.')
        }

        // Block if outside registration window
        const now = new Date()
        if (tournament.registrationStart && now < tournament.registrationStart) {
            throw new Error('Registration has not started yet.')
        }
        if (tournament.registrationEnd && now > tournament.registrationEnd) {
            throw new Error('Registration is closed.')
        }
    }

    // ─── Resolve club by name ───
    let clubId: string | null = null
    if (club) {
        const clubRecord = await prisma.club.findFirst({ where: { name: club } })
        clubId = clubRecord?.id || null
    }

    // Generate unique 9-digit player ID
    const generatePlayerId = async (): Promise<string> => {
        let attempts = 0
        while (attempts < 100) {
            const randomNum = Math.floor(Math.random() * 1000000000)
            const id = randomNum.toString().padStart(9, '0')
            const exists = await prisma.player.findUnique({ where: { id } })
            if (!exists) return id
            attempts++
        }
        throw new Error('Could not generate unique player ID')
    }

    const playerId = await generatePlayerId()

    await prisma.player.create({
        data: {
            id: playerId,
            name: toTitleCase(name),
            gender: gender || 'Male',
            belt: belt || 'Black',
            skillLevel: skillLevel || 'Novice',
            weight: isNaN(weight) ? null : weight,
            height: isNaN(height) ? null : height,
            poomsaeType: poomsaeType || 'INDIVIDUAL',
            categoryId,
            userId: userId || null,
            clubId,
            registrationStatus: isPrivileged ? 'APPROVED' : 'PENDING',
        },
    })

    revalidatePath(`/tournament/${tournamentId}`)
}




// ─────────────────────────────────────────────────────────────
// INTERNAL: Reconcile seedOrder for a category
// - Removes players no longer in the category
// - Appends new players at the end
// - Returns the ordered player list ready for bracket generation
// ─────────────────────────────────────────────────────────────
function reconcileSeedOrder<T extends { id: string }>(savedOrder: string[], currentPlayers: T[]): T[] {
    const playerMap = new Map(currentPlayers.map(p => [p.id, p]))
    // Keep existing order, filter out removed players
    const ordered: T[] = []
    const seen = new Set<string>()
    for (const id of savedOrder) {
        const p = playerMap.get(id)
        if (p) { ordered.push(p); seen.add(id) }
    }
    // Append new players (not in saved order) at the end
    for (const p of currentPlayers) {
        if (!seen.has(p.id)) ordered.push(p)
    }
    return ordered
}

export type OrderedKyorugiSpec = BracketMatchSpec & {
    categoryId: string
    categoryName: string
    court: string
    catMinAge: number
    catMinWeight: number
    catMinHeight: number
    catSkillPriority: number
    deferFinals: boolean
    scheduleDay: number
    deferFinalsToDay: number | null
    deferSemisToDay: number | null
    totalRounds: number
}

// Builds the exact final match order for a sparring discipline (Kyorugi) —
// per-category bracket specs (including uncontested-walkover synthesis for a
// lone competitor), sorted by day/category/skill-level, then rest-spaced so
// the same player isn't scheduled back-to-back too soon. Shared by
// generateAllBrackets (which persists this order as real matches) and
// simulateMatchSequence (which just numbers it, for the "Simulate Sequence"
// preview) — keeping this logic in exactly one place is what guarantees the
// simulated numbers can never drift from what Generate All actually produces.
async function buildOrderedKyorugiSpecs(
    tournamentId: string,
    type: 'KYORUGI' | 'KYUKPA',
    editedSpecsByCategory?: Record<string, PreviewMatch[]>,
    seedOrders?: Record<string, string[]>
): Promise<OrderedKyorugiSpec[]> {
    const categories = await prisma.category.findMany({
        where: { tournamentId, type },
        include: { players: true }
    })
    const validCategories = categories.filter(c => c.players.length > 0)

    const skillPriority: Record<string, number> = {
        'novice': 1, 'intermediate': 2, 'advance': 3, 'advanced': 3,
    }

    const allSpecs: OrderedKyorugiSpec[] = []

    for (const category of validCategories) {
        if (category.players.length === 1 && category.players[0].registrationStatus === 'WITHDRAWN') {
            // No legitimate athlete remains — nothing to generate/simulate.
            continue
        }

        const editedSpecsForCat = editedSpecsByCategory?.[category.id]
        let specs: BracketMatchSpec[]

        if (category.players.length === 1) {
            // Uncontested — no opponent at all. Auto-resolve as a walkover (single
            // terminal spec, no real player2) instead of silently producing nothing.
            specs = [{
                id: 0,
                round: 1,
                player1: category.players[0],
                player2: null,
                nextMatchId: null,
                nextMatchSlot: null,
                isFinal: true,
            }]
        } else if (editedSpecsForCat && editedSpecsForCat.length > 0) {
            // Exact reproduction of a hand-edited preview still open in the browser
            // — persisted verbatim instead of re-derived through the seeding
            // algorithm, which would re-scramble the manual swap the user made.
            const byId = new Map(category.players.map(p => [p.id, p]))
            specs = editedSpecsForCat.map(s => ({
                id: s.id,
                round: s.round,
                player1: s.player1 ? (byId.get(s.player1.id) ?? null) : null,
                player2: s.player2 ? (byId.get(s.player2.id) ?? null) : null,
                nextMatchId: s.nextMatchId,
                nextMatchSlot: s.nextMatchSlot,
                isFinal: s.isFinal,
            }))
        } else {
            // Reconcile seed order: prefer an explicitly passed-in order, fall back
            // to the category's saved order, shuffle otherwise.
            const effectiveOrder = (seedOrders?.[category.id] && seedOrders[category.id].length > 0)
                ? seedOrders[category.id]
                : category.seedOrder
            const hasOrder = !!(effectiveOrder && effectiveOrder.length > 0)
            const reconciledPlayers = hasOrder
                ? reconcileSeedOrder(effectiveOrder!, category.players)
                : category.players
            specs = hasOrder
                ? generateSingleEliminationBracket(reconciledPlayers, 1, reconciledPlayers)
                : generateSingleEliminationBracket(reconciledPlayers)
        }

        const catMinAge = category.minAge ?? 999
        const catMinWeight = category.minWeight ?? 999
        const catMinHeight = category.minHeight ?? 999
        const catSkillPriority = skillPriority[(category.skillLevel || 'novice').toLowerCase()] || 1
        const catTotalRounds = specs.length > 0 ? Math.max(...specs.map(s => s.round)) : 1

        specs.forEach(s => {
            allSpecs.push({
                ...s,
                categoryId: category.id,
                categoryName: category.name,
                court: category.court || "Unassigned",
                catMinAge, catMinWeight, catMinHeight, catSkillPriority,
                deferFinals: category.deferFinals,
                scheduleDay: category.scheduleDay ?? 1,
                deferFinalsToDay: category.deferFinalsToDay ?? null,
                deferSemisToDay: (category as any).deferSemisToDay ?? null,
                totalRounds: catTotalRounds,
            })
        })
    }

    // Sort globally — day first, then existing ordering within each day
    allSpecs.sort((a, b) => {
        const aIsSemiOrFinal = a.round >= a.totalRounds - 1
        const bIsSemiOrFinal = b.round >= b.totalRounds - 1
        const aDay = (a.deferSemisToDay && aIsSemiOrFinal) ? a.deferSemisToDay
            : (a.isFinal && a.deferFinalsToDay) ? a.deferFinalsToDay : a.scheduleDay
        const bDay = (b.deferSemisToDay && bIsSemiOrFinal) ? b.deferSemisToDay
            : (b.isFinal && b.deferFinalsToDay) ? b.deferFinalsToDay : b.scheduleDay
        if (aDay !== bDay) return aDay - bDay

        const aDef = a.isFinal && a.deferFinals && !a.deferFinalsToDay && !a.deferSemisToDay
        const bDef = b.isFinal && b.deferFinals && !b.deferFinalsToDay && !b.deferSemisToDay
        if (aDef && !bDef) return 1
        if (!aDef && bDef) return -1

        const aGroupByCategory = !a.deferFinals && !a.deferSemisToDay
        const bGroupByCategory = !b.deferFinals && !b.deferSemisToDay

        if (aGroupByCategory && bGroupByCategory) {
            if (a.catMinAge !== b.catMinAge) return a.catMinAge - b.catMinAge
            if (a.catMinWeight !== b.catMinWeight) return a.catMinWeight - b.catMinWeight
            if (a.catMinHeight !== b.catMinHeight) return a.catMinHeight - b.catMinHeight
            if (a.catSkillPriority !== b.catSkillPriority) return a.catSkillPriority - b.catSkillPriority
            if (a.round !== b.round) return a.round - b.round
            return a.id - b.id
        }
        if (!aGroupByCategory && !bGroupByCategory) {
            if (a.round !== b.round) return a.round - b.round
            if (a.catMinAge !== b.catMinAge) return a.catMinAge - b.catMinAge
            if (a.catMinWeight !== b.catMinWeight) return a.catMinWeight - b.catMinWeight
            if (a.catMinHeight !== b.catMinHeight) return a.catMinHeight - b.catMinHeight
            if (a.catSkillPriority !== b.catSkillPriority) return a.catSkillPriority - b.catSkillPriority
            return a.id - b.id
        }
        return aGroupByCategory ? -1 : 1
    })

    // Rest spacing — a player shouldn't be scheduled again too soon after their
    // previous match. Prefers a 2-match gap, falls back to a 1-match gap when 2
    // isn't achievable nearby, and only reorders within a small local lookahead
    // so it never disturbs the day/category/skill-level ordering established
    // above. Never schedules a match before the match(es) that feed it (isReady),
    // which the round-ascending sort above guarantees is always satisfiable.
    const keyOf = (s: OrderedKyorugiSpec) => `${s.categoryId}:${s.id}`
    const feedersOf = new Map<string, string[]>()
    allSpecs.forEach(s => {
        if (s.nextMatchId !== null) {
            const targetKey = `${s.categoryId}:${s.nextMatchId}`
            if (!feedersOf.has(targetKey)) feedersOf.set(targetKey, [])
            feedersOf.get(targetKey)!.push(keyOf(s))
        }
    })

    const placed = new Set<string>()
    const isReady = (s: OrderedKyorugiSpec) => {
        const feeders = feedersOf.get(keyOf(s))
        return !feeders || feeders.every(f => placed.has(f))
    }
    const playersOf = (s: OrderedKyorugiSpec) => [s.player1?.id, s.player2?.id].filter((id): id is string => !!id)

    const remaining = [...allSpecs]
    const spaced: OrderedKyorugiSpec[] = []
    const recentMatches: string[][] = [] // trailing window of the last 2 scheduled matches' player ids
    const conflicts = (s: OrderedKyorugiSpec, gap: number) => {
        const ids = new Set(recentMatches.slice(-gap).flat())
        return playersOf(s).some(id => ids.has(id))
    }

    const LOOKAHEAD = 12
    while (remaining.length > 0) {
        const window = remaining.slice(0, Math.min(LOOKAHEAD, remaining.length))
        let idx = window.findIndex(s => isReady(s) && !conflicts(s, 2))
        if (idx === -1) idx = window.findIndex(s => isReady(s) && !conflicts(s, 1))
        if (idx === -1) idx = window.findIndex(s => isReady(s))
        if (idx === -1) idx = remaining.findIndex(s => isReady(s)) // guaranteed to exist
        if (idx === -1) idx = 0 // unreachable given a valid topological input order

        const [chosen] = remaining.splice(idx, 1)
        spaced.push(chosen)
        placed.add(keyOf(chosen))
        recentMatches.push(playersOf(chosen))
        if (recentMatches.length > 2) recentMatches.shift()
    }

    return spaced
}

export type OrderedPoomsaeSpec = PoomsaeMatchSpec & {
    categoryId: string
    categoryDisplayName: string
    court: string
    sharedMatchId: number
    nextGroupSharedId: number | null
    specDay: number
}

// Builds the exact final match order for a performance discipline (Poomsae/
// Kyukpa) — per-category performance/pairing specs (uncontested-walkover
// synthesis lives inside generatePoomsaeBracket itself, so every caller gets
// it automatically), with global shared matchIds and each row's actual
// scheduled day (respecting defer-to-day settings). Shared by
// generateAllBrackets and simulateMatchSequence for the same reason as
// buildOrderedKyorugiSpecs above — one source of truth, no drift.
async function buildOrderedPoomsaeSpecs(
    tournamentId: string,
    type: 'POOMSAE' | 'KYUKPA',
    seedOrders?: Record<string, string[]>
): Promise<{ specs: OrderedPoomsaeSpec[]; seedOrderByCategory: Record<string, string[]> }> {
    const categories = await prisma.category.findMany({
        where: { tournamentId, type },
        include: { players: { include: { club: true } } }
    })
    const validCategories = categories.filter(c => c.players.length > 0)

    let currentGlobalMatchId = 1
    const all: OrderedPoomsaeSpec[] = []
    const seedOrderByCategory: Record<string, string[]> = {}

    for (const category of validCategories) {
        const effectiveOrder = (seedOrders?.[category.id] && seedOrders[category.id].length > 0)
            ? seedOrders[category.id]
            : category.seedOrder
        const hasOrder = !!(effectiveOrder && effectiveOrder.length > 0)
        const reconciledPlayers = hasOrder
            ? reconcileSeedOrder(effectiveOrder!, category.players as any)
            : category.players as any
        seedOrderByCategory[category.id] = reconciledPlayers.map((p: any) => p.id)

        const poomsaeSpecs = generatePoomsaeBracket(
            reconciledPlayers,
            category.subtype || 'INDIVIDUAL',
            category.poomsaeForms,
            category.poomsaeFormat as 'SCORED' | 'HEAD_TO_HEAD',
            hasOrder
        )

        const distinctGroupIndices = Array.from(new Set(poomsaeSpecs.map(s => s.roundGroupIndex))).sort((a, b) => a - b)
        const groupMapping = new Map<number, number>()
        distinctGroupIndices.forEach(idx => { groupMapping.set(idx, currentGlobalMatchId++) })

        const displayName = category.belt && !category.name.toLowerCase().includes(category.belt.toLowerCase())
            ? `${category.name} ${category.belt}`
            : category.name

        const poomsaeTotalRounds = poomsaeSpecs.length > 0 ? Math.max(...poomsaeSpecs.map(s => s.round)) : 1

        poomsaeSpecs.forEach(spec => {
            const sharedMatchId = groupMapping.get(spec.roundGroupIndex) || 0
            const nextGroupSharedId = spec.nextRoundGroupIndex !== undefined
                ? (spec.nextRoundGroupIndex !== null ? groupMapping.get(spec.nextRoundGroupIndex) || null : null)
                : groupMapping.get(spec.roundGroupIndex + 1) || null

            const isFinalRound = spec.round === poomsaeTotalRounds
            const isSemiOrFinal = spec.round >= poomsaeTotalRounds - 1
            const catDay = category.scheduleDay ?? 1
            const specDay = (category.deferSemisToDay && isSemiOrFinal) ? category.deferSemisToDay
                : (isFinalRound && category.deferFinalsToDay) ? category.deferFinalsToDay : catDay

            all.push({
                ...spec,
                categoryId: category.id,
                categoryDisplayName: displayName,
                court: category.court || 'Unassigned',
                sharedMatchId,
                nextGroupSharedId,
                specDay,
            })
        })
    }

    return { specs: all, seedOrderByCategory }
}

export async function generateAllBrackets(
    tournamentId: string,
    type: 'KYORUGI' | 'POOMSAE' | 'KYUKPA',
    // Hand-edited previews still open in the browser, keyed by categoryId — Kyorugi/
    // Kyukpa only (Poomsae's preview has no swap capability). See generateBracketsForCategory
    // for why these are persisted verbatim rather than re-derived from a seed order.
    editedSpecsByCategory?: Record<string, PreviewMatch[]>
) {
    if (!tournamentId) return

    // 1. Bulk Fetch Categories & Players
    // We only want categories of the specified type that have enough players
    const categories = await prisma.category.findMany({
        where: {
            tournamentId,
            type: type
        },
        include: {
            players: true
        }
    })

    if (categories.length === 0) return { success: false, message: 'No categories found.' }

    // 2. Determine Next Match ID
    // We query the database for the max existing matchId after deletion to know where to start
    // 2. Determine Next Match ID
    // We query the database for the max existing matchId after deletion to know where to start
    // UPDATED: Now independent per type (Kyorugi vs Poomsae)
    const getNextMatchId = async (tId: string, type: 'KYORUGI' | 'POOMSAE' | 'KYUKPA') => {
        if (type === 'POOMSAE' || type === 'KYUKPA') {
            const maxPoomsae = await prisma.poomsaeMatch.findFirst({
                where: { categoryRef: { tournamentId: tId } },
                orderBy: { matchId: 'desc' },
                select: { matchId: true }
            });
            return (maxPoomsae?.matchId || 0) + 1;
        } else {
            const maxMatch = await prisma.match.findFirst({
                where: { categoryRef: { tournamentId: tId } },
                orderBy: { matchId: 'desc' },
                select: { matchId: true }
            });
            return (maxMatch?.matchId || 0) + 1;
        }
    }

    const validCategories = categories.filter(c => c.players.length > 0)

    // 3. Delete ALL existing matches for this discipline (full renumber from 1)
    const allCategoryIds = categories.map(c => c.id)
    if (type === 'POOMSAE' || type === 'KYUKPA') {
        await prisma.poomsaeMatch.deleteMany({
            where: { categoryRefId: { in: allCategoryIds } }
        })
    } else {
        await prisma.match.deleteMany({
            where: { categoryRefId: { in: allCategoryIds } }
        })
    }

    // 4. In-Memory Generation & Parallel DB Writes
    // We'll collect all creation operations and run them transactionally or in parallel batches

    if (type === 'POOMSAE' || type === 'KYUKPA') {
        // --- POOMSAE / KYUKPA GENERATION ---
        // Ordering/numbering/day-computation lives in buildOrderedPoomsaeSpecs,
        // shared with simulateMatchSequence so the two can never drift apart.
        const { specs: orderedSpecs, seedOrderByCategory } = await buildOrderedPoomsaeSpecs(tournamentId, type, undefined)

        const createPromises = orderedSpecs.flatMap(spec => {
            const promises: any[] = [prisma.poomsaeMatch.create({
                data: {
                    categoryRefId: spec.categoryId,
                    category: spec.categoryDisplayName,
                    round: spec.round,
                    matchId: spec.sharedMatchId,
                    nextMatchId: spec.nextGroupSharedId,
                    nextMatchSlot: spec.nextMatchSlot ?? undefined,

                    targetRank: spec.targetRank,
                    performanceNumber: spec.performanceNumber,
                    playerId: spec.playerId || undefined,
                    displayName: spec.displayName || undefined,
                    memberIds: spec.memberIds || undefined,
                    memberNames: spec.memberNames || undefined,
                    assignedForms: spec.assignedForms,
                    // Normal specs are always 'Pending' — only the synthetic
                    // uncontested-walkover spec comes pre-marked 'Completed'.
                    status: spec.status,
                    court: spec.court,
                    scheduledDay: spec.specDay,
                }
            })]

            if (spec.status === 'Completed') {
                // A walkover winner never actually performs for a scoring app to
                // report a medal back through the medals API — award it directly.
                // TEAM/PAIR has no single playerId (uses memberIds instead), so
                // every member individually gets credited.
                const winnerIds = spec.playerId ? [spec.playerId] : (spec.memberIds || '').split(',').map(s => s.trim()).filter(Boolean)
                if (winnerIds.length > 0) {
                    promises.push(prisma.player.updateMany({ where: { id: { in: winnerIds } }, data: { medal: 'GOLD' } }))
                }
            }

            return promises
        })

        await Promise.all(createPromises)

        // Save seed order for each category
        await Promise.all(
            Object.entries(seedOrderByCategory).map(([categoryId, seedOrder]) =>
                prisma.category.update({ where: { id: categoryId }, data: { seedOrder } })
            )
        )

    } else {
        // --- KYORUGI GENERATION (interleaved by round, finals last) ---
        // Ordering/numbering/rest-spacing/uncontested-walkover handling all live
        // in buildOrderedKyorugiSpecs, shared with simulateMatchSequence so the
        // two can never drift apart.

        let currentMatchNumber = 1
        const allSpecs = await buildOrderedKyorugiSpecs(tournamentId, type as 'KYORUGI' | 'KYUKPA', editedSpecsByCategory, undefined)

        // Insert matches (Pass 1)
        const idLookup = new Map<string, number>();

        for (const spec of allSpecs) {
            const isSemiOrFinal = spec.round >= spec.totalRounds - 1
            const specDay = (spec.deferSemisToDay && isSemiOrFinal) ? spec.deferSemisToDay
                : (spec.isFinal && spec.deferFinalsToDay) ? spec.deferFinalsToDay : spec.scheduleDay
            // A real bracket never produces a null player2 (byes are absorbed into
            // slot placement, not written as matches) — the only source is the
            // synthetic uncontested-walkover spec from buildOrderedKyorugiSpecs,
            // so this is an unambiguous signal to write it as a resolved walkover.
            const isWalkover = !!spec.player1 && !spec.player2
            const createdMatch = await prisma.match.create({
                data: {
                    categoryRefId: spec.categoryId,
                    category: spec.categoryName,
                    round: spec.round,
                    matchId: currentMatchNumber++,
                    player1: spec.player1?.name || "TBD",
                    player2: isWalkover ? 'BYE' : (spec.player2?.name || "TBD"),
                    winner: isWalkover ? spec.player1!.name : null,
                    nextMatchSlot: spec.nextMatchSlot,
                    court: spec.court,
                    scheduledDay: specDay,
                }
            })
            idLookup.set(`${spec.categoryId}:${spec.id}`, createdMatch.id)

            // A walkover winner never plays a real match for a scoring app to report
            // back through the medals API, so award Gold directly here — same as
            // createUncontestedWalkoverMatch does for the single-category path.
            if (isWalkover) {
                await prisma.player.update({ where: { id: spec.player1!.id }, data: { medal: 'GOLD' } })
            }
        }

        // Step 4: Link nextMatchId (Pass 2)
        const linkUpdates = [];
        for (const spec of allSpecs) {
            if (spec.nextMatchId !== null) {
                const actualId = idLookup.get(`${spec.categoryId}:${spec.id}`);
                const actualNextId = idLookup.get(`${spec.categoryId}:${spec.nextMatchId}`);

                if (actualId && actualNextId) {
                    linkUpdates.push(
                        prisma.match.update({
                            where: { id: actualId },
                            data: { nextMatchId: actualNextId }
                        })
                    );
                }
            }
        }
        await Promise.all(linkUpdates);

        // 5. Update Match Count
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { match_count: currentMatchNumber - 1 }
        })

        // 6. Save seed orders back to each category — skipped for categories generated
        // from a hand-edited preview (see comment above); their seedOrder stays at
        // whatever rank order produced the pre-edit preview.
        await Promise.all(validCategories
            .filter(c => c.players.length >= 2 && !(editedSpecsByCategory?.[c.id]?.length))
            .map(c => {
                const reconciledPlayers = c.seedOrder && c.seedOrder.length > 0
                    ? reconcileSeedOrder(c.seedOrder, c.players)
                    : c.players
                return prisma.category.update({
                    where: { id: c.id },
                    data: { seedOrder: reconciledPlayers.map(p => p.id) }
                })
            })
        )
    }

    revalidatePath(`/tournament/${tournamentId}`)
    return { success: true, count: validCategories.length }
}

// Creates the single terminal match that represents an uncontested KYORUGI
// category (exactly one athlete, no opponent at all): player1 = the lone
// athlete, player2 = 'BYE', winner already set since there's no bout to play.
// Also directly awards Gold — a walkover winner never plays a real match for a
// scoring app to report back through the medals API, so without this the
// medal tally would never count them at all. Being the sole entrant in the
// entire category, Gold is the only placement that can exist here (no
// silver/bronze possible with one athlete).
// Only ever called at actual generation time (generateBracketsForCategory's
// single-player branch, or forceExecuteSmartAction's WITHDRAW→regeneration
// path) — NOT when WALKOVER is merely chosen, so nothing in the bracket
// changes until the organiser actually clicks Generate.
async function createUncontestedWalkoverMatch(categoryId: string, player: { id: string; name: string }) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) return null

    await prisma.match.deleteMany({ where: { categoryRefId: categoryId } })

    const maxMatch = await prisma.match.findFirst({
        where: { categoryRef: { tournamentId: category.tournamentId } },
        orderBy: { matchId: 'desc' },
        select: { matchId: true }
    })
    const matchId = (maxMatch?.matchId || 0) + 1

    await prisma.match.create({
        data: {
            categoryRefId: categoryId,
            category: category.name,
            round: 1,
            matchId,
            player1: player.name,
            player2: 'BYE',
            winner: player.name,
            court: category.court || 'Unassigned',
            // Without this, the match's scheduledDay stays null and never matches
            // any day's filter (`matches.some(m => m.scheduledDay === d)`) — the
            // category silently drops out of the per-day "Download Bracket PDFs"
            // panel even though it's fully generated.
            scheduledDay: category.scheduleDay ?? 1,
        }
    })

    await prisma.player.update({ where: { id: player.id }, data: { medal: 'GOLD' } })

    await prisma.tournament.update({
        where: { id: category.tournamentId },
        data: { match_count: matchId }
    })

    revalidatePath(`/tournament/${category.tournamentId}`)
    return category
}

export async function generateBracketsForCategory(
    categoryId: string,
    court?: string,
    seedOrder?: string[],
    // A hand-edited preview (user manually swapped players via click-to-swap in the
    // UI) — passed verbatim instead of `seedOrder` because it's already the exact
    // final bracket structure (round1 pairings + bye placements resolved). Re-deriving
    // it through generateSingleEliminationBracket via `seedOrder` would treat this
    // slot arrangement as a seed-RANK order and re-apply the seeding transform,
    // scrambling the very swap the user just made. Kyorugi only.
    editedSpecs?: PreviewMatch[]
) {
    if (!categoryId) return

    // Update category court if provided
    if (court !== undefined) {
        await prisma.category.update({
            where: { id: categoryId },
            data: { court: court || null }
        })
    }

    const players = await prisma.player.findMany({
        where: { categoryId },
        include: { club: true }
    })

    // Fetch category to check type
    const category = await prisma.category.findUnique({ where: { id: categoryId } })
    if (!category) return

    // POOMSAE / KYUKPA LOGIC (performance slots)
    if (category.type === 'POOMSAE' || category.type === 'KYUKPA') {
        if (players.length < 1) return

        await prisma.poomsaeMatch.deleteMany({
            where: { categoryRefId: categoryId }
        })

        // REMOVED: Global sequence reset (unsafe for multi-tenant and unnecessary)

        // Reconcile seed order: prefer an explicitly passed-in order (e.g. from an
        // edited preview), fall back to the category's saved order, shuffle otherwise.
        // The trailing `true` below (when an order was actually resolved) is what makes
        // this reproduce it instead of shuffling again — omitting it (as before) meant
        // the reconciliation above was computed but silently discarded.
        const effectivePoomsaeSeedOrder = (seedOrder && seedOrder.length > 0) ? seedOrder : category.seedOrder
        const hasEffectivePoomsaeOrder = !!(effectivePoomsaeSeedOrder && effectivePoomsaeSeedOrder.length > 0)
        const reconciledForPoomsae = hasEffectivePoomsaeOrder
            ? reconcileSeedOrder(effectivePoomsaeSeedOrder!, players)
            : players

        const poomsaeSpecs = generatePoomsaeBracket(
            reconciledForPoomsae,
            category.subtype || 'INDIVIDUAL',
            category.poomsaeForms,
            category.poomsaeFormat as 'SCORED' | 'HEAD_TO_HEAD',
            hasEffectivePoomsaeOrder
        )

        // Get count of distinct groups to assign global match IDs
        const distinctGroupIndices = Array.from(new Set(poomsaeSpecs.map(s => s.roundGroupIndex))).sort((a, b) => a - b)

        // Fetch dynamic next ID
        const getNextPoomsaeId = async (tId: string) => {
            const maxPoomsae = await prisma.poomsaeMatch.findFirst({
                where: { categoryRef: { tournamentId: tId } },
                orderBy: { matchId: 'desc' },
                select: { matchId: true }
            });
            return (maxPoomsae?.matchId || 0) + 1;
        }

        const startMatchNum = await getNextPoomsaeId(category.tournamentId)

        // Map roundGroupIndex to global shared matchId
        const groupMapping = new Map<number, number>()
        distinctGroupIndices.forEach((idx, i) => {
            groupMapping.set(idx, startMatchNum + i)
        })

        // Save Poomsae matches
        for (const spec of poomsaeSpecs) {
            const sharedMatchId = groupMapping.get(spec.roundGroupIndex) || 0

            // Pointer to the next group's shared matchId
            const nextGroupSharedId = spec.nextRoundGroupIndex !== undefined
                    ? (spec.nextRoundGroupIndex !== null ? groupMapping.get(spec.nextRoundGroupIndex) || null : null)
                    : groupMapping.get(spec.roundGroupIndex + 1) || null

            // Construct full category name including belt
            const displayName = category.belt && !category.name.toLowerCase().includes(category.belt.toLowerCase())
                ? `${category.name} ${category.belt}`
                : category.name;

            await prisma.poomsaeMatch.create({
                data: {
                    categoryRefId: categoryId,
                    category: displayName,
                    round: spec.round,
                    matchId: sharedMatchId,
                    nextMatchId: nextGroupSharedId,
                    nextMatchSlot: spec.nextMatchSlot ?? undefined,
                    targetRank: spec.targetRank,
                    performanceNumber: spec.performanceNumber,
                    playerId: spec.playerId || undefined,
                    displayName: spec.displayName || undefined,
                    memberIds: spec.memberIds || undefined,
                    memberNames: spec.memberNames || undefined,
                    assignedForms: spec.assignedForms,
                    // Normal specs are always 'Pending' (see generatePoomsaeBracket) —
                    // only the synthetic uncontested-walkover spec comes pre-marked
                    // 'Completed', so respecting it here is what actually lets a solo
                    // HEAD_TO_HEAD performer resolve as champion at generation time.
                    status: spec.status,
                    court: category.court || "Unassigned",
                    scheduledDay: category.scheduleDay ?? 1,
                }
            })

            if (spec.status === 'Completed') {
                // A walkover winner never actually performs for a scoring app to
                // report a medal back through the medals API — award it directly.
                // TEAM/PAIR has no single playerId (uses memberIds instead), so
                // every member individually gets credited.
                const winnerIds = spec.playerId ? [spec.playerId] : (spec.memberIds || '').split(',').map(s => s.trim()).filter(Boolean)
                if (winnerIds.length > 0) {
                    await prisma.player.updateMany({ where: { id: { in: winnerIds } }, data: { medal: 'GOLD' } })
                }
            }
        }

        // Update tournament match_count
        await prisma.tournament.update({
            where: { id: category.tournamentId },
            data: { match_count: startMatchNum + distinctGroupIndices.length - 1 }
        })

        // Save seed order
        await prisma.category.update({
            where: { id: categoryId },
            data: { seedOrder: reconciledForPoomsae.map(p => p.id) }
        })

        revalidatePath(`/tournament/${category.tournamentId}`)
        return
    }

    // KYORUGI LOGIC (Default)
    if (players.length === 0) return

    if (players.length === 1) {
        if (players[0].registrationStatus === 'WITHDRAWN') return // no legitimate athlete remains
        // Uncontested — no opponent at all. Auto-resolve as a walkover instead of
        // silently generating nothing, so "Generate"/"Generate All" always produces
        // a result for every category with at least one athlete.
        await createUncontestedWalkoverMatch(categoryId, players[0])
        return
    }

    await prisma.match.deleteMany({
        where: { categoryRefId: categoryId }
    })

    // Fetch dynamic next ID
    const getNextKyorugiId = async (tId: string) => {
        const maxMatch = await prisma.match.findFirst({
            where: { categoryRef: { tournamentId: tId } },
            orderBy: { matchId: 'desc' },
            select: { matchId: true }
        });
        return (maxMatch?.matchId || 0) + 1;
    }

    let currentMatchNumber = await getNextKyorugiId(category.tournamentId)

    let bracketSpecs: BracketMatchSpec[]
    let seedOrderToPersist: string[] | null = null

    if (editedSpecs && editedSpecs.length > 0) {
        // Exact reproduction of a hand-edited preview — these specs already ARE the
        // final bracket (round1 pairings + bye placements resolved), so persist them
        // verbatim instead of re-deriving via generateSingleEliminationBracket. The
        // player ids are trusted against the freshly-fetched `players` list rather
        // than used as-is, since the client only sends {id, name}.
        const byId = new Map(players.map(p => [p.id, p]))
        bracketSpecs = editedSpecs.map(s => ({
            id: s.id,
            round: s.round,
            player1: s.player1 ? (byId.get(s.player1.id) ?? null) : null,
            player2: s.player2 ? (byId.get(s.player2.id) ?? null) : null,
            nextMatchId: s.nextMatchId,
            nextMatchSlot: s.nextMatchSlot,
            isFinal: s.isFinal,
        }))
        // Not updating category.seedOrder here — it stays at whatever rank order
        // produced the pre-edit preview, which is the closest meaningful fallback if
        // this category's matches ever get cleared and re-previewed later.
    } else {
        // Reconcile seed order: prefer an explicitly passed-in order, fall back to the
        // category's saved order, shuffle otherwise. Passing reconciledForKyorugi as
        // preOrderedPlayers too is what actually makes this reproduce that order
        // instead of shuffling again — omitting it (as before) meant the
        // reconciliation above was computed but silently discarded.
        const effectiveKyorugiSeedOrder = (seedOrder && seedOrder.length > 0) ? seedOrder : category.seedOrder
        const hasEffectiveOrder = !!(effectiveKyorugiSeedOrder && effectiveKyorugiSeedOrder.length > 0)
        const reconciledForKyorugi = hasEffectiveOrder
            ? reconcileSeedOrder(effectiveKyorugiSeedOrder!, players)
            : players

        bracketSpecs = hasEffectiveOrder
            ? generateSingleEliminationBracket(reconciledForKyorugi, 1, reconciledForKyorugi)
            : generateSingleEliminationBracket(reconciledForKyorugi)
        seedOrderToPersist = reconciledForKyorugi.map(p => p.id)
    }
    // Two-pass approach due to auto-increment IDs:
    // Pass 1: Create all matches WITHOUT nextMatchId
    // Pass 2: Update matches with correct links

    const idMapping = new Map<number, number>();

    // Sort by round (Round 1 first = earliest matches get lowest IDs)
    const sortedSpecs = [...bracketSpecs].sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return a.id - b.id;
    });

    // Pass 1: Create matches
    for (const spec of sortedSpecs) {
        const createdMatch = await prisma.match.create({
            data: {
                categoryRefId: categoryId,
                category: category?.name || "Unknown",
                round: spec.round,
                matchId: currentMatchNumber++, // Assign sequential Display ID
                player1: spec.player1?.name || "TBD",
                player2: spec.player2?.name || "TBD",
                winner: null,
                nextMatchSlot: spec.nextMatchSlot,
                court: category?.court || "Unassigned"
            }
        });

        idMapping.set(spec.id, createdMatch.id);
    }

    // Pass 2: Update nextMatchId links
    for (const spec of bracketSpecs) {
        if (spec.nextMatchId !== null) {
            const actualId = idMapping.get(spec.id);
            const actualNextId = idMapping.get(spec.nextMatchId);

            if (actualId && actualNextId) {
                await prisma.match.update({
                    where: { id: actualId },
                    data: { nextMatchId: actualNextId }
                });
            }
        }
    }

    // Update tournament match_count
    await prisma.tournament.update({
        where: { id: category.tournamentId },
        data: { match_count: currentMatchNumber - 1 }
    })

    // Save seed order (skipped for the edited-specs path — see comment above)
    if (seedOrderToPersist) {
        await prisma.category.update({
            where: { id: categoryId },
            data: { seedOrder: seedOrderToPersist }
        })
    }

    revalidatePath(`/tournament/${category.tournamentId}`)
}

export async function bulkUpdateCourts(updates: { categoryId: string, court: string }[], tournamentId: string) {
    if (!updates.length || !tournamentId) return { success: false }

    try {
        await prisma.$transaction(
            updates.map(update =>
                prisma.category.update({
                    where: { id: update.categoryId },
                    data: { court: update.court || null } // Allow clearing court
                })
            )
        )

        // Also update all matches associated with these categories to reflect the new court
        const matchUpdates = updates.map(update =>
            prisma.match.updateMany({
                where: { categoryRefId: update.categoryId },
                data: { court: update.court || "Unassigned" }
            })
        )
        const poomsaeMatchUpdates = updates.map(update =>
            prisma.poomsaeMatch.updateMany({
                where: { categoryRefId: update.categoryId },
                data: { court: update.court || "Unassigned" }
            })
        )

        // Run match updates in parallel
        await Promise.all([...matchUpdates, ...poomsaeMatchUpdates])

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error("Bulk court update failed:", error)
        return { success: false, message: "Failed to update courts" }
    }
}

export async function bulkUpdateDeferFinals(categoryIds: string[], deferFinals: boolean, tournamentId: string) {
    if (!categoryIds.length || !tournamentId) return { success: false }

    try {
        await prisma.$transaction(
            categoryIds.map(id =>
                prisma.category.update({
                    where: { id },
                    data: { deferFinals }
                })
            )
        )

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error("Bulk deferFinals update failed:", error)
        return { success: false, message: "Failed to update defer finals" }
    }
}

// ─────────────────────────────────────────────────────────────
// MULTI-DAY: Update day scheduling settings for a category
// ─────────────────────────────────────────────────────────────

export async function bulkUpdatePoomsaeFormat(categoryIds: string[], poomsaeFormat: string, tournamentId: string) {
    if (!categoryIds.length || !tournamentId) return { success: false }

    try {
        await prisma.category.updateMany({
            where: { id: { in: categoryIds }, type: 'POOMSAE' },
            data: { poomsaeFormat }
        })

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error("Bulk poomsaeFormat update failed:", error)
        return { success: false, message: "Failed to update match format" }
    }
}

export async function updateCategoryDaySettings(
    categoryId: string,
    scheduleDay: number | null,
    deferFinals: boolean,
    deferFinalsToDay: number | null,
    deferSemisToDay: number | null = null
) {
    try {
        await prisma.category.update({
            where: { id: categoryId },
            data: { scheduleDay, deferFinals, deferFinalsToDay, deferSemisToDay } as any
        })
        return { success: true }
    } catch (error) {
        console.error('updateCategoryDaySettings error:', error)
        return { success: false }
    }
}

// Deletes a category entirely — its matches/poomsaeMatches (any generated
// bracket data), unassigning any registered players rather than deleting them
// (they're real athlete registrations, not disposable draw data).
export async function deleteCategory(categoryId: string) {
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { _count: { select: { players: true } } }
    })
    if (!category) return { error: 'Category not found' }

    await prisma.match.deleteMany({ where: { categoryRefId: categoryId } })
    await prisma.poomsaeMatch.deleteMany({ where: { categoryRefId: categoryId } })
    await prisma.player.updateMany({ where: { categoryId }, data: { categoryId: null } })
    await prisma.category.delete({ where: { id: categoryId } })

    revalidatePath(`/tournament/${category.tournamentId}`)
    return { success: true, unassignedPlayers: category._count.players }
}

export async function scheduleTournament(tournamentId: string, courtConfig: { name: string, categoryIds: string[] }[]) {
    if (!tournamentId) return { error: "Tournament ID required" }


    const categories = await prisma.category.findMany({
        where: { tournamentId },
        include: {
            players: {
                where: { registrationStatus: 'APPROVED' }
            }
        }
    })

    if (categories.length === 0) return { error: "No categories found" }

    // Helper to find priority
    // Map: CategoryID -> { courtName, orderIndex }
    const catPriority = new Map<string, { court: string, index: number }>();
    courtConfig.forEach(court => {
        court.categoryIds.forEach((catId, idx) => {
            catPriority.set(catId, { court: court.name, index: idx });
        });
    });

    // 1. Generate All Brackets in Memory
    let allMatches: (BracketMatchSpec & { categoryId: string, categoryName: string })[] = [];

    for (const cat of categories) {
        // Skip Poomsae Categories for Kyorugi Scheduling
        if (cat.type === 'POOMSAE') continue;

        if (cat.players.length < 2) continue;
        const specs = generateSingleEliminationBracket(cat.players);
        // Add metadata
        specs.forEach(s => {
            allMatches.push({
                ...s,
                categoryId: cat.id,
                categoryName: cat.name
            })
        });
    }

    if (allMatches.length === 0) return { error: "Not enough players to generate brackets" }

    // 2. Sort Logic for Interleaving
    // Primary: Round (Ascending) - Play all eliminations first.
    // Secondary: Category Order in Court Configuration.
    allMatches.sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;

        const prioA = catPriority.get(a.categoryId);
        const prioB = catPriority.get(b.categoryId);

        // If both have priority, compare them
        if (prioA && prioB) {
            // If same court, use order index
            if (prioA.court === prioB.court) {
                return prioA.index - prioB.index;
            }
            // Different courts? Standardize somehow, maybe just by court name to keep similar courts together in list
            return prioA.court.localeCompare(prioB.court);
        }

        // Unassigned ones go last
        if (prioA) return -1;
        if (prioB) return 1;

        return a.categoryName.localeCompare(b.categoryName);
    });

    // 3. Build mapping from (categoryId, oldTempId) -> newGlobalId
    // First, assign global IDs while preserving the old temp IDs for reference
    interface MatchWithOldId extends BracketMatchSpec {
        categoryId: string;
        categoryName: string;
        oldTempId: number;
        oldNextMatchId: number | null;
    }

    const matchesWithTracking: MatchWithOldId[] = allMatches.map(m => ({
        ...m,
        oldTempId: m.id,
        oldNextMatchId: m.nextMatchId
    }));

    // Assign global sequential IDs
    let globalMatchId = 1;
    matchesWithTracking.forEach(m => {
        m.id = globalMatchId++;
    });

    // Build lookup: (categoryId, oldTempId) -> newGlobalId
    const idLookup = new Map<string, number>();
    matchesWithTracking.forEach(m => {
        const key = `${m.categoryId}:${m.oldTempId}`;
        idLookup.set(key, m.id);
    });

    // Update nextMatchId to use new global IDs
    matchesWithTracking.forEach(m => {
        if (m.oldNextMatchId !== null) {
            const key = `${m.categoryId}:${m.oldNextMatchId}`;
            m.nextMatchId = idLookup.get(key) || null;
        } else {
            m.nextMatchId = null;
        }
    });

    // 4. Persist
    // Delete existing matches for this tournament
    const categoryIds = categories.map((c: { id: string }) => c.id);
    await prisma.match.deleteMany({
        where: { categoryRefId: { in: categoryIds } }
    });

    // Reset auto-increment sequence so IDs start fresh
    const maxMatchRecord = await prisma.match.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true }
    });
    const resetId = maxMatchRecord ? maxMatchRecord.id + 1 : 1;
    await prisma.$executeRawUnsafe(
        `ALTER SEQUENCE "Match_id_seq" RESTART WITH ${resetId}`
    );

    // Sort: Non-deferred categories grouped by category (finish early), deferred finals at the end
    // Look up the category's deferFinals setting
    const catDeferMap = new Map<string, boolean>();
    categories.forEach(c => catDeferMap.set(c.id, c.deferFinals));

    const matchesForInsertion = [...matchesWithTracking].sort((a, b) => {
        // Deferred finals go to the very end
        const aDef = a.isFinal && (catDeferMap.get(a.categoryId) ?? true);
        const bDef = b.isFinal && (catDeferMap.get(b.categoryId) ?? true);
        if (aDef && !bDef) return 1;
        if (!aDef && bDef) return -1;

        const aGroupByCategory = !(catDeferMap.get(a.categoryId) ?? true);
        const bGroupByCategory = !(catDeferMap.get(b.categoryId) ?? true);

        if (aGroupByCategory && bGroupByCategory) {
            // Both non-deferred: group by category (court priority), then round
            const prioA = catPriority.get(a.categoryId);
            const prioB = catPriority.get(b.categoryId);
            if (prioA && prioB) {
                if (prioA.court !== prioB.court) return prioA.court.localeCompare(prioB.court);
                if (prioA.index !== prioB.index) return prioA.index - prioB.index;
            }
            if (a.round !== b.round) return a.round - b.round;
            return a.id - b.id;
        }

        if (!aGroupByCategory && !bGroupByCategory) {
            // Both deferred (non-final matches): interleave by round
            if (a.round !== b.round) return a.round - b.round;
            return a.id - b.id;
        }

        // Non-deferred categories play first
        return aGroupByCategory ? -1 : 1;
    });

    // Map: our assigned globalId -> actual database auto-increment ID
    const dbIdMapping = new Map<number, number>();

    // Pass 1: Create all matches WITHOUT nextMatchId
    for (const spec of matchesForInsertion) {
        const courtAssignment = catPriority.get(spec.categoryId)?.court || "Unassigned";

        const createdMatch = await prisma.match.create({
            data: {
                categoryRefId: spec.categoryId,
                category: spec.categoryName,
                round: spec.round,
                player1: spec.player1?.name || "TBD",
                player2: spec.player2?.name || "TBD",
                winner: null,
                nextMatchSlot: spec.nextMatchSlot,
                court: courtAssignment
            }
        });

        dbIdMapping.set(spec.id, createdMatch.id);
    }

    // Pass 2: Update nextMatchId links
    for (const spec of matchesWithTracking) {
        if (spec.nextMatchId !== null) {
            const actualId = dbIdMapping.get(spec.id);
            const actualNextId = dbIdMapping.get(spec.nextMatchId);

            if (actualId && actualNextId) {
                await prisma.match.update({
                    where: { id: actualId },
                    data: { nextMatchId: actualNextId }
                });
            }
        }
    }

    revalidatePath(`/tournament/${tournamentId}`)
    return { success: true, count: allMatches.length }
}



export async function completeOnboarding(formData: FormData) {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const role = formData.get('role') as string
    const tenant = (formData.get('tenant') as string) || 'ktm'

    if (!role) {
        throw new Error('Role is required')
    }

    const isManager = role === 'MANAGER'
    const isCoOrganizer = role === 'CO_ORGANIZER'

    const userEmail = authUser.email!
    // Don't pre-fill name from email — real name is collected on the onboarding profile form
    const userName = ''

    // Resolve org ID from tenant slug for organizationMemberId
    let orgId: string | null = null
    if (tenant && tenant !== 'ktm') {
        const org = await prisma.organization.findFirst({
            where: {
                OR: [
                    { slug: tenant },
                    { customDomain: tenant },
                ]
            },
            select: { id: true }
        })
        orgId = org?.id || null
    }

    console.log('Completing onboarding for:', { role, email: userEmail, tenant, orgId })

    // Check if user already exists (by clerkId OR email)
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { clerkId: authUser.id },
                { email: userEmail }
            ]
        }
    })

    if (existingUser) {
        // User already onboarded - update clerkId and orgMembership if needed
        const updateData: any = {}
        if (existingUser.clerkId !== authUser.id) updateData.clerkId = authUser.id
        if (orgId && !existingUser.organizationMemberId) updateData.organizationMemberId = orgId
        if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: updateData
            })
        }
        return
    }

    // Generate unique 9-digit ID
    const generate9DigitId = async (): Promise<string> => {
        let attempts = 0;
        while (attempts < 100) {
            const randomNum = Math.floor(Math.random() * 1000000000);
            const id = randomNum.toString().padStart(9, '0');
            const exists = await prisma.user.findUnique({ where: { id } });
            if (!exists) return id;
            attempts++;
        }
        throw new Error('Could not generate unique ID after 100 attempts');
    };

    const newUserId = await generate9DigitId();

    // ----------------------------------------------------
    // CHECK FOR INVITES & OVERRIDE ROLE IF APPLICABLE
    // ----------------------------------------------------
    let assignedRole = role

    // Check for Club Assistant Invite
    const assistantInvite = await prisma.clubAssistantInvite.findUnique({ where: { email: userEmail } })
    if (assistantInvite) {
        assignedRole = 'ASSISTANT_CLUB_MASTER'
        await prisma.clubAssistantInvite.delete({ where: { email: userEmail } })
    }

    // Create the User record (role only — profile data collected in complete-profile)
    const dbUser = await prisma.user.create({
        data: {
            id: newUserId,
            clerkId: authUser.id,
            email: userEmail,
            role: assignedRole,
            name: userName,
            onboardingStatus: 'INCOMPLETE',
            ...(orgId && { organizationMemberId: orgId }),
        }
    })

    // Role is stored in DB — no Clerk metadata sync needed
}

/**
 * Fix B — Create a minimal DB User record immediately after Supabase sign-up.
 *
 * Some sign-up flows (e.g. the OTP-verified wotf-global flow) auto-confirm the
 * email, so `supabase.auth.signUp` returns a session right away and the browser
 * navigates straight to onboarding WITHOUT ever hitting /auth/callback. That
 * meant the Prisma User row was only created at the very end of the multi-step
 * profile form — so anyone who abandoned onboarding became a "zombie" (auth
 * account with no DB row), and `getAuthUser()` treated them as logged out.
 *
 * Calling this right after a successful sign-up guarantees the DB row exists.
 * The row is flagged `onboardingStatus: 'INCOMPLETE'` so the recovery redirect
 * (Fix A) can route the user back to finish their profile. Idempotent.
 */
export async function ensureUserRecord(): Promise<{ created: boolean }> {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return { created: false }

    // Already have a row (by auth id or email)? Nothing to do.
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { clerkId: authUser.id },
                { email: authUser.email! },
            ]
        },
        select: { id: true, clerkId: true }
    })

    if (existingUser) {
        // Link the auth id if a pre-registered row exists without one.
        if (existingUser.clerkId !== authUser.id) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { clerkId: authUser.id }
            })
        }
        return { created: false }
    }

    const role = (authUser.user_metadata?.role as string) || 'ATHLETE'
    const tenant = (authUser.user_metadata?.tenant as string) || 'ktm'

    // Resolve tenant membership from the sign-up tenant slug.
    let orgId: string | null = null
    if (tenant && tenant !== 'ktm') {
        const org = await prisma.organization.findFirst({
            where: {
                OR: [
                    { slug: tenant },
                    { customDomain: tenant },
                ]
            },
            select: { id: true }
        })
        orgId = org?.id || null
    }

    // Generate a unique 9-digit ID (matches completeOnboarding).
    let newId = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')
    let attempts = 0
    while (await prisma.user.findUnique({ where: { id: newId } })) {
        newId = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')
        if (++attempts > 100) throw new Error('Could not generate unique ID')
    }

    await prisma.user.create({
        data: {
            id: newId,
            clerkId: authUser.id,
            email: authUser.email!,
            role,
            onboardingStatus: 'INCOMPLETE',
            ...(orgId && { organizationMemberId: orgId }),
        }
    })

    return { created: true }
}

export async function completeClubMasterOnboarding(formData: FormData) {
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) throw new Error('Not authenticated')

    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const birthDateStr = formData.get('birthDate') as string
    const gender = formData.get('gender') as string
    const belt = formData.get('belt') as string
    const clubName = formData.get('clubName') as string
    const organizationId = formData.get('organizationId') as string

    // Validation
    if (!firstName || !lastName || !birthDateStr || !gender || !clubName || !organizationId) {
        throw new Error('All fields are required')
    }

    const birthDate = new Date(birthDateStr)
    const userEmail = authUser.email!

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { clerkId: authUser.id },
                { email: userEmail }
            ]
        }
    })

    if (existingUser) {
        throw new Error('User already exists')
    }

    // Check if club name already exists
    const existingClub = await prisma.club.findFirst({
        where: { name: clubName }
    })

    if (existingClub) {
        throw new Error('A club with this name already exists. Please choose a different name.')
    }

    // Generate unique 9-digit ID
    const generate9DigitId = async (): Promise<string> => {
        let attempts = 0;
        while (attempts < 100) {
            const randomNum = Math.floor(Math.random() * 1000000000);
            const id = randomNum.toString().padStart(9, '0');
            const exists = await prisma.user.findUnique({ where: { id } });
            if (!exists) return id;
            attempts++;
        }
        throw new Error('Could not generate unique ID after 100 attempts');
    };

    const newUserId = await generate9DigitId();

    // Create the User record
    const dbUser = await prisma.user.create({
        data: {
            id: newUserId,
            clerkId: authUser.id,
            email: userEmail,
            role: 'CLUB_MASTER',
            name: `${firstName} ${lastName}`,
            clubName: clubName,
            birthDate: birthDate,
            gender: gender,
            belt: belt // Should be 'Black' as default for club masters
        }
    })

    // Create the Club
    await prisma.club.create({
        data: {
            name: clubName,
            masterId: dbUser.id,
            organizationId: organizationId,
            status: 'PENDING'
        }
    })
}

export async function updateProfile(formData: FormData) {
    const userId = formData.get('userId') as string
    const name = formData.get('name') as string
    const clubName = formData.get('clubName') as string
    const belt = formData.get('belt') as string
    const gender = formData.get('gender') as string
    const weight = parseFloat(formData.get('weight') as string)
    const height = parseFloat(formData.get('height') as string)
    const birthDateStr = formData.get('birthDate') as string
    const imageFile = formData.get('image') as File | null

    if (!userId || !name) {
        throw new Error('User ID and name are required')
    }

    // Fetch user's role to enforce field-level access control
    const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    })

    const isAthlete = existingUser?.role === 'ATHLETE'

    // Parse birth date
    const birthDate = birthDateStr ? new Date(birthDateStr) : null

    // Athletes cannot self-update belt, weight, or height —
    // only club masters can change those via the approve/member edit flows
    const updateData: any = {
        name: toTitleCase(name),
        clubName,
        gender,
        birthDate,
        ...(!isAthlete && { belt }),
        ...(!isAthlete && { weight: isNaN(weight) ? null : weight }),
        ...(!isAthlete && { height: isNaN(height) ? null : height }),
    }

    // Update Prisma User
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
    })

    // Cascade all profile changes (name, belt, placement) to related records
    const { cascadeUserProfile } = await import('@/lib/cascadeUserProfile')
    cascadeUserProfile(userId).catch(console.error)

    // Upload image to Supabase Storage if provided
    if (imageFile && imageFile.size > 0) {
        try {
            const { uploadAvatar } = await import('@/lib/supabase-storage')
            const imageUrl = await uploadAvatar(userId, imageFile)
            if (imageUrl) {
                await prisma.user.update({
                    where: { id: userId },
                    data: { imageUrl }
                })
            }
        } catch (error) {
            console.error('Failed to upload profile image:', error)
        }
    }

    revalidatePath('/profile')
}

interface RegisterForTournamentInput {
    categoryId: string
    userId: string
    name: string
    gender: string
    belt: string
    weight: number
    clubName: string
    poomsaeType?: string
    teamId?: string
}

export async function registerForTournament(input: RegisterForTournamentInput) {
    const { categoryId, userId, name, gender, belt, weight, clubName, poomsaeType, teamId } = input

    const { verifyCanRegisterAthlete } = await import('@/lib/club-auth')
    const authCheck = await verifyCanRegisterAthlete(userId)
    if (authCheck.error) {
        return { error: authCheck.error }
    }

    // Generate unique 9-digit player ID
    const generatePlayerId = async (): Promise<string> => {
        let attempts = 0
        while (attempts < 100) {
            const randomNum = Math.floor(Math.random() * 1000000000)
            const id = randomNum.toString().padStart(9, '0')
            const exists = await prisma.player.findUnique({ where: { id } })
            if (!exists) return id
            attempts++
        }
        throw new Error('Could not generate unique player ID')
    }

    // Find the user's club
    const user = await prisma.user.findUnique({
        where: { id: userId }
    })

    // ── Birthday required for category placement ──────────────────────────────
    if (!user?.birthDate) {
        return { error: 'This athlete does not have a birthday on file. Please update their profile before registering for a tournament.' }
    }

    // Find club by name (if user belongs to one)
    const club = clubName ? await prisma.club.findFirst({
        where: { name: clubName }
    }) : null

    // Check club affiliation
    if (club) {
        const { checkClubAffiliation } = await import('@/lib/affiliation')
        const affiliationCheck = await checkClubAffiliation(club.id)
        if (!affiliationCheck.isActive) {
            return { error: affiliationCheck.message }
        }
    }

    try {
        const playerId = await generatePlayerId()

        await prisma.player.create({
            data: {
                id: playerId,
                name: toTitleCase(name),
                gender,
                belt,
                weight,
                categoryId,
                userId,
                clubId: club?.id || null, // Handle null explicitly if club not found or not provided
                registrationStatus: 'PENDING',
                skillLevel: deriveSkillLevel(belt),
                poomsaeType: poomsaeType || 'INDIVIDUAL',
                teamId: teamId || null
            }
        })

        revalidatePath('/club')
        return { success: true, playerId }
    } catch (error) {
        console.error('Registration error:', error)
        return { error: 'Failed to register. Please try again.' }
    }
}

export async function approveRegistrations(players: { id: string, skillLevel: string }[]) {
    try {
        for (const player of players) {
            await prisma.player.update({
                where: { id: player.id },
                data: {
                    skillLevel: player.skillLevel,
                    registrationStatus: 'APPROVED',
                    paymentStatus: 'PAID',
                }
            })
        }

        revalidatePath('/club')

        // Send approval emails (fire-and-forget, don't block the response)
        for (const player of players) {
            sendApprovalEmailForPlayer(player.id).catch(e => console.error('Email send failed:', e))
        }

        return { success: true, count: players.length }
    } catch (error) {
        console.error('Approval error:', error)
        return { error: 'Failed to approve registrations.' }
    }
}

export async function selectGuidelineTemplate(tournamentId: string, templateId: string) {
    try {
        // Get the template with all its divisions and weight categories
        const template = await prisma.guidelineTemplate.findUnique({
            where: { id: templateId },
            include: {
                divisions: {
                    orderBy: { displayOrder: 'asc' },
                    include: {
                        categories: {
                            orderBy: { minWeight: 'asc' }
                        }
                    }
                }
            }
        })

        if (!template) {
            return { error: 'Template not found' }
        }

        // Delete existing categories for this tournament (and their players/matches)
        await prisma.match.deleteMany({
            where: {
                categoryRef: {
                    tournamentId
                }
            }
        })

        await prisma.player.deleteMany({
            where: {
                category: {
                    tournamentId
                }
            }
        })

        await prisma.category.deleteMany({
            where: { tournamentId }
        })

        // Build all categories first, then batch insert
        const categoriesToCreate: { name: string; tournamentId: string; type: string; subtype: string; poomsaeForms: string | null; court: string | null }[] = []

        for (const division of template.divisions) {
            for (const weightCat of division.categories) {
                const genderLabel = weightCat.gender === 'Both' ? '' : weightCat.gender
                if (weightCat.type === 'POOMSAE' || weightCat.type === 'KYUKPA') {
                    // POOMSAE/KYUKPA: Create single category (No Skill Level Split) — both are
                    // scored disciplines, unlike Kyorugi's Novice/Intermediate/Advance split.
                    const categoryName = `${division.name} ${genderLabel} ${weightCat.name}`.replace(/\s+/g, ' ').trim()
                    // Try to extract belt from name if not present in template
                    // @ts-ignore
                    const belt = weightCat.belt || extractBeltFromCategoryName(categoryName)

                    categoriesToCreate.push({
                        name: categoryName,
                        tournamentId,
                        type: weightCat.type,
                        subtype: weightCat.subtype,
                        poomsaeForms: weightCat.poomsaeForms,
                        court: null,
                        // @ts-ignore
                        belt: belt,
                        // @ts-ignore
                        poomsaeFormat: (weightCat as any).poomsaeFormat || 'SCORED',
                        // @ts-ignore — schema defaults skillLevel to "Novice" when omitted; must
                        // null it out explicitly for scored disciplines (Poomsae/Kyukpa).
                        skillLevel: null,
                        // @ts-ignore
                        division: division.name,
                        // @ts-ignore
                        weightClass: weightCat.name
                    })
                } else {
                    // KYORUGI: Create Novice, Intermediate & Advance Variants

                    // 1. Novice
                    const noviceName = `${division.name} ${genderLabel} Novice ${weightCat.name}`.replace(/\s+/g, ' ').trim()
                    categoriesToCreate.push({
                        name: noviceName,
                        tournamentId,
                        type: weightCat.type,
                        subtype: weightCat.subtype,
                        poomsaeForms: weightCat.poomsaeForms,
                        court: null,
                        // @ts-ignore
                        skillLevel: 'Novice',
                        // @ts-ignore
                        division: division.name,
                        // @ts-ignore
                        weightClass: weightCat.name
                    })

                    // 2. Intermediate
                    const intermediateName = `${division.name} ${genderLabel} Intermediate ${weightCat.name}`.replace(/\s+/g, ' ').trim()
                    categoriesToCreate.push({
                        name: intermediateName,
                        tournamentId,
                        type: weightCat.type,
                        subtype: weightCat.subtype,
                        poomsaeForms: weightCat.poomsaeForms,
                        court: null,
                        // @ts-ignore
                        skillLevel: 'Intermediate',
                        // @ts-ignore
                        division: division.name,
                        // @ts-ignore
                        weightClass: weightCat.name
                    })

                    // 3. Advance
                    const advanceName = `${division.name} ${genderLabel} Advance ${weightCat.name}`.replace(/\s+/g, ' ').trim()
                    categoriesToCreate.push({
                        name: advanceName,
                        tournamentId,
                        type: weightCat.type,
                        subtype: weightCat.subtype,
                        poomsaeForms: weightCat.poomsaeForms,
                        court: null,
                        // @ts-ignore
                        skillLevel: 'Advance',
                        // @ts-ignore
                        division: division.name,
                        // @ts-ignore
                        weightClass: weightCat.name
                    })
                }
            }
        }

        // Batch insert all categories in one query
        await prisma.category.createMany({
            data: categoriesToCreate
        })

        const categoriesCreated = categoriesToCreate.length

        // Update tournament to link to this template
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: {
                guidelineTemplateId: templateId
            }
        })

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true, categoriesCreated }
    } catch (error) {
        console.error('Template selection error:', error)
        return { error: 'Failed to apply template' }
    }
}

export async function deleteAllCategories(tournamentId: string) {
    try {
        // Delete matches first
        await prisma.match.deleteMany({
            where: {
                categoryRef: {
                    tournamentId
                }
            }
        })

        // Delete players
        await prisma.player.deleteMany({
            where: {
                category: {
                    tournamentId
                }
            }
        })

        // Delete categories
        await prisma.category.deleteMany({
            where: { tournamentId }
        })

        // Clear template
        await prisma.tournament.update({
            where: { id: tournamentId },
            data: {
                guidelineTemplateId: null
            }
        })

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error('Delete categories error:', error)
        return { error: 'Failed to delete categories' }
    }
}

export async function unapproveRegistration(playerId: string) {
    try {
        await prisma.player.update({
            where: { id: playerId },
            data: {
                registrationStatus: 'PENDING',
                skillLevel: null
            }
        })
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error('Unapprove error:', error)
        return { error: 'Failed to unapprove registration.' }
    }
}

export async function deleteRegistration(playerId: string) {
    try {
        await prisma.player.delete({
            where: { id: playerId }
        })
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error('Delete error:', error)
        return { error: 'Failed to delete registration.' }
    }
}

interface UpdatePlayerDetailsInput {
    playerId: string
    name?: string
    height?: number
    weight?: number
    belt?: string
    skillLevel?: string
}

export async function updatePlayerDetails({ playerId, name, height, weight, belt, skillLevel, teamId, poomsaeType }: any) {
    try {
        await prisma.player.update({
            where: { id: playerId },
            data: {
                ...(name !== undefined && { name: toTitleCase(name) }),
                ...(height !== undefined && { height }),
                ...(weight !== undefined && { weight }),
                ...(belt !== undefined && { belt }),
                ...(belt !== undefined && { belt }),
                // Check if belt changed, if so, update skillLevel
                ...(belt !== undefined && { skillLevel: deriveSkillLevel(belt) }),
                ...(skillLevel !== undefined && { skillLevel }),
                ...(teamId !== undefined && { teamId }),
                ...(poomsaeType !== undefined && { poomsaeType })
            }
        })
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error('Update details error:', error)
        return { error: 'Failed to update player details.' }
    }
}

export async function bulkUnapproveRegistrations(playerIds: string[]) {
    try {
        await prisma.player.updateMany({
            where: { id: { in: playerIds } },
            data: {
                registrationStatus: 'PENDING',
                skillLevel: null
            }
        })
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error('Bulk unapprove error:', error)
        return { error: 'Failed to unapprove registrations.' }
    }
}

export async function bulkDeleteRegistrations(playerIds: string[]) {
    try {
        await prisma.player.deleteMany({
            where: { id: { in: playerIds } }
        })
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error('Bulk delete error:', error)
        return { error: 'Failed to delete registrations.' }
    }
}

export async function updateCategory(categoryId: string, tournamentId: string, data: { name?: string; type?: string; court?: string; skillLevel?: string | null; poomsaeFormat?: string; subtype?: string; poomsaeForms?: string | null }) {
    try {
        await prisma.category.update({
            where: { id: categoryId },
            data: {
                name: data.name,
                type: data.type,
                court: data.court || null,
                skillLevel: data.skillLevel,
                poomsaeFormat: data.poomsaeFormat,
                subtype: data.subtype,
                poomsaeForms: data.poomsaeForms || null
            }
        })
        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error('Update Category Error:', error)
        return { error: 'Failed to update category' }
    }
}

export async function createCategory(
    tournamentId: string, name: string, type: string = 'KYORUGI', court: string = '',
    skillLevel: string | null = 'Novice', poomsaeFormat: string = 'SCORED',
    subtype: string = 'INDIVIDUAL', poomsaeForms: string | null = null
) {
    try {
        await prisma.category.create({
            data: {
                tournamentId,
                name,
                type,
                court: court || null,
                skillLevel,
                poomsaeFormat,
                subtype,
                poomsaeForms: poomsaeForms || null
            }
        })
        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error('Create Category Error:', error)
        return { error: 'Failed to create category' }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLUB ROSTER FOR TOURNAMENT PDF
// ─────────────────────────────────────────────────────────────────────────────
export type ClubRosterPlayer = {
    id: string
    categoryId: string
    name: string
    birthDate: string | null   // ISO date string
    age: number | null
    gender: string | null
    weight: number | null
    height: number | null
    belt: string | null
    categoryName: string
    categoryType: string
    registrationStatus: string
}

export async function getClubRosterForTournament(
    tournamentId: string,
    clubId: string
): Promise<{ clubName: string; tournamentName: string; players: ClubRosterPlayer[] }> {
    const { calculateAge } = await import('@/lib/placement')

    const [tournament, players] = await Promise.all([
        prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { name: true }
        }),
        prisma.player.findMany({
            where: { category: { tournamentId }, clubId },
            include: {
                category: { select: { name: true, type: true } },
                club:     { select: { name: true } },
                user:     { select: { birthDate: true, gender: true, weight: true, height: true, belt: true } },
            },
            orderBy: [
                { category: { name: 'asc' } },
                { name: 'asc' },
            ]
        })
    ])

    const clubName = players[0]?.club?.name ?? 'Unknown Club'

    const roster: ClubRosterPlayer[] = players.map(p => {
        // User profile is source of truth; fallback to Player record for guests
        const birthDate = p.user?.birthDate ?? null
        const age       = birthDate ? calculateAge(birthDate) : null
        const gender    = p.user?.gender ?? p.gender ?? null
        const weight    = p.user?.weight ?? p.weight ?? null
        const height    = p.user?.height ?? p.height ?? null
        const belt      = p.user?.belt   ?? p.belt   ?? null

        return {
            id: p.id,
            categoryId: p.categoryId ?? '',
            name: p.name,
            birthDate: birthDate ? birthDate.toISOString().slice(0, 10) : null,
            age,
            gender,
            weight,
            height,
            belt,
            categoryName: p.category?.name ?? '—',
            categoryType: p.category?.type ?? '—',
            registrationStatus: p.registrationStatus,
        }
    })

    return {
        clubName,
        tournamentName: tournament?.name ?? 'Tournament',
        players: roster,
    }
}

export async function movePlayerToCategory(
    playerId: string,
    targetCategoryId: string,
    tournamentId: string
) {
    const dbUser = await getAuthUser()
    if (!dbUser) return { error: 'Unauthorized' }

    // Verify the player belongs to this tournament
    const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { category: { select: { tournamentId: true, type: true } } }
    })
    if (!player || player.category?.tournamentId !== tournamentId) {
        return { error: 'Player not found in this tournament' }
    }

    // Verify the target category belongs to this tournament
    const target = await prisma.category.findUnique({
        where: { id: targetCategoryId },
        select: { tournamentId: true, name: true }
    })
    if (!target || target.tournamentId !== tournamentId) {
        return { error: 'Target category not found in this tournament' }
    }

    const sourceCategoryId = player.categoryId!
    const disciplineType   = (player.category?.type ?? 'KYORUGI') as 'KYORUGI' | 'POOMSAE' | 'KYUKPA'

    // Check if ANY bracket exists for this discipline in the tournament
    // (moving a player invalidates match numbering across the whole discipline)
    const existingMatchCount = disciplineType === 'POOMSAE'
        ? await prisma.poomsaeMatch.count({ where: { categoryRef: { tournamentId } } })
        : await prisma.match.count({ where: { categoryRef: { tournamentId }, categoryRefId: { not: null } } })

    const bracketsAffected = existingMatchCount > 0

    // Move the player
    await prisma.player.update({
        where: { id: playerId },
        data: { categoryId: targetCategoryId }
    })

    // Regenerate ALL brackets for this discipline to keep match numbers sequential
    if (bracketsAffected) {
        await generateAllBrackets(tournamentId, disciplineType)
    }

    revalidatePath(`/tournament/${tournamentId}`)
    return {
        success: true,
        targetCategoryName: target.name,
        bracketsRegenerated: bracketsAffected,
        disciplineRegenerated: bracketsAffected ? disciplineType : null,
    }
}

export async function removePlayerFromTournament(playerId: string, tournamentId: string) {
    const dbUser = await getAuthUser()
    if (!dbUser) return { error: 'Unauthorized' }

    const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: { category: { select: { tournamentId: true, type: true } } }
    })
    if (!player || player.category?.tournamentId !== tournamentId) {
        return { error: 'Player not found in this tournament' }
    }

    const disciplineType = (player.category?.type ?? 'KYORUGI') as 'KYORUGI' | 'POOMSAE' | 'KYUKPA'

    const existingMatchCount = disciplineType === 'POOMSAE'
        ? await prisma.poomsaeMatch.count({ where: { categoryRef: { tournamentId } } })
        : await prisma.match.count({ where: { categoryRef: { tournamentId }, categoryRefId: { not: null } } })

    const bracketsAffected = existingMatchCount > 0

    await prisma.player.delete({ where: { id: playerId } })

    if (bracketsAffected) {
        await generateAllBrackets(tournamentId, disciplineType)
    }

    revalidatePath(`/tournament/${tournamentId}`)
    return {
        success: true,
        playerName: player.name,
        bracketsRegenerated: bracketsAffected,
        disciplineRegenerated: bracketsAffected ? disciplineType : null,
    }
}

export async function getTournamentStats(tournamentId: string) {

    const [statusGroups, kyorugiCount, poomsaeCount, kyukpaCount, clubPlayers] = await Promise.all([
        // Status breakdown via groupBy
        prisma.player.groupBy({
            by: ['registrationStatus'],
            where: { category: { tournamentId } },
            _count: { _all: true }
        }),
        // Per-discipline counts
        prisma.player.count({ where: { category: { tournamentId, type: 'KYORUGI' } } }),
        prisma.player.count({ where: { category: { tournamentId, type: 'POOMSAE' } } }),
        prisma.player.count({ where: { category: { tournamentId, type: 'KYUKPA' } } }),
        // Minimal club data for aggregation
        prisma.player.findMany({
            where: { category: { tournamentId } },
            select: {
                registrationStatus: true,
                clubId: true,
                club: { select: { id: true, name: true, logoUrl: true } }
            }
        })
    ])

    const approved = statusGroups.find(g => g.registrationStatus === 'APPROVED')?._count._all ?? 0
    const pending  = statusGroups.find(g => g.registrationStatus === 'PENDING')?._count._all ?? 0
    const rejected = statusGroups.find(g => g.registrationStatus === 'REJECTED')?._count._all ?? 0
    const total    = approved + pending + rejected

    // Aggregate clubs in JS (minimal data already fetched)
    const clubMap = new Map<string, { id: string | null; name: string; logoUrl: string | null; count: number; approved: number; pending: number }>()
    for (const player of clubPlayers) {
        const key  = player.clubId || 'unaffiliated'
        const name = player.club?.name || 'Unaffiliated'
        const existing = clubMap.get(key)
        if (existing) {
            existing.count++
            if (player.registrationStatus === 'APPROVED') existing.approved++
            if (player.registrationStatus === 'PENDING')  existing.pending++
        } else {
            clubMap.set(key, {
                id: player.club?.id || null,
                name,
                logoUrl: player.club?.logoUrl || null,
                count: 1,
                approved: player.registrationStatus === 'APPROVED' ? 1 : 0,
                pending:  player.registrationStatus === 'PENDING'  ? 1 : 0,
            })
        }
    }

    // Deduplicate athletes by userId (same person in multiple disciplines = 1 unique athlete)
    // Fetch userId + name + clubId for deduplication
    const allPlayersForDedup = await prisma.player.findMany({
        where: { category: { tournamentId } },
        select: { userId: true, name: true, clubId: true, registrationStatus: true }
    })

    const uniqueAthleteSet = new Set<string>()
    const uniqueApprovedSet = new Set<string>()
    for (const p of allPlayersForDedup) {
        const key = p.userId || `${p.name.toLowerCase().trim()}::${p.clubId || 'none'}`
        uniqueAthleteSet.add(key)
        if (p.registrationStatus === 'APPROVED') uniqueApprovedSet.add(key)
    }

    return {
        total,
        approved,
        pending,
        rejected,
        uniqueAthletes: uniqueAthleteSet.size,
        uniqueApproved: uniqueApprovedSet.size,
        kyorugi: kyorugiCount,
        poomsae: poomsaeCount,
        kyukpa:  kyukpaCount,
        clubs: Array.from(clubMap.values()).sort((a, b) => b.count - a.count)
    }
}

export async function getTournamentPlayers(
    tournamentId: string,
    skip?: number,
    take?: number,
    search?: string,
    status?: string,
    discipline?: string
) {
    // Build the category filter (tournamentId + optional discipline)
    const categoryFilter: any = { tournamentId }
    if (discipline) categoryFilter.type = discipline

    // Build the top-level where clause
    const where: any = { category: categoryFilter }

    // Optional text search across name, club, category
    if (search && search.trim().length >= 2) {
        where.OR = [
            { name: { contains: search.trim(), mode: 'insensitive' as const } },
            { club: { name: { contains: search.trim(), mode: 'insensitive' as const } } },
            { category: { name: { contains: search.trim(), mode: 'insensitive' as const } } },
        ]
    }

    // Optional status filter
    if (status) where.registrationStatus = status

    return await prisma.player.findMany({
        where,
        include: {
            category: {
                select: { id: true, name: true, type: true, tournamentId: true, court: true }
            },
            club: {
                select: { id: true, name: true }
            }
        },
        orderBy: {
            category: { name: 'asc' }
        },
        skip,
        take
    })
}

// ----------------------------------------------------------------------
// CLUB MANAGEMENT ACTIONS
// ----------------------------------------------------------------------

export async function updateClubSettings(formData: FormData) {
    try {
        const clubId = formData.get('clubId') as string
        const logoFile = formData.get('logo') as File | null
        const address = formData.get('address') as string | null
        const phone = formData.get('phone') as string | null

        if (!clubId) return { error: 'Club ID is required' }

        const dbUser = await getAuthUser()
        if (!dbUser) return { error: 'Unauthorized' }

        if (!dbUser || dbUser.role !== 'CLUB_MASTER') {
            return { error: 'Insufficient permissions' }
        }

        // Find the club first to check auth
        const club = await prisma.club.findUnique({ where: { id: clubId } })
        if (!club) return { error: 'Club not found' }

        const isMaster = club.masterId === dbUser.id

        if (!isMaster) {
            return { error: 'Only the Club Master can edit the club settings' }
        }

        const updateData: any = {}
        if (address !== null) updateData.address = address
        if (phone !== null) updateData.phone = phone

        // Handle File Upload
        if (logoFile && logoFile.size > 0) {
            // Validate file type (image only)
            if (!logoFile.type.startsWith('image/')) {
                return { error: 'File must be an image' }
            }
            // Validate size (e.g., 5MB)
            if (logoFile.size > 5 * 1024 * 1024) {
                return { error: 'Image size must be less than 5MB' }
            }

            const bytes = await logoFile.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Unique filename: club-logo-{clubId}-{timestamp}-{cleanName}
            const timestamp = Date.now()
            const safeName = logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `club-logo-${clubId}-${timestamp}-${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, buffer, {
                    contentType: logoFile.type,
                    upsert: false
                })

            if (uploadError) {
                console.error('Supabase upload error:', uploadError)
                return { error: 'Failed to upload image' }
            }

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filename)

            updateData.logoUrl = publicUrl
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.club.update({
                where: { id: clubId },
                data: updateData
            })
        }

        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error('Failed to update club settings:', error)
        return { error: 'Failed to update settings' }
    }
}

export async function getUpcomingTournaments() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tournaments = await prisma.tournament.findMany({
        where: {
            startDate: {
                gte: today
            }
        },
        select: {
            id: true,
            name: true,
            startDate: true,
            categories: {
                select: {
                    id: true,
                    name: true,
                    type: true
                }
            }
        },
        orderBy: {
            startDate: 'asc'
        }
    })
    return tournaments
}


export async function searchClubMembers(clubName: string, query: string) {
    if (!query || query.length < 2) return []

    const members = await prisma.user.findMany({
        where: {
            clubName: clubName,
            role: 'ATHLETE',
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            name: true,
            email: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            birthDate: true,
            clerkId: true // for avatar
        },
        take: 10
    })
    return members
}

export async function searchAllAthletes(query: string) {
    if (!query || query.length < 2) return []

    const members = await prisma.user.findMany({
        where: {
            role: { in: ['ATHLETE', 'ASSISTANT_CLUB_MASTER', 'CLUB_MASTER'] },
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            name: true,
            email: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            birthDate: true,
            clubName: true,
        },
        take: 10
    })
    return members
}

export async function fetchClubMembers(clubName: string, page: number, pageSize: number, search?: string) {
    const skip = (page - 1) * pageSize

    const baseWhere: any = { clubName: { equals: clubName, mode: 'insensitive' }, role: { in: ['ATHLETE', 'ASSISTANT_CLUB_MASTER'] } }

    // Add search filter if provided
    if (search && search.trim()) {
        baseWhere.OR = [
            { name: { contains: search.trim(), mode: 'insensitive' } },
            { email: { contains: search.trim(), mode: 'insensitive' } }
        ]
    }

    const [members, totalCount] = await Promise.all([
        prisma.user.findMany({
            where: baseWhere,
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        }),
        prisma.user.count({
            where: baseWhere
        })
    ])
    // Members already have imageUrl from DB (migrated to Supabase Storage)
    const membersWithAvatars = members.map(m => ({
        ...m,
        imageUrl: m.imageUrl || null
    }))

    const totalPages = Math.ceil(totalCount / pageSize)

    return {
        members: membersWithAvatars,
        totalPages
    }
}

import { getClubHomeData } from '@/app/club/data'

export async function fetchClubDashboardData(clubId: string, clubName: string) {
    return await getClubHomeData(clubId, clubName)
}

export async function getClubAffiliationData(clubId: string) {
    const { getClubAffiliationStatus } = await import('@/lib/affiliation')
    const status = await getClubAffiliationStatus(clubId)
    if (!status || !status.hasOrganization || !status.organizationId) {
        return { affiliationStatus: null, paymentConfig: null }
    }

    const org = await prisma.organization.findUnique({
        where: { id: status.organizationId },
        select: {
            affiliationPaymentMethod: true,
            affiliationQrCodeUrl: true,
            affiliationBankName: true,
            affiliationBankAccountNo: true,
            affiliationBankAccountName: true,
            affiliationInstructions: true,
            affiliationPaymentMethods: true,
        }
    })

    // Build payment methods array — prefer new JSON, fall back to legacy fields
    const paymentMethods = (org as any)?.affiliationPaymentMethods || []
    const legacyMethod = org?.affiliationBankName ? [{
        id: 'legacy',
        label: org.affiliationBankName,
        bankName: org.affiliationBankName,
        accountNo: org.affiliationBankAccountNo || '',
        accountName: org.affiliationBankAccountName || '',
        qrCodeUrl: org.affiliationQrCodeUrl || null,
    }] : []

    return {
        affiliationStatus: status,
        paymentConfig: org ? {
            paymentMethod: org.affiliationPaymentMethod === 'xendit' ? 'manual' : (org.affiliationPaymentMethod || 'manual'),
            paymentMethods: paymentMethods.length > 0 ? paymentMethods : legacyMethod,
            instructions: org.affiliationInstructions,
        } : null
    }
}

export async function fetchLandingPageEvents() {
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    // Parallel fetch (Promotions are internal-only, not shown on landing page)
    const [upcomingTournaments, upcomingSeminars] = await Promise.all([
        prisma.tournament.findMany({
            where: {
                startDate: { gte: currentDate },
                status: { not: 'CANCELLED' }
            },
            orderBy: { startDate: 'asc' },
            take: 6
        }),
        prisma.seminar.findMany({
            where: {
                startDate: { gte: currentDate }
            },
            orderBy: { startDate: 'asc' },
            take: 6
        })
    ])

    // Normalize tournaments
    const normalizedTournaments = upcomingTournaments.map(t => ({
        id: t.id,
        type: 'TOURNAMENT',
        name: t.name,
        date: t.startDate,
        venue: t.venue,
        imageUrl: t.headerImageUrl,
        status: t.status,
        regStart: t.registrationStart,
        regEnd: t.registrationEnd,
        link: `/tournament/${t.id}`
    }))

    // Normalize seminars
    const normalizedSeminars = upcomingSeminars.map(s => ({
        id: s.id,
        type: 'SEMINAR',
        name: s.name,
        date: s.startDate,
        venue: s.venue,
        imageUrl: s.bannerUrl,
        status: s.status,
        visibility: s.visibility,
        regStart: null,
        regEnd: s.registrationDeadline,
        link: `/seminars/${s.id}`
    }))

    // Combine and sort
    return [...normalizedTournaments, ...normalizedSeminars]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 6)
}

export async function fetchAthleteDashboardData(clerkId: string, organizationId?: string | null) {
    // If no organizationId passed, auto-detect from tenant headers (for client-side refetch)
    if (organizationId === undefined) {
        const { getTenant } = await import('@/lib/tenant')
        const tenant = await getTenant()
        // KTM's tenant id now resolves to a real Organization row (needed for
        // GSS tournament-host attribution), but "show all events" has always
        // been KTM's behavior here (see below) — null preserves that.
        organizationId = tenant.slug === 'ktm' ? null : tenant.id
    }
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkId },
        select: {
            id: true,
            role: true,
            name: true,
            email: true,
            clubName: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            birthDate: true,
            athleteNumber: true,
            createdAt: true,
            isVerified: true,
            cardPaymentStatus: true,
            cardPaymentProofUrl: true,
            licensePaymentStatus: true,
            licensePaymentProofUrl: true,
            licenseRequestedVia: true,
            country: true,
        }
    })

    if (!dbUser) return null

    // Fetch club info if user has a club
    let clubLogo: string | null = null
    let clubId: string | null = null
    let athleteCardFee: number | null = null
    let athleteCardPaymentInstructions: string | null = null
    let athleteCardPaymentMethods: any = null

    if (dbUser.clubName) {
        const club = await prisma.club.findFirst({
            where: { name: { equals: dbUser.clubName, mode: 'insensitive' } },
            select: { id: true, logoUrl: true, organizationId: true }
        })
        clubLogo = club?.logoUrl || null
        clubId = club?.id || null

        if (club?.organizationId) {
            const org = await prisma.organization.findUnique({
                where: { id: club.organizationId },
                select: { athleteCardFee: true, athleteCardPaymentInstructions: true, athleteCardPaymentMethods: true }
            })
            athleteCardFee = org?.athleteCardFee || null
            athleteCardPaymentInstructions = org?.athleteCardPaymentInstructions || null
            athleteCardPaymentMethods = org?.athleteCardPaymentMethods || null
        }
    }

    // Athlete License fee/payment info is KTM's own, not the athlete's club's
    // org — KTM is the sole issuer of the license.
    let licenseFee: number | null = null
    let licensePaymentInstructions: string | null = null
    let licensePaymentMethods: any = null
    const { resolveKtmOrgId } = await import('@/lib/tenant')
    const ktmOrgId = await resolveKtmOrgId()
    if (ktmOrgId) {
        const ktmOrg = await prisma.organization.findUnique({
            where: { id: ktmOrgId },
            select: { licenseFee: true, licensePaymentInstructions: true, licensePaymentMethods: true }
        })
        licenseFee = ktmOrg?.licenseFee || null
        licensePaymentInstructions = ktmOrg?.licensePaymentInstructions || null
        licensePaymentMethods = ktmOrg?.licensePaymentMethods || null
    }

    // Fetch athlete registrations
    const registrations = await prisma.player.findMany({
        where: { userId: dbUser.id },
        include: {
            category: {
                include: {
                    tournament: {
                        select: {
                            id: true,
                            name: true,
                            startDate: true,
                            venue: true,
                            status: true
                        }
                    }
                }
            }
        },
        orderBy: { id: 'desc' }
    })

    // Fetch seminar registrations
    // playerId may be either a User ID (from org/club flows) or a Player ID (from self-reg flow)
    const userPlayerIds = await prisma.player.findMany({
        where: { userId: dbUser.id },
        select: { id: true }
    }).then(ps => ps.map(p => p.id))

    const seminarRegistrations = await prisma.seminarRegistration.findMany({
        where: {
            playerId: { in: [dbUser.id, ...userPlayerIds] }
        },
        select: {
            id: true,
            seminarId: true,
            status: true,
            playerName: true,
            qrCodeToken: true,
            createdAt: true,
            seminar: {
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    venue: true
                }
            }
        }
    })

    // Fetch promotion test registrations
    const promotionRegistrations = await prisma.promotionTestRegistration.findMany({
        where: {
            playerId: { in: [dbUser.id, ...userPlayerIds] }
        },
        select: {
            id: true,
            promotionTestId: true,
            status: true,
            playerName: true,
            currentBelt: true,
            targetBelt: true,
            paymentStatus: true,
            createdAt: true,
            promotionTest: {
                select: {
                    id: true,
                    name: true,
                    testDate: true,
                    venue: true
                }
            }
        }
    })

    // Fetch generic upcoming events for the club (My Events)
    // Scoped by organization: show events from user's org + KTM-created (global) events
    let clubUpcomingEvents: any[] = []
    if (clubId) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Build org filter: user's org events + KTM global events
        // Tournament doesn't have organizationId, Seminar and PromotionTest do
        let seminarOrgFilter: any = {}
        if (organizationId) {
            // Look up KTM org ID to include global events
            const ktmOrg = await prisma.organization.findFirst({
                where: { slug: 'ktm' },
                select: { id: true }
            })
            const allowedOrgIds = [organizationId]
            if (ktmOrg && ktmOrg.id !== organizationId) {
                allowedOrgIds.push(ktmOrg.id)
            }
            seminarOrgFilter = { organizationId: { in: allowedOrgIds } }
        }
        // If no organizationId provided (KTM admin), show all events

        const [tournaments, seminars, promotionTests] = await Promise.all([
            prisma.tournament.findMany({
                where: {
                    startDate: { gte: today },
                    status: { not: 'CANCELLED' },
                },
                orderBy: { startDate: 'asc' },
                take: 20,
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    venue: true,
                    status: true,
                    categories: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    }
                }
            }),
            prisma.seminar.findMany({
                where: {
                    startDate: { gte: today },
                    status: { not: 'CANCELLED' },
                    ...seminarOrgFilter,
                },
                orderBy: { startDate: 'asc' },
                take: 20,
                select: {
                    id: true,
                    name: true,
                    startDate: true,
                    venue: true,
                    status: true
                }
            }),
            prisma.promotionTest.findMany({
                where: {
                    testDate: { gte: today },
                    status: { not: 'CANCELLED' },
                    ...seminarOrgFilter,
                },
                orderBy: { testDate: 'asc' },
                take: 20,
                select: {
                    id: true,
                    name: true,
                    testDate: true,
                    venue: true,
                    status: true
                }
            })
        ])

        const combinedEvents = [
            ...tournaments.map(t => ({ ...t, type: 'TOURNAMENT' })),
            ...seminars.map(s => ({ ...s, type: 'SEMINAR' })),
            ...promotionTests.map(p => ({ ...p, startDate: p.testDate, type: 'PROMOTION_TEST' }))
        ]

        clubUpcomingEvents = combinedEvents
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 20)
    }

    // Fetch Global Ranking Points
    let globalRanking = null
    try {
        const rankingRecords = await prisma.globalAthleteRanking.findMany({
            where: { userId: dbUser.id }
        })

        // Sum up total points across disciplines (Kyorugi/Poomsae) for the dashboard summary
        if (rankingRecords.length > 0) {
            globalRanking = {
                totalPoints: rankingRecords.reduce((acc: number, r: any) => acc + r.totalPoints, 0),
                bestRank: Math.min(...rankingRecords.map((r: any) => r.globalRank)),
                disciplines: rankingRecords.map((r: any) => ({ type: r.type, rank: r.globalRank, points: r.totalPoints }))
            }
        }
    } catch (e) {
        // Materialized view might not exist yet
        console.error("Failed to fetch global ranking for dashboard", e)
    }

    return {
        user: dbUser,
        clubLogo,
        registrations,
        seminarRegistrations,
        promotionRegistrations,
        clubUpcomingEvents,
        globalRanking,
        athleteCardFee,
        athleteCardPaymentInstructions,
        athleteCardPaymentMethods,
        licenseFee,
        licensePaymentInstructions,
        licensePaymentMethods,
    }
}

const EVENTS_PER_PAGE = 10

export async function fetchTournamentsData(userId: string, page: number = 1) {
    // Check if user is an athlete and has a club
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            role: true,
            clubName: true,
            // also get club if user IS a master (unlikely for this flow but good for completeness?)
            club: { select: { id: true } }
        }
    })

    let filterClubId: string | null = null

    // If ATHLETE, find their club by name
    if (user?.role === 'ATHLETE' && user.clubName) {
        const club = await prisma.club.findFirst({
            where: { name: { equals: user.clubName, mode: 'insensitive' } },
            select: { id: true }
        })
        filterClubId = club?.id || null
    }
    // If user is CLUB_MASTER (viewing this page?), use their potential owned club
    else if (user?.club?.id) {
        filterClubId = user.club.id
    }

    const whereClause: any = {
        startDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
    }

    if (filterClubId) {
        whereClause.participatingClubs = {
            some: {
                clubId: filterClubId
            }
        }
    }

    // Count total tournaments for pagination
    const totalCount = await prisma.tournament.count({
        where: whereClause
    })

    const totalPages = Math.ceil(totalCount / EVENTS_PER_PAGE)

    // Get paginated tournaments
    const tournaments = await prisma.tournament.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            startDate: true,
            venue: true,
            status: true,
            categories: {
                select: {
                    type: true
                },
                distinct: ['type']
            }
        },
        orderBy: {
            startDate: 'asc'
        },
        skip: (page - 1) * EVENTS_PER_PAGE,
        take: EVENTS_PER_PAGE
    })

    // Get user's existing registrations
    const userRegistrations = await prisma.player.findMany({
        where: { userId: userId },
        select: {
            category: {
                select: {
                    tournamentId: true
                }
            }
        }
    })

    const registeredTournamentIds = userRegistrations.map(r => r.category?.tournamentId).filter(Boolean)

    return {
        tournaments,
        totalCount,
        totalPages,
        currentPage: page,
        registeredTournamentIds
    }
}

// ============================================
// CLUB EVENT INTENT ACTIONS
// ============================================

export async function unregisterFromTournament(playerId: string) {
    const dbUser = await getAuthUser()
    if (!dbUser) {
        return { error: 'Unauthorized' }
    }

    try {
        // Verify the player record belongs to this user before deleting
        const player = await prisma.player.findUnique({
            where: { id: playerId }
        })

        if (!player || player.userId !== dbUser.id) {
            return { error: 'Registration not found or unauthorized' }
        }

        await prisma.player.delete({
            where: { id: playerId }
        })

        revalidatePath('/athlete')
        return { success: true }
    } catch (error) {
        console.error('Error unregistering from tournament:', error)
        return { error: 'Failed to unregister' }
    }
}

export async function removeMemberFromClub(memberId: string) {
    const dbUser = await getAuthUser()
    if (!dbUser) return { error: 'Unauthorized' }

    // Verify requesting user is club master (this check could be more robust)
    // For now assuming the dashboard handles basic auth checks, effectively trusting the session user's context
    // Ideally we should check if the current user is effectively the owner of the club the member belongs to.

    try {
        await prisma.user.update({
            where: { id: memberId },
            data: { clubName: null }
        })
        return { success: true }
    } catch (error) {
        console.error('Error removing member:', error)
        return { error: 'Failed to remove member' }
    }
}

export async function updateClubMember(memberId: string, data: { name?: string, weight?: number, height?: number, belt?: string, gender?: string, email?: string, birthDate?: Date }) {
    const dbUser = await getAuthUser()
    if (!dbUser) return { error: 'Unauthorized' }

    try {
        const oldUser = await prisma.user.findUnique({ where: { id: memberId } })

        await prisma.user.update({
            where: { id: memberId },
            data: {
                ...data,
                ...(data.name !== undefined && { name: toTitleCase(data.name) }),
            }
        })

        // Cascade all profile changes (name, belt, placement) to related records
        const { cascadeUserProfile } = await import('@/lib/cascadeUserProfile')
        cascadeUserProfile(memberId).catch(console.error)

        return { success: true }
    } catch (error) {
        console.error('Error updating member:', error)
        return { error: 'Failed to update member' }
    }
}


export async function getTournamentCategories(tournamentId: string) {
    const categories = await prisma.category.findMany({
        where: { tournamentId },
        select: {
            id: true,
            name: true,
            type: true
        },
        orderBy: { name: 'asc' }
    })
    return categories
}

export async function getAllOrganizationAlerts() {
    const dbUser = await getAuthUser()
    if (!dbUser) return []

    const userWithTournaments = await prisma.user.findUnique({
        where: { id: dbUser.id },
        include: {
            createdTournaments: {
                where: { status: 'UPCOMING' },
                select: { id: true, name: true }
            }
        }
    })
    if (!userWithTournaments) return []

    const allAlerts = []

    for (const tournament of userWithTournaments.createdTournaments) {
        const { alerts, proposals } = await getTournamentAlerts(tournament.id)
        if (alerts.length > 0) {
            allAlerts.push({
                tournamentId: tournament.id,
                tournamentName: tournament.name,
                alerts,
                proposals
            })
        }
    }

    return allAlerts
}


// ============================================
// SMART TOURNAMENT ACTIONS
// ============================================

import { detectSmartAlerts, createSmartProposal } from '@/lib/smart-tournament-logic'

export async function getTournamentAlerts(tournamentId: string) {
    const alerts = await detectSmartAlerts(tournamentId)

    // Fetch existing proposals
    const proposals = await prisma.smartProposal.findMany({
        where: {
            tournamentId,
            status: 'PENDING'
        },
        include: {
            votes: true
        }
    })

    return { alerts, proposals }
}

export async function getResolutionHistory(tournamentId: string) {
    const resolved = await prisma.smartProposal.findMany({
        where: {
            tournamentId,
            status: 'COMPLETED' // forceExecuteSmartAction always sets this on completion — was mismatched to 'EXECUTED' here, so this history was silently always empty
        },
        include: {
            votes: true
        },
        orderBy: { updatedAt: 'desc' }
    })

    return resolved
}

export async function initiateSmartProposal(
    tournamentId: string,
    type: string,
    data: any,
    clubsInvolved: string[] = []
) {
    const proposal = await createSmartProposal(tournamentId, type, data)

    // In a real app, we would send notifications to `clubsInvolved` here
    // e.g. await sendNotifications(clubsInvolved, "New Proposal Required Action")

    revalidatePath(`/organization`)
    revalidatePath(`/tournament/${tournamentId}`)
    return { success: true, proposalId: proposal.id }
}

export async function updateTournamentGuidelines(tournamentId: string, guidelinesText: string) {
    const dbUser = await getAuthUser()
    if (!dbUser) return { success: false, error: "Unauthorized" }

    try {
        if (!dbUser) return { success: false, error: "User not found" }

        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { managers: true }
        })

        if (!tournament) return { success: false, error: "Tournament not found" }

        const isOrganizer = tournament.organizerId === dbUser.id
        const isManager = tournament.managers.some(m => m.id === dbUser.id)
        const isAdmin = dbUser.role === 'ADMIN'

        if (!isOrganizer && !isManager && !isAdmin) {
            return { success: false, error: "Insufficient permissions" }
        }

        await prisma.tournament.update({
            where: { id: tournamentId },
            data: { guidelinesText }
        })

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error("Failed to update guidelines:", error)
        return { success: false, error: "Failed to update guidelines" }
    }
}

export async function updateTournamentDetails(
    tournamentId: string,
    data: {
        name?: string
        venue?: string
        startDate?: string
        registrationStart?: string
        registrationEnd?: string
        earlyBirdDeadline?: string
        earlyBirdPrice?: number | null
        regularPrice?: number | null
        headerImageUrl?: string | null
        status?: string
        guidelines?: string | null
    }
) {
    const dbUser = await getAuthUser()
    if (!dbUser) return { success: false, error: 'Unauthorized' }

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: { managers: true }
        })

        if (!tournament) return { success: false, error: 'Tournament not found' }

        const isOrganizer = tournament.organizerId === dbUser.id
        const isManager = tournament.managers.some(m => m.id === dbUser.id)
        const isAdmin = dbUser.role === 'ADMIN'

        if (!isOrganizer && !isManager && !isAdmin) {
            return { success: false, error: 'Insufficient permissions' }
        }

        await prisma.tournament.update({
            where: { id: tournamentId },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.venue !== undefined && { venue: data.venue || null }),
                ...(data.startDate !== undefined && data.startDate && { startDate: new Date(data.startDate) }),
                ...(data.registrationStart !== undefined && { registrationStart: data.registrationStart ? new Date(data.registrationStart) : null }),
                ...(data.registrationEnd !== undefined && { registrationEnd: data.registrationEnd ? new Date(data.registrationEnd) : null }),
                ...(data.earlyBirdDeadline !== undefined && { earlyBirdDeadline: data.earlyBirdDeadline ? new Date(data.earlyBirdDeadline) : null }),
                ...(data.earlyBirdPrice !== undefined && { earlyBirdPrice: data.earlyBirdPrice }),
                ...(data.regularPrice !== undefined && { regularPrice: data.regularPrice }),
                ...(data.headerImageUrl !== undefined && { headerImageUrl: data.headerImageUrl || null }),
                ...(data.status !== undefined && { status: data.status as any }),
                ...(data.guidelines !== undefined && { guidelinesText: data.guidelines }),
            }
        })

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error: any) {
        console.error('Failed to update tournament details:', error)
        return { success: false, error: error?.message || 'Failed to update tournament details' }
    }
}

/**
 * Force executes a proposal (Organiser side or Auto-resolve)
 */
export async function forceExecuteSmartAction(proposalId: string, overrideVote?: string) {
    try {
        const proposal = await prisma.smartProposal.findUnique({
            where: { id: proposalId }
        })

        if (!proposal) return { error: 'Proposal not found' }

        const data = JSON.parse(proposal.data)

        // Resolution is now solely the organiser's call — persisted here so the
        // final "mark completed" step below can record which decision was made
        // back onto the proposal's own data.
        let decision: string | undefined

        if (proposal.type === 'UNCONTESTED' || proposal.type === 'CROSS_DIVISION') {
            decision = overrideVote

            if (!decision) return { error: 'No decision made yet' }

            if (decision === 'MOVE_UP') {
                if (proposal.type === 'CROSS_DIVISION') {
                    // Cross-division: move to the pre-computed target category directly
                    const targetCategoryId = data.targetCategoryId
                    if (!targetCategoryId) return { error: 'No target category specified for cross-division move' }

                    await prisma.player.update({
                        where: { id: data.playerId },
                        data: { categoryId: targetCategoryId }
                    })
                } else {
                    // UNCONTESTED: find next heavier sibling in same division
                    const player = await prisma.player.findUnique({
                        where: { id: data.playerId },
                        include: { category: true }
                    })

                    if (player && player.category) {
                        const siblings = await prisma.category.findMany({
                            where: {
                                tournamentId: player.category.tournamentId,
                                type:         player.category.type,
                                subtype:      player.category.subtype,
                                gender:       player.category.gender,
                                belt:         player.category.belt,
                                skillLevel:   player.category.skillLevel,
                                minAge:       player.category.minAge,
                                maxAge:       player.category.maxAge,
                            },
                            orderBy: { minWeight: 'asc' }
                        })

                        const currentIdx = siblings.findIndex(c => c.id === player.categoryId)
                        if (currentIdx !== -1 && currentIdx < siblings.length - 1) {
                            const target = siblings[currentIdx + 1]
                            await prisma.player.update({
                                where: { id: player.id },
                                data: { categoryId: target.id }
                            })
                        } else {
                            return { error: 'No heavier category found in the same division' }
                        }
                    }
                }
            } else if (decision === 'WITHDRAW') {
                // Actually remove them from the tournament (not just flag a status) —
                // reuses the same path as the admin's manual "Remove Player" action,
                // which also auto-regenerates brackets for the discipline if any were
                // already generated (which in turn auto-walkovers any category this
                // leaves uncontested, via the generateAllBrackets fix above).
                const removeResult = await removePlayerFromTournament(data.playerId, proposal.tournamentId)
                if ((removeResult as any)?.error) {
                    // Bail out WITHOUT marking the proposal completed below — the
                    // player is still in the tournament, so the alert must keep
                    // showing as unresolved, not silently look "handled."
                    return { error: (removeResult as any).error }
                }
            }
            // WALKOVER: no data mutation here — this only records the decision (via
            // the proposal update below). The actual match isn't created until the
            // organiser clicks Generate/Generate All, which is when
            // createUncontestedWalkoverMatch (or generateAllBrackets's equivalent
            // inline path) actually runs for this category. detectSmartAlerts reads
            // the persisted decision to show "Walkover" instead of "Uncontested" in
            // the meantime, without anything in the bracket actually changing yet.
        }
        else if (proposal.type === 'MERGE') {
            const { sourceCategoryId, targetCategoryId } = data
            // Move all players
            await prisma.player.updateMany({
                where: { categoryId: sourceCategoryId },
                data: { categoryId: targetCategoryId }
            })
            // Delete source
            await prisma.category.delete({ where: { id: sourceCategoryId } })
        }
        else if (proposal.type === 'SPLIT') {
            const { categoryId } = data
            const category = await prisma.category.findUnique({
                where: { id: categoryId },
                include: {
                    players: {
                        include: { user: { select: { height: true, weight: true } }, club: { select: { id: true } } }
                    }
                }
            })

            if (category) {
                const baseName = category.name

                // ── Determine sort metric ─────────────────────────────────────
                // Height-based: Super Toddler, Toddler, Grade School
                // Detected by category name or explicit minHeight on the category.
                // Weight-based: Cadet, Junior, Senior (everything else)
                const nameLower = baseName.toLowerCase()
                const isHeightBased =
                    nameLower.includes('toddler') ||
                    nameLower.includes('grade school') ||
                    (category.minHeight != null && (category.minHeight ?? 0) > 0)

                const getMetric = (p: any): number => {
                    if (isHeightBased) {
                        return p.user?.height ?? p.height ?? 0
                    }
                    return p.user?.weight ?? p.weight ?? 0
                }

                // Sort ascending by the relevant metric
                const sortedPlayers = [...category.players].sort((a, b) => getMetric(a) - getMetric(b))
                const midIndex = Math.floor(sortedPlayers.length / 2)

                // ── Derive group labels ───────────────────────────────────────
                const metricA = getMetric(sortedPlayers[midIndex - 1])
                const metricB = getMetric(sortedPlayers[midIndex])
                const unit    = isHeightBased ? 'cm' : 'kg'
                const nameA = metricA ? `${baseName} (≤${metricA}${unit})` : `${baseName} (Group A)`
                const nameB = metricB ? `${baseName} (>${metricA ?? '?'}${unit})` : `${baseName} (Group B)`

                const [cA, cB] = await prisma.$transaction([
                    prisma.category.create({
                        data: { ...category, id: undefined, name: nameA, players: undefined, matches: undefined } as any
                    }),
                    prisma.category.create({
                        data: { ...category, id: undefined, name: nameB, players: undefined, matches: undefined } as any
                    })
                ])

                // ── Club-aware serpentine draft ───────────────────────────────
                // Assigns players to groups ensuring the same club is spread
                // evenly across both groups. Iterates sorted players and places
                // each into the group with fewer of that club's players so far,
                // using overall group size as a tiebreaker to keep groups balanced.
                const groupA: typeof sortedPlayers = []
                const groupB: typeof sortedPlayers = []
                const clubCountA = new Map<string, number>()
                const clubCountB = new Map<string, number>()

                for (const player of sortedPlayers) {
                    const clubKey = (player as any).club?.id || player.clubId || 'none'
                    const inA = clubCountA.get(clubKey) ?? 0
                    const inB = clubCountB.get(clubKey) ?? 0

                    // Prefer the group with fewer players from this club.
                    // Tiebreak: prefer the smaller group overall.
                    const preferA =
                        inA < inB ||
                        (inA === inB && groupA.length <= groupB.length)

                    if (preferA) {
                        groupA.push(player)
                        clubCountA.set(clubKey, inA + 1)
                    } else {
                        groupB.push(player)
                        clubCountB.set(clubKey, inB + 1)
                    }
                }

                const updates = [
                    ...groupA.map(p => prisma.player.update({ where: { id: p.id }, data: { categoryId: cA.id } })),
                    ...groupB.map(p => prisma.player.update({ where: { id: p.id }, data: { categoryId: cB.id } })),
                ]

                await prisma.$transaction(updates)
                // Keep the original category (now empty) — it persists as a
                // template so the organiser can merge Group A + Group B back
                // into it later using the Move Division feature.
                // The empty category is hidden from the bracket view automatically.

            }
        }

        // Mark Proposal Completed — also persist which decision was made (only
        // meaningful for UNCONTESTED/CROSS_DIVISION) so detectSmartAlerts can later
        // tell a WALKOVER-pending category apart from a still-unresolved one.
        await prisma.smartProposal.update({
            where: { id: proposalId },
            data: {
                status: 'COMPLETED',
                ...(decision ? { data: JSON.stringify({ ...data, decision }) } : {}),
            }
        })

        revalidatePath(`/organization`)
        revalidatePath(`/tournament/${proposal.tournamentId}`)
        return { success: true }

    } catch (e) {
        console.error("Smart Action Failed", e)
        return { error: 'Execution Failed' }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// MANUAL WINNER DECLARATION
// Lets an organizer/manager/admin declare a bracket winner directly from the
// UI when there's no external scoring system feeding results in. Feeds the
// same GSS/Elo ranking pipeline the scoring API uses.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Declares the winner of a Kyorugi match by slot (avoids any ambiguity from
 * player1/player2 being name snapshots rather than IDs — see lib/gss-ranking.ts).
 */
export async function declareKyorugiWinner(matchId: number, winnerSlot: 'player1' | 'player2') {
    const dbUser = await getAuthUser()
    if (!dbUser) return { success: false, error: 'Unauthorized' }

    const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: { categoryRef: { include: { tournament: { include: { managers: true } } } } }
    })
    if (!match || !match.categoryRef?.tournament) return { success: false, error: 'Match not found' }

    const tournament = match.categoryRef.tournament
    const isOrganizer = tournament.organizerId === dbUser.id
    const isManager = tournament.managers.some(m => m.id === dbUser.id)
    const isAdmin = dbUser.role === 'ADMIN'
    if (!isOrganizer && !isManager && !isAdmin) {
        return { success: false, error: 'Insufficient permissions' }
    }

    if (match.winner) return { success: false, error: 'This match already has a winner' }

    const winnerName = winnerSlot === 'player1' ? match.player1 : match.player2
    if (!winnerName || winnerName === 'BYE' || winnerName === 'TBD') {
        return { success: false, error: 'Cannot declare a winner for this slot' }
    }

    const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: { winner: winnerName }
    })

    if (match.nextMatchId && match.nextMatchSlot) {
        await prisma.match.update({
            where: { id: match.nextMatchId },
            data: match.nextMatchSlot === 'player1' ? { player1: winnerName } : { player2: winnerName }
        })
    }

    const { processMatchResult } = await import('@/lib/gss-ranking')
    processMatchResult(updatedMatch.id).catch(err => {
        console.error(`[GSS] Elo update failed for match ${updatedMatch.id}:`, err)
    })

    revalidatePath(`/tournament/${tournament.id}`)
    return { success: true }
}

/**
 * Declares the winner of a HEAD_TO_HEAD Poomsae pairing by performance number
 * (1 or 2) rather than playerId, so it also works for TEAM/PAIR entries that
 * have no playerId of their own.
 */
export async function declarePoomsaeWinner(categoryRefId: string, pairingMatchId: number, winningPerformanceNumber: 1 | 2) {
    const dbUser = await getAuthUser()
    if (!dbUser) return { success: false, error: 'Unauthorized' }

    const category = await prisma.category.findUnique({
        where: { id: categoryRefId },
        include: { tournament: { include: { managers: true } } }
    })
    if (!category?.tournament) return { success: false, error: 'Category not found' }

    const tournament = category.tournament
    const isOrganizer = tournament.organizerId === dbUser.id
    const isManager = tournament.managers.some(m => m.id === dbUser.id)
    const isAdmin = dbUser.role === 'ADMIN'
    if (!isOrganizer && !isManager && !isAdmin) {
        return { success: false, error: 'Insufficient permissions' }
    }

    const rows = await prisma.poomsaeMatch.findMany({
        where: { categoryRefId, matchId: pairingMatchId }
    })
    const winnerRow = rows.find(r => r.performanceNumber === winningPerformanceNumber)
    const loserRow = rows.find(r => r.performanceNumber !== winningPerformanceNumber)
    if (!winnerRow || !loserRow) return { success: false, error: 'Pairing not found' }

    if (winnerRow.winnerId != null) {
        return { success: false, error: 'This pairing has already been decided' }
    }

    await prisma.poomsaeMatch.updateMany({
        where: { id: { in: [winnerRow.id, loserRow.id] } },
        data: { status: 'Completed' }
    })

    const { resolvePoomsaeHeadToHeadResult } = await import('@/lib/poomsae-progression')
    await resolvePoomsaeHeadToHeadResult(
        { ...winnerRow, status: 'Completed' },
        { ...loserRow, status: 'Completed' }
    )

    revalidatePath(`/tournament/${tournament.id}`)
    return { success: true }
}

export async function checkEmailAvailability(email: string) {
    if (!email) return { available: false }

    const user = await prisma.user.findUnique({
        where: { email }
    })

    // If no user exists, email is available
    if (!user) return { available: true }

    // If user exists but has no clerkId, they were pre-registered by a clubmaster
    // Allow them to sign up — completeOnboarding will link the Clerk account
    if (!user.clerkId) return { available: true }

    // User exists with a Clerk account — email is taken
    return { available: false }
}

export async function getExistingProfile(email: string) {
    if (!email) return null

    const user = await prisma.user.findUnique({
        where: { email },
        select: {
            name: true,
            birthDate: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            clubName: true,
            imageUrl: true,
            athleteNumber: true,
            country: true,
        }
    })

    if (!user) return null

    return {
        name: user.name || null,
        birthDate: user.birthDate ? user.birthDate.toISOString() : null,
        belt: user.belt || null,
        gender: user.gender || null,
        weight: user.weight || null,
        height: user.height || null,
        clubName: user.clubName || null,
        imageUrl: user.imageUrl || null,
        athleteNumber: user.athleteNumber || null,
        country: user.country || null,
    }
}
// --- SEMINAR REGISTRATION ACTION ---

export async function registerForSeminar(formData: FormData) {
    const seminarId = formData.get('seminarId') as string

    if (!seminarId) {
        return { error: 'Seminar ID is required' }
    }

    // 1. Authenticate User
    const dbUser = await getAuthUser()
    if (!dbUser) {
        return { error: 'You must be logged in to register' }
    }

    if (dbUser.role === 'ATHLETE') {
        return { error: 'Athletes can no longer self-register. Please ask your club master to register you.' }
    }

    // 1b. Check club affiliation
    if (dbUser.clubName) {
        const club = await prisma.club.findFirst({ where: { name: dbUser.clubName } })
        if (club) {
            const { checkClubAffiliation } = await import('@/lib/affiliation')
            const affiliationCheck = await checkClubAffiliation(club.id)
            if (!affiliationCheck.isActive) {
                return { error: affiliationCheck.message }
            }
        }
    }

    // 2. Fetch player records for this user
    const userWithPlayers = await prisma.user.findUnique({
        where: { id: dbUser.id },
        include: { players: true }
    })

    // Determine Player ID
    let playerId = userWithPlayers?.players.find((p: any) => p.name === dbUser.name)?.id

    if (!playerId) {
        const club = dbUser.clubName ? await prisma.club.findFirst({ where: { name: dbUser.clubName } }) : null

        const newPlayer = await prisma.player.create({
            data: {
                id: Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'),
                name: dbUser.name || 'Unknown',
                userId: dbUser.id,
                gender: dbUser.gender || 'Male',
                belt: dbUser.belt || 'White',
                clubId: club?.id,
                registrationStatus: 'APPROVED'
            }
        })
        playerId = newPlayer.id
    }

    // 3. Check for Existing Registration
    const existing = await prisma.seminarRegistration.findFirst({
        where: {
            seminarId,
            playerId
        }
    })

    if (existing) {
        return { error: 'You are already registered for this seminar.' }
    }

    // 4. Create Registration Record (PENDING — awaiting clubmaster approval)
    try {
        const registration = await prisma.seminarRegistration.create({
            data: {
                seminarId,
                playerId,
                playerName: toTitleCase(dbUser.name || 'Unknown'),
                clubName: dbUser.clubName,
                belt: dbUser.belt,
                status: 'PENDING'
            }
        })

        revalidatePath(`/seminars/${seminarId}`)
        return { success: true, registrationId: registration.id }
    } catch (error) {
        console.error('Registration failed:', error)
        return { error: 'Failed to create registration record.' }
    }
}

// ============================================
// TOURNAMENT CHECK-IN
// ============================================

export async function tournamentCheckIn(playerId: string, tournamentId: string) {
    try {
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: {
                category: {
                    include: { tournament: { select: { id: true, name: true } } }
                },
                club: { select: { name: true } },
                user: { select: { name: true, email: true } }
            }
        })

        if (!player) {
            return { success: false, error: 'Player not found.', status: 'NOT_FOUND' }
        }

        if (player.category?.tournament?.id !== tournamentId) {
            return { success: false, error: 'Player is not registered for this tournament.', status: 'WRONG_TOURNAMENT' }
        }

        if (player.registrationStatus !== 'APPROVED') {
            return {
                success: false,
                error: 'Registration has not been approved yet.',
                status: 'NOT_APPROVED',
                player: { name: player.name, category: player.category?.name }
            }
        }

        if (player.paymentStatus !== 'PAID') {
            return {
                success: false,
                error: 'Payment has not been completed.',
                status: 'NOT_PAID',
                player: { name: player.name, category: player.category?.name }
            }
        }

        if (player.checkedIn) {
            return {
                success: true,
                alreadyCheckedIn: true,
                status: 'ALREADY_CHECKED_IN',
                player: {
                    id: player.id,
                    name: player.name,
                    category: player.category?.name,
                    club: player.club?.name,
                    checkedInAt: player.checkedInAt
                }
            }
        }

        // Mark as checked in
        await prisma.player.update({
            where: { id: playerId },
            data: { checkedIn: true, checkedInAt: new Date() }
        })

        revalidatePath(`/tournament/${tournamentId}`)

        return {
            success: true,
            status: 'CHECKED_IN',
            player: {
                id: player.id,
                name: player.name,
                category: player.category?.name,
                club: player.club?.name,
                type: player.category?.type,
                checkedInAt: new Date()
            }
        }
    } catch (error) {
        console.error('Tournament check-in error:', error)
        return { success: false, error: 'Check-in failed. Please try again.', status: 'ERROR' }
    }
}

export async function saveWaiverSignature(playerId: string, tournamentId: string) {
    try {
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: { category: { select: { tournamentId: true } } }
        })

        if (!player) return { success: false, error: 'Player not found.' }
        if (player.category?.tournamentId !== tournamentId) return { success: false, error: 'Player not in this tournament.' }

        await prisma.player.update({
            where: { id: playerId },
            data: { waiverSignedAt: new Date() }
        })

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error('Save waiver signature error:', error)
        return { success: false, error: 'Failed to save waiver.' }
    }
}

export async function getTournamentCheckInStats(tournamentId: string) {
    try {
        const [total, checkedIn] = await Promise.all([
            prisma.player.count({
                where: {
                    category: { tournamentId },
                    registrationStatus: 'APPROVED'
                }
            }),
            prisma.player.count({
                where: {
                    category: { tournamentId },
                    registrationStatus: 'APPROVED',
                    checkedIn: true
                }
            })
        ])

        return { total, checkedIn }
    } catch (error) {
        console.error('Failed to get check-in stats:', error)
        return { total: 0, checkedIn: 0 }
    }
}

export async function searchPlayersForCheckIn(tournamentId: string, query: string) {
    try {
        const players = await prisma.player.findMany({
            where: {
                category: { tournamentId },
                registrationStatus: 'APPROVED',
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { id: { contains: query } }
                ]
            },
            include: {
                category: { select: { name: true, type: true } },
                club: { select: { name: true } }
            },
            take: 10
        })

        return players.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category?.name,
            type: p.category?.type,
            club: p.club?.name,
            checkedIn: p.checkedIn,
            checkedInAt: p.checkedInAt,
            paymentStatus: p.paymentStatus
        }))
    } catch (error) {
        console.error('Search for check-in error:', error)
        return []
    }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC MATCH SEARCH ("Find My Match") — unauthenticated, used by
// app/tournament/[id]/matches. Rate-limited since it's public.
// ─────────────────────────────────────────────────────────────

export type PlayerMatchOpponentStatus = 'KNOWN' | 'BYE' | 'TBD' | 'NA'

export interface PlayerMatchSummary {
    matchNum: number | null
    round: number
    roundLabel: string
    isFinal: boolean
    opponentName: string | null
    opponentStatus: PlayerMatchOpponentStatus
    court: string
}

export interface PlayerMatchResult {
    playerId: string
    playerName: string
    clubName: string | null
    categoryId: string
    categoryName: string
    categoryType: string
    poomsaeFormat: string | null
    generated: boolean
    myMatches: PlayerMatchSummary[]
    bracketMatches?: Match[]
    bracketPoomsaeMatches?: (PoomsaeMatch & { player: { name: string; teamId?: string | null; club?: { name: string } | null } | null })[]
}

export type SearchPlayerMatchesResponse =
    | { status: 'rate_limited'; retryAfterSeconds: number }
    | { status: 'ok'; results: PlayerMatchResult[] }

function roundLabelFor(round: number, isFinal: boolean): string {
    if (isFinal) return 'Final'
    if (round === 1) return 'Round 1'
    return `Round ${round}`
}

export async function searchPlayerMatches(tournamentId: string, query: string): Promise<SearchPlayerMatchesResponse> {
    const { headers } = await import('next/headers')
    const { checkRateLimit } = await import('@/lib/rate-limit')
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
    const rateLimit = checkRateLimit(`search-player-matches:${ip}`, 15, 60_000)
    if (!rateLimit.allowed) {
        return { status: 'rate_limited', retryAfterSeconds: rateLimit.retryAfterSeconds }
    }

    const trimmed = query.trim()
    if (trimmed.length < 2) return { status: 'ok', results: [] }

    try {
        const players = await prisma.player.findMany({
            where: {
                category: { tournamentId },
                registrationStatus: 'APPROVED',
                name: { contains: trimmed, mode: 'insensitive' },
            },
            select: {
                id: true,
                name: true,
                clubId: true,
                club: { select: { name: true } },
                categoryId: true,
                category: { select: { id: true, name: true, type: true, poomsaeFormat: true } },
            },
            take: 25,
        })

        if (players.length === 0) return { status: 'ok', results: [] }

        const categoryIds = Array.from(new Set(players.map(p => p.categoryId).filter((id): id is string => !!id)))

        const [matches, poomsaeMatches] = await Promise.all([
            prisma.match.findMany({ where: { categoryRefId: { in: categoryIds } }, orderBy: { round: 'asc' } }),
            prisma.poomsaeMatch.findMany({
                where: { categoryRefId: { in: categoryIds } },
                orderBy: { round: 'asc' },
                include: { player: { include: { club: true } } },
            }),
        ])

        const matchesByCategory = new Map<string, typeof matches>()
        for (const m of matches) {
            if (!m.categoryRefId) continue
            if (!matchesByCategory.has(m.categoryRefId)) matchesByCategory.set(m.categoryRefId, [])
            matchesByCategory.get(m.categoryRefId)!.push(m)
        }
        const poomsaeByCategory = new Map<string, typeof poomsaeMatches>()
        for (const m of poomsaeMatches) {
            if (!m.categoryRefId) continue
            if (!poomsaeByCategory.has(m.categoryRefId)) poomsaeByCategory.set(m.categoryRefId, [])
            poomsaeByCategory.get(m.categoryRefId)!.push(m)
        }

        const results: PlayerMatchResult[] = players.map(player => {
            const category = player.category
            const clubName = player.club?.name || null

            if (!category) {
                return {
                    playerId: player.id, playerName: player.name, clubName,
                    categoryId: '', categoryName: '', categoryType: '', poomsaeFormat: null,
                    generated: false, myMatches: [],
                }
            }

            if (category.type === 'KYORUGI') {
                const catMatches = matchesByCategory.get(category.id) || []
                const generated = catMatches.length > 0
                const maxRound = generated ? Math.max(...catMatches.map(m => m.round)) : 0

                const myMatches: PlayerMatchSummary[] = catMatches
                    .filter(m => m.player1 === player.name || m.player2 === player.name)
                    .map(m => {
                        const isSelf1 = m.player1 === player.name
                        const raw = isSelf1 ? m.player2 : m.player1
                        const opponentStatus: PlayerMatchOpponentStatus = raw === 'BYE' ? 'BYE' : raw === 'TBD' ? 'TBD' : 'KNOWN'
                        const opponentName = opponentStatus === 'KNOWN' ? raw : null
                        const isFinal = m.round === maxRound
                        return {
                            matchNum: m.matchId, round: m.round, roundLabel: roundLabelFor(m.round, isFinal),
                            isFinal, opponentName, opponentStatus, court: m.court,
                        }
                    })

                return {
                    playerId: player.id, playerName: player.name, clubName,
                    categoryId: category.id, categoryName: category.name, categoryType: 'KYORUGI', poomsaeFormat: null,
                    generated, myMatches, bracketMatches: generated ? catMatches : undefined,
                }
            }

            // POOMSAE or KYUKPA
            const catRows = poomsaeByCategory.get(category.id) || []
            const generated = catRows.length > 0
            const isHeadToHead = category.poomsaeFormat === 'HEAD_TO_HEAD'
            const myRows = catRows.filter(r =>
                r.playerId === player.id ||
                (r.memberNames && r.memberNames.split(',').map(n => n.trim()).includes(player.name))
            )
            const maxRound = generated ? Math.max(...catRows.map(m => m.round)) : 0

            const myMatches: PlayerMatchSummary[] = myRows.map(row => {
                let opponentName: string | null = null
                let opponentStatus: PlayerMatchOpponentStatus = 'NA'
                if (isHeadToHead) {
                    const sibling = catRows.find(r => r.matchId === row.matchId && r.id !== row.id)
                    const oppLabel = sibling ? (sibling.player?.name || sibling.displayName || null) : null
                    opponentName = oppLabel
                    opponentStatus = oppLabel ? 'KNOWN' : 'TBD'
                }
                const isFinal = row.round === maxRound
                return {
                    matchNum: row.matchId, round: row.round, roundLabel: roundLabelFor(row.round, isFinal),
                    isFinal, opponentName, opponentStatus, court: row.court,
                }
            })

            return {
                playerId: player.id, playerName: player.name, clubName,
                categoryId: category.id, categoryName: category.name, categoryType: category.type, poomsaeFormat: category.poomsaeFormat,
                generated, myMatches, bracketPoomsaeMatches: generated ? catRows : undefined,
            }
        })

        return { status: 'ok', results }
    } catch (error) {
        console.error('searchPlayerMatches error:', error)
        return { status: 'ok', results: [] }
    }
}

// Player name -> club name for one category — used to add a club line to
// Kyorugi bracket-tree PDFs (BracketPDF), whose Match rows only carry
// player1/player2 as plain name snapshots with no club relation.
export async function getPlayerClubMap(categoryId: string): Promise<Record<string, string>> {
    try {
        const players = await prisma.player.findMany({
            where: { categoryId },
            select: { name: true, club: { select: { name: true } } },
        })
        const map: Record<string, string> = {}
        for (const p of players) {
            if (p.club?.name) map[p.name] = p.club.name
        }
        return map
    } catch (error) {
        console.error('getPlayerClubMap error:', error)
        return {}
    }
}

export async function getCheckedInPlayers(tournamentId: string) {
    try {
        const players = await prisma.player.findMany({
            where: {
                category: { tournamentId },
                checkedIn: true
            },
            include: {
                category: { select: { name: true, type: true } },
                club: { select: { name: true } }
            },
            orderBy: { checkedInAt: 'desc' }
        })

        return players.map(p => ({
            id: p.id,
            name: p.name,
            category: p.category?.name || null,
            type: p.category?.type || null,
            club: p.club?.name || null,
            checkedInAt: p.checkedInAt
        }))
    } catch (error) {
        console.error('Failed to get checked-in players:', error)
        return []
    }
}

// ============================================
// APPROVAL EMAIL HELPERS
// ============================================

async function sendApprovalEmailForPlayer(playerId: string) {
    const player = await prisma.player.findUnique({
        where: { id: playerId },
        include: {
            category: { include: { tournament: { select: { name: true, organizer: { select: { organization: { select: { emailBannerUrl: true } } } } } } } },
            user: { select: { email: true } }
        }
    })

    if (!player || !player.user?.email) return
    // Skip ghost accounts
    if (player.user.email.includes('@member.ktm')) return

    const qrCodeDataUrl = await QRCode.toDataURL(player.id, {
        width: 200,
        margin: 2,
        color: { dark: '#1e1b4b', light: '#ffffff' }
    })

    const emailBannerUrl = (player.category?.tournament as any)?.organizer?.organization?.emailBannerUrl || undefined

    await sendEmail({
        to: player.user.email,
        subject: `Registration Approved — ${player.category?.tournament?.name || 'Tournament'}`,
        reactData: RegistrationApprovedEmail({
            athleteName: player.name,
            eventName: player.category?.tournament?.name || 'Tournament',
            eventType: 'Tournament',
            categoryName: player.category?.name,
            registrationId: player.id,
            qrCodeDataUrl,
            emailBannerUrl
        }) as React.ReactElement
    })
}

export async function resendRegistrationEmail(playerId: string) {
    try {
        await sendApprovalEmailForPlayer(playerId)
        return { success: true }
    } catch (error) {
        console.error('Resend email error:', error)
        return { error: 'Failed to resend email.' }
    }
}

export async function generatePlayerQRCode(playerId: string) {
    try {
        const player = await prisma.player.findUnique({
            where: { id: playerId },
            include: {
                category: {
                    select: { name: true, type: true, tournament: { select: { name: true } } }
                },
                club: { select: { name: true } }
            }
        })

        if (!player) return { error: 'Player not found.' }
        if (player.registrationStatus !== 'APPROVED') return { error: 'Player is not approved.' }

        const qrDataUrl = await QRCode.toDataURL(player.id, {
            width: 300,
            margin: 2,
            color: { dark: '#1e1b4b', light: '#ffffff' }
        })

        return {
            success: true,
            qrDataUrl,
            player: {
                name: player.name,
                category: player.category?.name || null,
                type: player.category?.type || null,
                event: player.category?.tournament?.name || null,
                club: player.club?.name || null,
                id: player.id
            }
        }
    } catch (error) {
        console.error('Generate QR error:', error)
        return { error: 'Failed to generate QR code.' }
    }
}



export async function submitAthleteCardPaymentProof(formData: FormData) {
    const userId = formData.get('userId') as string
    const proofFile = formData.get('proofImage') as File | null

    if (!userId || !proofFile || proofFile.size === 0) {
        return { error: 'Invalid submission data.' }
    }

    const authUser = await getAuthUser()
    if (!authUser || authUser.id !== userId) {
        return { error: 'Unauthorized.' }
    }

    try {
        const bytes = await proofFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const timestamp = Date.now()
        const safeName = proofFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `activations/${userId}-${timestamp}-${safeName}`

        const { error: uploadError } = await supabase.storage
            .from('proof-of-payment')
            .upload(filename, buffer, {
                contentType: proofFile.type,
                upsert: false
            })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('proof-of-payment')
            .getPublicUrl(filename)

        await prisma.user.update({
            where: { id: userId },
            data: {
                cardPaymentProofUrl: publicUrl,
                cardPaymentStatus: 'PENDING_ACTIVATION'
            }
        })

        revalidatePath('/athlete')
        return { success: true }
    } catch (error) {
        console.error('Athlete card payment proof upload error:', error)
        return { error: 'Failed to upload payment proof.' }
    }
}

export async function approveAthleteCardPayment(userId: string) {
    const authUser = await getAuthUser()
    if (!authUser) return { error: 'Unauthorized' }

    // Using existing permission model: Organizers or ADMIN can approve
    // Usually, platform admin or organization owner handles this

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                isVerified: true,
                cardPaymentStatus: 'APPROVED',
                // Also update the createdAt to act as the start date of the 1-year validity
                createdAt: new Date()
            }
        })

        revalidatePath('/organization')
        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Approve athlete card error:', error)
        return { error: 'Failed to approve athlete card.' }
    }
}

export async function rejectAthleteCardPayment(userId: string) {
    const authUser = await getAuthUser()
    if (!authUser) return { error: 'Unauthorized' }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                cardPaymentStatus: 'REJECTED'
            }
        })

        revalidatePath('/organization')
        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error('Reject athlete card error:', error)
        return { error: 'Failed to reject athlete card.' }
    }
}

// ─────────────────────────────────────────────────────────────
// ATHLETE LICENSE — self-registration path. Issued by KTM only; approval
// lives in app/admin/actions.ts (approveAthleteLicense/rejectAthleteLicense).
// The other request path (a club master requesting on an athlete's behalf)
// lives in app/club/actions.ts.
// ─────────────────────────────────────────────────────────────

export async function submitAthleteLicensePaymentProof(formData: FormData) {
    const userId = formData.get('userId') as string
    const proofFile = formData.get('proofImage') as File | null

    if (!userId || !proofFile || proofFile.size === 0) {
        return { error: 'Invalid submission data.' }
    }

    const authUser = await getAuthUser()
    if (!authUser || authUser.id !== userId) {
        return { error: 'Unauthorized.' }
    }

    try {
        const bytes = await proofFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const timestamp = Date.now()
        const safeName = proofFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filename = `license-activations/${userId}-${timestamp}-${safeName}`

        const { error: uploadError } = await supabase.storage
            .from('proof-of-payment')
            .upload(filename, buffer, {
                contentType: proofFile.type,
                upsert: false
            })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
            .from('proof-of-payment')
            .getPublicUrl(filename)

        await prisma.user.update({
            where: { id: userId },
            data: {
                licensePaymentProofUrl: publicUrl,
                licensePaymentStatus: 'PENDING_ACTIVATION',
                licenseRequestedVia: 'SELF',
            }
        })

        revalidatePath('/athlete')
        return { success: true }
    } catch (error) {
        console.error('Athlete license payment proof upload error:', error)
        return { error: 'Failed to upload payment proof.' }
    }
}

// ─────────────────────────────────────────────────────────────
// BRACKET PREVIEW (no DB writes — pure computation for visual
// confirmation before the organiser triggers Generate All)
// ─────────────────────────────────────────────────────────────

export async function previewAllBrackets(tournamentId: string, type: string) {
    const categories = await prisma.category.findMany({
        where:   { tournamentId, type, players: { some: {} } },
        include: {
            players: {
                include: {
                    club: { select: { id: true, name: true, logoUrl: true } },
                    user: { select: { birthDate: true, weight: true, height: true, belt: true } }
                }
            }
        },
        orderBy: [{ gender: 'asc' }, { minAge: 'asc' }, { name: 'asc' }],
    })

    return categories.map(cat => {
        // Determine which bracket engine to use
        let kyorugiSpecs: ReturnType<typeof generateSingleEliminationBracket> = []
        let poomsaeSpecs: ReturnType<typeof generatePoomsaeBracket> = []

        if (cat.type === 'POOMSAE' || cat.type === 'KYUKPA') {
            const orderedPlayers = cat.seedOrder && cat.seedOrder.length > 0
                ? reconcileSeedOrder(cat.seedOrder, cat.players as any)
                : cat.players as any
            poomsaeSpecs = generatePoomsaeBracket(
                orderedPlayers,
                cat.subtype || 'INDIVIDUAL',
                cat.poomsaeForms,
                cat.poomsaeFormat as 'SCORED' | 'HEAD_TO_HEAD'
            )
        } else if (cat.type === 'KYORUGI' && cat.players.length >= 2) {
            const orderedPlayers = cat.seedOrder && cat.seedOrder.length > 0
                ? reconcileSeedOrder(cat.seedOrder, cat.players as any)
                : cat.players as any
            kyorugiSpecs = generateSingleEliminationBracket(orderedPlayers)
        }

        return {
            categoryId:   cat.id,
            categoryName: cat.name,
            gender:       cat.gender,
            skillLevel:   cat.skillLevel,
            type:         cat.type,
            subtype:      cat.subtype,
            poomsaeFormat: cat.poomsaeFormat,
            playerCount:  cat.players.length,
            players: cat.players.map(p => ({
                id:          p.id,
                name:        p.name,
                clubId:      p.clubId,
                clubName:    (p as any).club?.name    || null,
                clubLogoUrl: (p as any).club?.logoUrl || null,
                belt:        (p as any).user?.belt   ?? p.belt   ?? null,
                height:      (p as any).user?.height ?? p.height ?? null,
                weight:      (p as any).user?.weight ?? p.weight ?? null,
                division:    p.division    || null,
                birthDate:   (p as any).user?.birthDate?.toISOString() || null,
            })),
            scheduleDay:      cat.scheduleDay,
            deferFinals:      cat.deferFinals,
            deferFinalsToDay: cat.deferFinalsToDay,
            // Kyorugi / Kyukpa specs (single-elimination bracket)
            specs: kyorugiSpecs.map(s => ({
                id:            s.id,
                round:         s.round,
                player1:       s.player1 ? { id: s.player1.id, name: s.player1.name } : null,
                player2:       s.player2 ? { id: s.player2.id, name: s.player2.name } : null,
                nextMatchId:   s.nextMatchId,
                nextMatchSlot: s.nextMatchSlot,
                isFinal:       s.isFinal,
            })),
            // Poomsae specs (performance slots for SCORED, pairings for HEAD_TO_HEAD)
            poomsaeSpecs: poomsaeSpecs.map(s => ({
                roundGroupIndex:    s.roundGroupIndex,
                round:              s.round,
                performanceNumber:  s.performanceNumber,
                playerId:           s.playerId || null,
                playerName:         s.player?.name || null,
                displayName:        s.displayName || null,
                memberNames:        s.memberNames || null,
                targetRank:         s.targetRank ?? null,
                assignedForms:      s.assignedForms || null,
                nextRoundGroupIndex: s.nextRoundGroupIndex ?? null,
                nextMatchSlot:      s.nextMatchSlot ?? null,
            })),
        }
    })
}

const PREVIEW_CATEGORY_INCLUDE = {
    players: {
        include: {
            club: { select: { id: true, name: true, logoUrl: true } },
            user: { select: { birthDate: true, weight: true, height: true, belt: true } }
        }
    }
} as const

// Shared by previewCategoryBracket (stable — reproduces the last-shown/saved draw)
// and reshuffleCategoryPreview (forced — always a fresh random draw).
//
// `orderedPlayers` here is the SEED-RANK order ("who is seed 1, seed 2, ..."), not
// the resulting bracket-SLOT order — those are two different things, since
// generateSingleEliminationBracket maps seed ranks into bracket slots via a fixed
// seed-position table. Persisting and reusing this seed-rank array directly (as
// BOTH the players list and preOrderedPlayers) is what makes a draw reproduce
// identically next time; deriving it by reverse-engineering the OUTPUT specs
// doesn't work, because the seed-position transform isn't its own inverse.
async function buildCategoryPreview(categoryId: string, forceReshuffle: boolean) {
    const cat = await prisma.category.findUnique({
        where: { id: categoryId },
        include: PREVIEW_CATEGORY_INCLUDE,
    })
    if (!cat) return null

    const hasSavedOrder = !forceReshuffle && !!cat.seedOrder && cat.seedOrder.length > 0
    const orderedPlayers: any[] = hasSavedOrder
        ? reconcileSeedOrder(cat.seedOrder, cat.players as any[])
        : shuffleArray(cat.players as any[])

    // Always persist this exact seed-rank order, so the next load (or "Generate
    // This Category") reproduces this same draw instead of shuffling again.
    await prisma.category.update({ where: { id: categoryId }, data: { seedOrder: orderedPlayers.map((p: any) => p.id) } })

    let kyorugiSpecs: ReturnType<typeof generateSingleEliminationBracket> = []
    let poomsaeSpecs: ReturnType<typeof generatePoomsaeBracket> = []

    if (cat.type === 'POOMSAE' || cat.type === 'KYUKPA') {
        poomsaeSpecs = generatePoomsaeBracket(
            orderedPlayers,
            cat.subtype || 'INDIVIDUAL',
            cat.poomsaeForms,
            cat.poomsaeFormat as 'SCORED' | 'HEAD_TO_HEAD',
            true
        )
    } else if (cat.type === 'KYORUGI' && cat.players.length >= 2) {
        kyorugiSpecs = generateSingleEliminationBracket(orderedPlayers, 1, orderedPlayers)
    } else if (cat.type === 'KYORUGI' && cat.players.length === 1) {
        // Uncontested — a lone player with no opponent. generateSingleEliminationBracket
        // refuses anything under 2 players, so PreviewBracketTree would otherwise render
        // its "Not enough players" placeholder and hide this player's name/club entirely,
        // forcing the organiser to go find them via the Uncontested alerts list instead.
        // Synthesize a single finals-style card (id is local-only — never sent through
        // generateBracketsForCategory, which is separately gated to playerCount >= 2)
        // so the preview surfaces the name/club directly, same as any other category.
        kyorugiSpecs = [{
            id: 0,
            round: 1,
            player1: orderedPlayers[0],
            player2: null,
            nextMatchId: null,
            nextMatchSlot: null,
            isFinal: true,
        }]
    }

    return {
        categoryId:   cat.id,
        categoryName: cat.name,
        type:         cat.type,
        subtype:      cat.subtype,
        poomsaeFormat: cat.poomsaeFormat,
        playerCount:  cat.players.length,
        players: cat.players.map(p => ({
            id:          p.id,
            name:        p.name,
            clubId:      p.clubId,
            clubName:    (p as any).club?.name    || null,
            clubLogoUrl: (p as any).club?.logoUrl || null,
            belt:        (p as any).user?.belt   ?? p.belt   ?? null,
            height:      (p as any).user?.height ?? p.height ?? null,
            weight:      (p as any).user?.weight ?? p.weight ?? null,
            division:    p.division    || null,
            birthDate:   (p as any).user?.birthDate?.toISOString() || null,
        })),
        scheduleDay:      cat.scheduleDay,
        deferFinals:      cat.deferFinals,
        deferFinalsToDay: cat.deferFinalsToDay,
        specs: kyorugiSpecs.map(s => ({
            id:            s.id,
            round:         s.round,
            player1:       s.player1 ? { id: s.player1.id, name: s.player1.name } : null,
            player2:       s.player2 ? { id: s.player2.id, name: s.player2.name } : null,
            nextMatchId:   s.nextMatchId,
            nextMatchSlot: s.nextMatchSlot,
            isFinal:       s.isFinal,
        })),
        poomsaeSpecs: poomsaeSpecs.map(s => ({
            roundGroupIndex:    s.roundGroupIndex,
            round:              s.round,
            performanceNumber:  s.performanceNumber,
            playerId:           s.playerId || null,
            playerName:         s.player?.name || null,
            displayName:        s.displayName || null,
            memberNames:        s.memberNames || null,
            targetRank:         s.targetRank ?? null,
            assignedForms:      s.assignedForms || null,
            nextRoundGroupIndex: s.nextRoundGroupIndex ?? null,
            nextMatchSlot:      s.nextMatchSlot ?? null,
        })),
    }
}

// Stable load — reproduces the last-shown/saved draw (only randomizes + persists
// once, the very first time a category has no saved seedOrder yet).
export async function previewCategoryBracket(categoryId: string) {
    return buildCategoryPreview(categoryId, false)
}

// Forced re-randomization — always a fresh draw, persisted as the new stable one.
export async function reshuffleCategoryPreview(categoryId: string) {
    return buildCategoryPreview(categoryId, true)
}

// ─────────────────────────────────────────────────────────────
// SIMULATE MATCH SEQUENCE
// ─────────────────────────────────────────────────────────────

export async function simulateMatchSequence(
    tournamentId: string,
    type: 'KYORUGI' | 'POOMSAE' | 'KYUKPA',
    seedOrders: Record<string, string[]>
) {
    if (!tournamentId) return { success: false, message: 'Missing tournament ID' }

    const result: Record<string, Record<number, { globalId: number, day: number }>> = {} // categoryId -> { spec.id -> { globalId, day } }

    // Both branches below reuse the exact same ordering functions generateAllBrackets
    // itself uses — this is what guarantees the simulated numbers can never drift
    // from what "Generate All" actually produces (rest-spacing, uncontested-walkover
    // synthesis, and defer-to-day math all included).
    if (type === 'POOMSAE' || type === 'KYUKPA') {
        const { specs: orderedSpecs } = await buildOrderedPoomsaeSpecs(tournamentId, type, seedOrders)
        for (const spec of orderedSpecs) {
            if (!result[spec.categoryId]) result[spec.categoryId] = {}
            // Keyed by roundGroupIndex (the same "shared match record" grouping key
            // generateBracketsForCategory uses): for SCORED, one entry per round
            // (every slot in a round shares one roundGroupIndex); for HEAD_TO_HEAD,
            // one entry per pairing (each pairing has its own roundGroupIndex) —
            // keying by round alone would collapse multiple HEAD_TO_HEAD pairings
            // in the same round down to a single number.
            if (!result[spec.categoryId][spec.roundGroupIndex]) {
                result[spec.categoryId][spec.roundGroupIndex] = { globalId: spec.sharedMatchId, day: spec.specDay }
            }
        }
    } else {
        const orderedSpecs = await buildOrderedKyorugiSpecs(tournamentId, type as 'KYORUGI' | 'KYUKPA', undefined, seedOrders)
        let currentMatchNumber = 1
        orderedSpecs.forEach(spec => {
            if (!result[spec.categoryId]) result[spec.categoryId] = {}
            const isSemiOrFinal = spec.round >= spec.totalRounds - 1
            const specDay = (spec.deferSemisToDay && isSemiOrFinal) ? spec.deferSemisToDay
                : (spec.isFinal && spec.deferFinalsToDay) ? spec.deferFinalsToDay : spec.scheduleDay
            result[spec.categoryId][spec.id] = { globalId: currentMatchNumber++, day: specDay }
        })
    }

    return { success: true, mapping: result }
}

// Flat running-order match list for a not-yet-generated day — the preview
// equivalent of buildDayScheduleRows (which reads real persisted matches).
// Reuses the exact same ordering helpers as generateAllBrackets/
// simulateMatchSequence, so the numbers here are guaranteed to match what
// Generate All will actually assign once run, not just an approximation.
export async function previewDayMatchSchedule(
    tournamentId: string,
    type: 'KYORUGI' | 'POOMSAE' | 'KYUKPA',
    day: number
) {
    const rows: { matchId: number; categoryName: string; round: number; isFinal: boolean; court: string; player1Name: string; player2Name: string }[] = []

    if (type === 'POOMSAE' || type === 'KYUKPA') {
        const { specs: orderedSpecs } = await buildOrderedPoomsaeSpecs(tournamentId, type, undefined)
        const grouped = new Map<number, { names: string[]; round: number; court: string; categoryName: string; day: number }>()
        for (const spec of orderedSpecs) {
            if (spec.specDay !== day) continue
            if (!grouped.has(spec.sharedMatchId)) {
                grouped.set(spec.sharedMatchId, { names: [], round: spec.round, court: spec.court, categoryName: spec.categoryDisplayName, day: spec.specDay })
            }
            const name = spec.player?.name || spec.displayName || ''
            if (name) grouped.get(spec.sharedMatchId)!.names.push(name)
        }
        for (const [mid, g] of grouped) {
            rows.push({
                matchId: mid,
                categoryName: g.categoryName,
                round: g.round,
                // Same simplification the real (generated) match list already uses —
                // Poomsae's scored format always tops out at round 3.
                isFinal: g.round === 3,
                court: g.court,
                player1Name: g.names.join(', '),
                player2Name: '',
            })
        }
    } else {
        const orderedSpecs = await buildOrderedKyorugiSpecs(tournamentId, type as 'KYORUGI' | 'KYUKPA', undefined, undefined)
        let currentMatchNumber = 1
        for (const spec of orderedSpecs) {
            const isSemiOrFinal = spec.round >= spec.totalRounds - 1
            const specDay = (spec.deferSemisToDay && isSemiOrFinal) ? spec.deferSemisToDay
                : (spec.isFinal && spec.deferFinalsToDay) ? spec.deferFinalsToDay : spec.scheduleDay
            const globalId = currentMatchNumber++
            if (specDay !== day) continue
            const isWalkover = !!spec.player1 && !spec.player2
            rows.push({
                matchId: globalId,
                categoryName: spec.categoryName,
                round: spec.round,
                isFinal: spec.isFinal,
                court: spec.court,
                player1Name: spec.player1?.name || 'TBD',
                player2Name: isWalkover ? 'BYE' : (spec.player2?.name || 'TBD'),
            })
        }
    }

    rows.sort((a, b) => a.matchId - b.matchId)
    return rows
}

// ─────────────────────────────────────────────────────────────
// GENERATE ALL FROM PREVIEW (deterministic — uses the exact
// player order from the preview modal instead of reshuffling)
// ─────────────────────────────────────────────────────────────

export async function generateAllBracketsFromPreview(
    tournamentId: string,
    type: 'KYORUGI' | 'POOMSAE' | 'KYUKPA',
    seedOrders: Record<string, string[]> // categoryId → [playerId, playerId, ...]
) {
    if (!tournamentId) return { success: false, message: 'Missing tournament ID' }

    // 1. Fetch categories + players
    const categories = await prisma.category.findMany({
        where: { tournamentId, type },
        include: { players: { include: { club: true } } }
    })
    if (categories.length === 0) return { success: false, message: 'No categories found.' }

    const validCategories = categories.filter(c => c.players.length > 0)
    const allCategoryIds = categories.map(c => c.id)

    // 2. Delete ALL existing matches for this discipline (full renumber from 1)
    if (type === 'POOMSAE' || type === 'KYUKPA') {
        await prisma.poomsaeMatch.deleteMany({ where: { categoryRefId: { in: allCategoryIds } } })
    } else {
        await prisma.match.deleteMany({ where: { categoryRefId: { in: allCategoryIds } } })
    }

    // 3. Get next match ID
    const getNextMatchId = async (tId: string, t: string) => {
        if (t === 'POOMSAE' || t === 'KYUKPA') {
            const max = await prisma.poomsaeMatch.findFirst({
                where: { categoryRef: { tournamentId: tId } },
                orderBy: { matchId: 'desc' }, select: { matchId: true }
            })
            return (max?.matchId || 0) + 1
        }
        const max = await prisma.match.findFirst({
            where: { categoryRef: { tournamentId: tId } },
            orderBy: { matchId: 'desc' }, select: { matchId: true }
        })
        return (max?.matchId || 0) + 1
    }

    // 4. Generate
    if (type === 'POOMSAE' || type === 'KYUKPA') {
        // Always start from 1 for full sequential renumber
        let currentGlobalMatchId = 1
        for (const category of validCategories) {
            // Use seed order from preview if provided, otherwise use category's saved order
            const previewOrder = seedOrders[category.id]
            const resolvedOrder = previewOrder && previewOrder.length > 0
                ? previewOrder
                : (category.seedOrder && category.seedOrder.length > 0 ? category.seedOrder : [])
            const orderedPlayers = resolvedOrder.length > 0
                ? reconcileSeedOrder(resolvedOrder, category.players as any)
                : category.players as any
            const poomsaeSpecs = generatePoomsaeBracket(
                orderedPlayers,
                category.subtype || 'INDIVIDUAL',
                category.poomsaeForms,
                category.poomsaeFormat as 'SCORED' | 'HEAD_TO_HEAD'
            )
            const distinctGroupIndices = Array.from(new Set(poomsaeSpecs.map(s => s.roundGroupIndex))).sort((a, b) => a - b)
            const groupMapping = new Map<number, number>()
            distinctGroupIndices.forEach(idx => { groupMapping.set(idx, currentGlobalMatchId++) })
            const displayName = category.belt && !category.name.toLowerCase().includes(category.belt.toLowerCase())
                ? `${category.name} ${category.belt}` : category.name
            const createPromises = poomsaeSpecs.map(spec => {
                const sharedMatchId = groupMapping.get(spec.roundGroupIndex) || 0
                const nextGroupSharedId = spec.nextRoundGroupIndex !== undefined
                    ? (spec.nextRoundGroupIndex !== null ? groupMapping.get(spec.nextRoundGroupIndex) || null : null)
                    : groupMapping.get(spec.roundGroupIndex + 1) || null
                return prisma.poomsaeMatch.create({
                    data: {
                        categoryRefId: category.id, category: displayName,
                        round: spec.round, matchId: sharedMatchId, nextMatchId: nextGroupSharedId,
                        nextMatchSlot: spec.nextMatchSlot ?? undefined,
                        targetRank: spec.targetRank, performanceNumber: spec.performanceNumber,
                        playerId: spec.playerId || undefined,
                        displayName: spec.displayName || undefined,
                        memberIds: spec.memberIds || undefined,
                        memberNames: spec.memberNames || undefined,
                        assignedForms: spec.assignedForms, status: 'Pending',
                        court: category.court || "Unassigned",
                        scheduledDay: (() => {
                            const pTotalRounds = Math.max(...poomsaeSpecs.map(s => s.round))
                            const isFinal = spec.round === pTotalRounds
                            const isSemiOrFinal = spec.round >= pTotalRounds - 1
                            const catDay = category.scheduleDay ?? 1
                            return (category.deferSemisToDay && isSemiOrFinal) ? category.deferSemisToDay
                                : (isFinal && category.deferFinalsToDay) ? category.deferFinalsToDay : catDay
                        })(),
                    }
                })
            })
            await Promise.all(createPromises)

            // Save seed order from preview into category
            await prisma.category.update({
                where: { id: category.id },
                data: { seedOrder: (orderedPlayers as any[]).map((p: any) => p.id) }
            })
        }
    } else {
        // KYORUGI / KYUKPA — use deterministic seed orders from preview
        // Always start from 1 for full sequential renumber
        let currentMatchNumber = 1

        const skillPriority: Record<string, number> = { 'novice': 1, 'intermediate': 2, 'advance': 3, 'advanced': 3 }

        type SpecWithCategory = ReturnType<typeof generateSingleEliminationBracket>[number] & {
            categoryId: string; categoryName: string; court: string;
            catMinAge: number; catMinWeight: number; catMinHeight: number;
            catSkillPriority: number; deferFinals: boolean;
            scheduleDay: number; deferFinalsToDay: number | null;
            deferSemisToDay: number | null; totalRounds: number;
        }

        const allSpecs: SpecWithCategory[] = []

        for (const category of validCategories) {
            if (category.players.length < 2) continue

            // Build pre-ordered player list: prefer preview order, fall back to saved order
            const previewOrder = seedOrders[category.id]
            const resolvedOrder = previewOrder && previewOrder.length > 0
                ? previewOrder
                : (category.seedOrder && category.seedOrder.length > 0 ? category.seedOrder : [])
            const reconciledPlayers = resolvedOrder.length > 0
                ? reconcileSeedOrder(resolvedOrder, category.players)
                : category.players

            const specs = generateSingleEliminationBracket(category.players, 1, reconciledPlayers)

            const catMinAge = category.minAge ?? 999
            const catMinWeight = category.minWeight ?? 999
            const catMinHeight = category.minHeight ?? 999
            const catSkillPriority = skillPriority[(category.skillLevel || 'novice').toLowerCase()] || 1

            const catTotalRounds = specs.length > 0 ? Math.max(...specs.map(s => s.round)) : 1
            specs.forEach(s => {
                allSpecs.push({
                    ...s, categoryId: category.id, categoryName: category.name,
                    court: category.court || "Unassigned", catMinAge, catMinWeight, catMinHeight,
                    catSkillPriority, deferFinals: category.deferFinals,
                    scheduleDay:      category.scheduleDay      ?? 1,
                    deferFinalsToDay: category.deferFinalsToDay ?? null,
                    deferSemisToDay:  (category as any).deferSemisToDay  ?? null,
                    totalRounds:      catTotalRounds,
                })
            })
        }

        // Sort — day first, then existing logic within each day
        allSpecs.sort((a, b) => {
            const aIsSemiOrFinal = a.round >= a.totalRounds - 1
            const bIsSemiOrFinal = b.round >= b.totalRounds - 1
            const aDay = (a.deferSemisToDay && aIsSemiOrFinal) ? a.deferSemisToDay
                : (a.isFinal && a.deferFinalsToDay) ? a.deferFinalsToDay : a.scheduleDay
            const bDay = (b.deferSemisToDay && bIsSemiOrFinal) ? b.deferSemisToDay
                : (b.isFinal && b.deferFinalsToDay) ? b.deferFinalsToDay : b.scheduleDay
            if (aDay !== bDay) return aDay - bDay

            const aDef = a.isFinal && a.deferFinals && !a.deferFinalsToDay && !a.deferSemisToDay
            const bDef = b.isFinal && b.deferFinals && !b.deferFinalsToDay && !b.deferSemisToDay
            if (aDef && !bDef) return 1
            if (!aDef && bDef) return -1
            const aGroup = !a.deferFinals && !a.deferSemisToDay
            const bGroup = !b.deferFinals && !b.deferSemisToDay
            if (aGroup && bGroup) {
                if (a.catMinAge !== b.catMinAge) return a.catMinAge - b.catMinAge
                if (a.catMinWeight !== b.catMinWeight) return a.catMinWeight - b.catMinWeight
                if (a.catMinHeight !== b.catMinHeight) return a.catMinHeight - b.catMinHeight
                if (a.catSkillPriority !== b.catSkillPriority) return a.catSkillPriority - b.catSkillPriority
                if (a.round !== b.round) return a.round - b.round
                return a.id - b.id
            }
            if (!aGroup && !bGroup) {
                if (a.round !== b.round) return a.round - b.round
                if (a.catMinAge !== b.catMinAge) return a.catMinAge - b.catMinAge
                if (a.catMinWeight !== b.catMinWeight) return a.catMinWeight - b.catMinWeight
                if (a.catMinHeight !== b.catMinHeight) return a.catMinHeight - b.catMinHeight
                if (a.catSkillPriority !== b.catSkillPriority) return a.catSkillPriority - b.catSkillPriority
                return a.id - b.id
            }
            return aGroup ? -1 : 1
        })

        // Insert
        const idLookup = new Map<string, number>()
        for (const spec of allSpecs) {
            const isSemiOrFinal = spec.round >= spec.totalRounds - 1
            const specDay = (spec.deferSemisToDay && isSemiOrFinal) ? spec.deferSemisToDay
                : (spec.isFinal && spec.deferFinalsToDay) ? spec.deferFinalsToDay : spec.scheduleDay
            const createdMatch = await prisma.match.create({
                data: {
                    categoryRefId: spec.categoryId, category: spec.categoryName,
                    round: spec.round, matchId: currentMatchNumber++,
                    player1: spec.player1?.name || "TBD", player2: spec.player2?.name || "TBD",
                    winner: null, nextMatchSlot: spec.nextMatchSlot, court: spec.court,
                    scheduledDay: specDay,
                }
            })
            idLookup.set(`${spec.categoryId}:${spec.id}`, createdMatch.id)
        }

        // Link
        const linkUpdates = []
        for (const spec of allSpecs) {
            if (spec.nextMatchId !== null) {
                const actualId = idLookup.get(`${spec.categoryId}:${spec.id}`)
                const actualNextId = idLookup.get(`${spec.categoryId}:${spec.nextMatchId}`)
                if (actualId && actualNextId) {
                    linkUpdates.push(prisma.match.update({ where: { id: actualId }, data: { nextMatchId: actualNextId } }))
                }
            }
        }
        await Promise.all(linkUpdates)
        await prisma.tournament.update({ where: { id: tournamentId }, data: { match_count: currentMatchNumber - 1 } })

        // Save seed orders back to each category
        await Promise.all(validCategories
            .filter(c => c.players.length >= 2)
            .map(c => {
                const previewOrder = seedOrders[c.id]
                const resolvedOrder = previewOrder && previewOrder.length > 0
                    ? previewOrder
                    : (c.seedOrder && c.seedOrder.length > 0 ? c.seedOrder : [])
                const reconciledPlayers = resolvedOrder.length > 0
                    ? reconcileSeedOrder(resolvedOrder, c.players)
                    : c.players
                return prisma.category.update({
                    where: { id: c.id },
                    data: { seedOrder: reconciledPlayers.map(p => p.id) }
                })
            })
        )
    }

    revalidatePath(`/tournament/${tournamentId}`)
    return { success: true, count: validCategories.length }
}

