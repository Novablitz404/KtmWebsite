'use server'

import { revalidatePath } from 'next/cache'
import { findCategoryForPlayer } from '@/lib/placement'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getClubEventsData } from '@/app/club/data'
import { generatePoomsaeBracket } from '@/lib/poomsae-logic'
import { BracketMatchSpec, generateSingleEliminationBracket } from '@/lib/bracket-logic'
import { deriveSkillLevel, extractBeltFromCategoryName } from '@/lib/skill-logic'
import { toTitleCase } from '@/lib/utils'
import { encrypt } from '@/lib/encryption'
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

    // Xendit Payment Integration
    const xenditEnabled = formData.get('xenditEnabled') === 'true'
    const xenditSecretKeyRaw = formData.get('xenditSecretKey') as string | null
    const xenditSecretKey = xenditEnabled && xenditSecretKeyRaw ? encrypt(xenditSecretKeyRaw) : null
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
            xenditEnabled,
            xenditSecretKey,
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
                }[] = []

                for (const division of template.divisions) {
                    for (const weightCat of division.categories) {
                        const genderLabel = weightCat.gender === 'Both' ? '' : weightCat.gender

                        if (weightCat.type === 'POOMSAE') {
                            // POOMSAE: Create single category (No Skill Level Split)
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
                                skillLevel: null // No skill level for Poomsae
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
                                skillLevel: 'Novice'
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
                                skillLevel: 'Intermediate'
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
                                skillLevel: 'Advance'
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




export async function generateAllBrackets(tournamentId: string, type: 'KYORUGI' | 'POOMSAE' | 'KYUKPA') {
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
        if (type === 'POOMSAE') {
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

    // 3. Delete Existing Matches (Bulk)
    const validCategoryIds = validCategories.map(c => c.id)
    if (type === 'POOMSAE') {
        await prisma.poomsaeMatch.deleteMany({
            where: { categoryRefId: { in: validCategoryIds } }
        })

        // REMOVED: Global sequence reset (unsafe for multi-tenant and unnecessary)
    } else {
        await prisma.match.deleteMany({
            where: { categoryRefId: { in: validCategoryIds } }
        })
        // REMOVED: Global sequence reset (unsafe for multi-tenant)
    }

    // 4. In-Memory Generation & Parallel DB Writes
    // We'll collect all creation operations and run them transactionally or in parallel batches

    if (type === 'POOMSAE') {
        // --- POOMSAE GENERATION ---

        // We need to execute sequentially or manage the shared ID counter carefully
        // Since we are inside one action, we can just increment the local variable `currentGlobalMatchId`

        // --- POOMSAE GENERATION ---

        // Get dynamic start ID
        let currentGlobalMatchId = await getNextMatchId(tournamentId, 'POOMSAE')

        for (const category of validCategories) {
            const players = await prisma.player.findMany({
                where: { categoryId: category.id },
                include: { club: true }
            })
            const poomsaeSpecs = generatePoomsaeBracket(
                players,
                category.subtype || 'INDIVIDUAL',
                category.poomsaeForms
            )

            // Map roundGroupIndex -> Global Match ID
            // Sort indices to ensure sequential ID assignment
            const distinctGroupIndices = Array.from(new Set(poomsaeSpecs.map(s => s.roundGroupIndex))).sort((a, b) => a - b)
            const groupMapping = new Map<number, number>()

            distinctGroupIndices.forEach((idx) => {
                groupMapping.set(idx, currentGlobalMatchId++)
            })

            // Construct full category name
            const displayName = category.belt && !category.name.toLowerCase().includes(category.belt.toLowerCase())
                ? `${category.name} ${category.belt}`
                : category.name;

            const createPromises = poomsaeSpecs.map(spec => {
                const sharedMatchId = groupMapping.get(spec.roundGroupIndex) || 0
                const nextGroupSharedId = groupMapping.get(spec.roundGroupIndex + 1) || null

                return prisma.poomsaeMatch.create({
                    data: {
                        categoryRefId: category.id,
                        category: displayName,
                        round: spec.round,
                        matchId: sharedMatchId,
                        nextMatchId: nextGroupSharedId,
                        targetRank: spec.targetRank,
                        performanceNumber: spec.performanceNumber,
                        playerId: spec.playerId || undefined,
                        displayName: spec.displayName || undefined,
                        memberIds: spec.memberIds || undefined,
                        memberNames: spec.memberNames || undefined,
                        assignedForms: spec.assignedForms,
                        status: 'Pending',
                        court: category.court || "Unassigned"
                    }
                })
            })

            await Promise.all(createPromises)
        }

    } else {
        // --- KYORUGI & KYUKPA GENERATION (interleaved by round, finals last) ---

        // --- KYORUGI & KYUKPA GENERATION (interleaved by round, finals last) ---

        // Get dynamic start ID
        let currentMatchNumber = await getNextMatchId(tournamentId, 'KYORUGI')

        // Skill level priority (lower = plays first)
        const skillPriority: Record<string, number> = {
            'novice': 1,
            'intermediate': 2,
            'advance': 3,
            'advanced': 3,
        };

        type SpecWithCategory = ReturnType<typeof generateSingleEliminationBracket>[number] & {
            categoryId: string;
            categoryName: string;
            court: string;
            catMinAge: number;
            catMinWeight: number;
            catMinHeight: number;
            catSkillPriority: number;
            deferFinals: boolean;
        };

        const allSpecs: SpecWithCategory[] = [];

        // Step 1: Generate brackets for all categories and collect specs
        for (const category of validCategories) {
            if (category.players.length < 2) continue;

            const specs = generateSingleEliminationBracket(category.players);
            const catMinAge = category.minAge ?? 999;
            const catMinWeight = category.minWeight ?? 999;
            const catMinHeight = category.minHeight ?? 999;
            const catSkillPriority = skillPriority[(category.skillLevel || 'novice').toLowerCase()] || 1;

            specs.forEach(s => {
                allSpecs.push({
                    ...s,
                    categoryId: category.id,
                    categoryName: category.name,
                    court: category.court || "Unassigned",
                    catMinAge,
                    catMinWeight,
                    catMinHeight,
                    catSkillPriority,
                    deferFinals: category.deferFinals,
                });
            });
        }

        // Step 2: Sort globally
        allSpecs.sort((a, b) => {
            // Deferred finals go to the very end
            const aDef = a.isFinal && a.deferFinals;
            const bDef = b.isFinal && b.deferFinals;
            if (aDef && !bDef) return 1;
            if (!aDef && bDef) return -1;

            // For non-deferred categories: group ALL their matches together by category
            // For deferred categories (non-final matches): interleave by round globally
            const aGroupByCategory = !a.deferFinals;
            const bGroupByCategory = !b.deferFinals;

            if (aGroupByCategory && bGroupByCategory) {
                // Both non-deferred: group by division → weight → skill → round
                if (a.catMinAge !== b.catMinAge) return a.catMinAge - b.catMinAge;
                if (a.catMinWeight !== b.catMinWeight) return a.catMinWeight - b.catMinWeight;
                if (a.catMinHeight !== b.catMinHeight) return a.catMinHeight - b.catMinHeight;
                if (a.catSkillPriority !== b.catSkillPriority) return a.catSkillPriority - b.catSkillPriority;
                // Within same category: sort by round (R1 → SF → Final)
                if (a.round !== b.round) return a.round - b.round;
                return a.id - b.id;
            }

            if (!aGroupByCategory && !bGroupByCategory) {
                // Both deferred (non-final matches): interleave by round globally
                if (a.round !== b.round) return a.round - b.round;
                // Tie-breakers within same round
                if (a.catMinAge !== b.catMinAge) return a.catMinAge - b.catMinAge;
                if (a.catMinWeight !== b.catMinWeight) return a.catMinWeight - b.catMinWeight;
                if (a.catMinHeight !== b.catMinHeight) return a.catMinHeight - b.catMinHeight;
                if (a.catSkillPriority !== b.catSkillPriority) return a.catSkillPriority - b.catSkillPriority;
                return a.id - b.id;
            }

            // Non-deferred categories play first (they finish early), then deferred categories
            return aGroupByCategory ? -1 : 1;
        });

        // Step 3: Insert matches (Pass 1)
        // Build a per-category ID mapping: (categoryId:tempId) → dbId
        const idLookup = new Map<string, number>();

        for (const spec of allSpecs) {
            const createdMatch = await prisma.match.create({
                data: {
                    categoryRefId: spec.categoryId,
                    category: spec.categoryName,
                    round: spec.round,
                    matchId: currentMatchNumber++, // Assign sequential Display ID
                    player1: spec.player1?.name || "TBD",
                    player2: spec.player2?.name || "TBD",
                    winner: null,
                    nextMatchSlot: spec.nextMatchSlot,
                    court: spec.court
                }
            });
            idLookup.set(`${spec.categoryId}:${spec.id}`, createdMatch.id);
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
            data: { match_count: currentMatchNumber - 1 } // Note: using current matchId is robust
        })
    }

    revalidatePath(`/tournament/${tournamentId}`)
    return { success: true, count: validCategories.length }
}

export async function generateBracketsForCategory(categoryId: string, court?: string) {
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

    // POOMSAE LOGIC
    if (category.type === 'POOMSAE') {
        if (players.length < 1) return

        await prisma.poomsaeMatch.deleteMany({
            where: { categoryRefId: categoryId }
        })

        // REMOVED: Global sequence reset (unsafe for multi-tenant and unnecessary)

        const poomsaeSpecs = generatePoomsaeBracket(
            players,
            category.subtype || 'INDIVIDUAL',
            category.poomsaeForms
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
            const nextGroupSharedId = groupMapping.get(spec.roundGroupIndex + 1) || null

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
                    targetRank: spec.targetRank,
                    performanceNumber: spec.performanceNumber,
                    playerId: spec.playerId || undefined,
                    displayName: spec.displayName || undefined,
                    memberIds: spec.memberIds || undefined,
                    memberNames: spec.memberNames || undefined,
                    assignedForms: spec.assignedForms,
                    status: 'Pending',
                    court: category.court || "Unassigned"
                }
            })
        }

        // Update tournament match_count
        await prisma.tournament.update({
            where: { id: category.tournamentId },
            data: { match_count: startMatchNum + distinctGroupIndices.length - 1 }
        })

        revalidatePath(`/tournament/${category.tournamentId}`)
        return
    }

    // KYORUGI LOGIC (Default)
    if (players.length < 2) return

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

    const bracketSpecs = generateSingleEliminationBracket(players)
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
            ...(orgId && { organizationMemberId: orgId }),
        }
    })

    // Role is stored in DB — no Clerk metadata sync needed
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

    // Parse birth date
    const birthDate = birthDateStr ? new Date(birthDateStr) : null

    // Update Prisma User
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            name,
            clubName,
            belt,
            gender,
            weight: isNaN(weight) ? null : weight,
            height: isNaN(height) ? null : height,
            birthDate
        }
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
                name,
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
            // Check if the tournament has Xendit enabled
            const playerRecord = await prisma.player.findUnique({
                where: { id: player.id },
                include: { category: { include: { tournament: { select: { xenditEnabled: true } } } } }
            })

            const xenditEnabled = playerRecord?.category?.tournament?.xenditEnabled || false

            await prisma.player.update({
                where: { id: player.id },
                data: {
                    skillLevel: player.skillLevel,
                    registrationStatus: 'APPROVED',
                    // Auto-set payment to PAID for manual (non-Xendit) events
                    ...(!xenditEnabled && { paymentStatus: 'PAID' }),
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

interface RegisterAutoInput {
    tournamentId: string
    userId: string
    name: string
    gender: string
    belt: string
    weight: number
    clubName: string
    division: string
    categoryName: string
}

export async function registerForTournamentAuto(input: RegisterAutoInput) {
    const { tournamentId, userId, name, gender, belt, weight, clubName, division, categoryName } = input

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

    // Backend Date Enforcement
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { registrationStart: true, registrationEnd: true }
    })

    if (!tournament) return { error: 'Tournament not found' }

    const now = new Date()
    if (tournament.registrationStart && now < tournament.registrationStart) {
        return { error: 'Registration has not started yet' }
    }
    if (tournament.registrationEnd && now > tournament.registrationEnd) {
        return { error: 'Registration is closed' }
    }

    // Find or create the category for this tournament
    let category = await prisma.category.findFirst({
        where: {
            tournamentId,
            name: categoryName
        }
    })

    if (!category) {
        // Determine type
        const type = categoryName.toLowerCase().includes('poomsae') ? 'POOMSAE' : 'KYORUGI'

        category = await prisma.category.create({
            data: {
                name: categoryName,
                tournamentId,
                type: type
            }
        })
    }

    // Find the user's club
    let club = null
    if (clubName) {
        const normalizedClubName = clubName.trim()
        club = await prisma.club.findFirst({
            where: { name: normalizedClubName }
        })
        if (!club) {
            console.log(`Club not found for name: "${normalizedClubName}"`)
        }

        // Check club affiliation
        if (club) {
            const { checkClubAffiliation } = await import('@/lib/affiliation')
            const affiliationCheck = await checkClubAffiliation(club.id)
            if (!affiliationCheck.isActive) {
                return { error: affiliationCheck.message }
            }
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
                division,
                categoryId: category.id,
                userId,
                clubId: club?.id || null,
                registrationStatus: 'PENDING',
                skillLevel: deriveSkillLevel(belt)
            }
        })

        revalidatePath('/club')
        revalidatePath('/tournaments')
        return { success: true, playerId }
    } catch (error) {
        console.error('Registration error:', error)
        return { error: 'Failed to register. Please try again.' }
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
                if (weightCat.type === 'POOMSAE') {
                    // POOMSAE: Create single category (No Skill Level Split)
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
                        belt: belt
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
                        skillLevel: 'Novice'
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
                        skillLevel: 'Intermediate'
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
                        skillLevel: 'Advance'
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

export async function updateCategory(categoryId: string, tournamentId: string, data: { name?: string; type?: string; court?: string; skillLevel?: string }) {
    try {
        await prisma.category.update({
            where: { id: categoryId },
            data: {
                name: data.name,
                type: data.type,
                court: data.court || null,
                skillLevel: data.skillLevel
            }
        })
        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error('Update Category Error:', error)
        return { error: 'Failed to update category' }
    }
}

export async function createCategory(tournamentId: string, name: string, type: string = 'KYORUGI', court: string = '', skillLevel: string = 'Novice') {
    try {
        await prisma.category.create({
            data: {
                tournamentId,
                name,
                type,
                court: court || null,
                skillLevel
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
// MASTERLIST AUDIT
// ─────────────────────────────────────────────────────────────────────────────

export type AuditIssue = {
    playerId: string
    playerName: string
    categoryName: string
    categoryType: string
    severity: 'error' | 'warning'
    code: string
    message: string
    // Auto-fix fields
    fixable?: boolean
    suggestedCategoryId?: string
    suggestedCategoryName?: string
}

// Codes the placement engine can fix by reassigning to a correct category
const FIXABLE_CODES = new Set([
    'AGE_TOO_OLD', 'AGE_TOO_YOUNG',
    'WEIGHT_TOO_HIGH', 'WEIGHT_TOO_LOW',
    'HEIGHT_TOO_HIGH', 'HEIGHT_TOO_LOW',
    'WRONG_CATEGORY',
    'BELT_MISMATCH', // Poomsae only — resolved by placing on correct belt-based category
])

export async function auditTournamentMasterlist(tournamentId: string): Promise<AuditIssue[]> {
    const { calculateAge, findCategoryForPlayer } = await import('@/lib/placement')
    const { deriveSkillLevel } = await import('@/lib/skill-logic')

    // Fetch all players with their User profile (source of truth) and assigned category
    const players = await prisma.player.findMany({
        where: { category: { tournamentId } },
        include: {
            category: true,
            user: {
                select: {
                    id: true, name: true, birthDate: true, gender: true,
                    weight: true, height: true, belt: true
                }
            }
        }
    })

    const issues: AuditIssue[] = []

    for (const player of players) {
        const cat = player.category
        if (!cat) continue

        const ctx = {
            playerId: player.id,
            playerName: player.name,
            categoryName: cat.name,
            categoryType: cat.type,
        }

        // ══════════════════════════════════════════════════════════════════════
        // DATA RESOLUTION: User profile (source of truth) → Player record (fallback)
        // Some players have userId = null (guest registrations, orphaned records)
        // In that case, we use whatever data is on the Player record itself.
        // ══════════════════════════════════════════════════════════════════════
        const user = player.user
        const birthDate = user?.birthDate ?? null
        const gender = user?.gender ?? player.gender ?? null
        const weight = user?.weight ?? player.weight ?? 0
        const height = user?.height ?? player.height ?? 0
        const belt = user?.belt ?? player.belt ?? null
        const skillLevel = belt ? deriveSkillLevel(belt) : null

        // Determine which metric matters from the category's own fields
        // Height-based categories: minHeight/maxHeight > 0 (Supertoddler/Toddler/Grade School)
        // Weight-based categories: minWeight/maxWeight > 0 (Cadet/Junior/Senior)
        const usesHeight = (cat.minHeight != null && cat.minHeight > 0) || (cat.maxHeight != null && cat.maxHeight > 0)
        const usesWeight = (cat.minWeight != null && cat.minWeight > 0) || (cat.maxWeight != null && cat.maxWeight > 0)

        // ────────────────────────────────────────────────────────────────────
        // PROFILE DATA COMPLETENESS CHECKS
        // ────────────────────────────────────────────────────────────────────

        // 1. No birthday
        if (!birthDate) {
            issues.push({ ...ctx, severity: 'error', code: 'NO_BIRTHDAY',
                message: 'No birthday on file — age division cannot be verified.' })
        }

        // 2. Invalid birthday (future date / impossibly old)
        const age = birthDate ? calculateAge(birthDate) : null
        const validAge = age !== null && age > 0 && age <= 100

        if (age !== null && !validAge) {
            issues.push({ ...ctx, severity: 'error', code: 'INVALID_BIRTHDAY',
                message: `Birthday ${birthDate!.toISOString().slice(0, 10)} is invalid (calculated age: ${age}). Likely a future date or typo.` })
        }

        // 3. No gender
        if (!gender) {
            issues.push({ ...ctx, severity: 'error', code: 'NO_GENDER',
                message: 'No gender on file — cannot verify category eligibility.' })
        }

        // 4. No weight — ONLY for weight-based categories (Cadet/Junior/Senior, age 12+)
        if (cat.type === 'KYORUGI' && usesWeight && weight <= 0) {
            issues.push({ ...ctx, severity: 'error', code: 'NO_WEIGHT',
                message: 'No weight on file — required for this weight-based division.' })
        }

        // 5. No height — ONLY for height-based categories (Supertoddler/Toddler/Grade School, age ≤11)
        if (cat.type === 'KYORUGI' && usesHeight && height <= 0) {
            issues.push({ ...ctx, severity: 'error', code: 'NO_HEIGHT',
                message: 'No height on file — required for this height-based division.' })
        }

        // ────────────────────────────────────────────────────────────────────
        // CATEGORY RULE CHECKS (mirrors placement.ts logic exactly)
        // ────────────────────────────────────────────────────────────────────

        // 6. Age out of range
        if (validAge) {
            if (cat.minAge && age! < cat.minAge) {
                issues.push({ ...ctx, severity: 'error', code: 'AGE_TOO_YOUNG',
                    message: `Age ${age} is below the category minimum of ${cat.minAge}.` })
            }
            if (cat.maxAge && age! > cat.maxAge) {
                issues.push({ ...ctx, severity: 'error', code: 'AGE_TOO_OLD',
                    message: `Age ${age} exceeds the category maximum of ${cat.maxAge}.` })
            }
        }

        // 7. Gender mismatch
        if (gender && cat.gender && cat.gender !== 'Both' && cat.gender !== 'Mixed' && cat.gender !== gender) {
            issues.push({ ...ctx, severity: 'error', code: 'GENDER_MISMATCH',
                message: `Player gender (${gender}) does not match the category gender (${cat.gender}).` })
        }

        // 8. Weight out of range — ONLY for weight-based categories
        if (cat.type === 'KYORUGI' && usesWeight && weight > 0) {
            if (cat.minWeight && weight < cat.minWeight) {
                issues.push({ ...ctx, severity: 'error', code: 'WEIGHT_TOO_LOW',
                    message: `Weight ${weight}kg is below the category minimum of ${cat.minWeight}kg.` })
            }
            if (cat.maxWeight && weight >= cat.maxWeight) {
                issues.push({ ...ctx, severity: 'error', code: 'WEIGHT_TOO_HIGH',
                    message: `Weight ${weight}kg meets or exceeds the category limit of ${cat.maxWeight}kg.` })
            }
        }

        // 9. Height out of range — ONLY for height-based categories
        if (cat.type === 'KYORUGI' && usesHeight && height > 0) {
            if (cat.minHeight && height < cat.minHeight) {
                issues.push({ ...ctx, severity: 'error', code: 'HEIGHT_TOO_LOW',
                    message: `Height ${height}cm is below the category minimum of ${cat.minHeight}cm.` })
            }
            if (cat.maxHeight && height > cat.maxHeight) {
                issues.push({ ...ctx, severity: 'error', code: 'HEIGHT_TOO_HIGH',
                    message: `Height ${height}cm exceeds the category maximum of ${cat.maxHeight}cm.` })
            }
        }

        // 10. Belt mismatch (POOMSAE / KYUKPA categories with strict belt rule)
        if (cat.belt && belt && cat.belt !== belt) {
            issues.push({ ...ctx, severity: 'warning', code: 'BELT_MISMATCH',
                message: `Player belt (${belt}) does not match the category's required belt (${cat.belt}).` })
        }



        // ────────────────────────────────────────────────────────────────────
        // 12. WRONG CATEGORY — re-run placement to see where they SHOULD be
        // Skip if the player already has a specific metric error (weight/height/age)
        // that will be enriched with the same fix suggestion — no need to duplicate.
        // ────────────────────────────────────────────────────────────────────
        const METRIC_CODES = new Set([
            'WEIGHT_TOO_HIGH', 'WEIGHT_TOO_LOW',
            'HEIGHT_TOO_HIGH', 'HEIGHT_TOO_LOW',
            'AGE_TOO_OLD', 'AGE_TOO_YOUNG',
        ])
        const alreadyHasMetricError = issues.some(
            i => i.playerId === player.id && METRIC_CODES.has(i.code)
        )

        if (!alreadyHasMetricError && validAge && birthDate && gender && cat.type === 'KYORUGI') {
            try {
                const correctCategory = await findCategoryForPlayer(tournamentId, {
                    birthDate,
                    gender,
                    weight,
                    height: height > 0 ? height : undefined,
                    belt: belt ?? undefined,
                    type: cat.type,
                    skillLevel: skillLevel ?? undefined
                })

                if (correctCategory && correctCategory.id !== cat.id) {
                    issues.push({ ...ctx, severity: 'error', code: 'WRONG_CATEGORY',
                        message: `Should be in "${correctCategory.name}" based on current profile data.`,
                        fixable: !player.manualOverride,
                        suggestedCategoryId: correctCategory.id,
                        suggestedCategoryName: correctCategory.name,
                    })
                }
            } catch {
                // Placement engine failed — skip this check
            }
        }
    }

    // ── Enrich fixable errors with placement suggestions ──────────────────────
    // For issues not covered by WRONG_CATEGORY (age/weight/height range violations),
    // run the placement engine and attach a suggestion if a valid target is found.
    const NEEDS_PLACEMENT_LOOKUP = new Set([
        'AGE_TOO_OLD', 'AGE_TOO_YOUNG',
        'WEIGHT_TOO_HIGH', 'WEIGHT_TOO_LOW',
        'HEIGHT_TOO_HIGH', 'HEIGHT_TOO_LOW',
    ])

    // Build a per-player map so we only call placement once per player
    const playerMap = new Map(players.map(p => [p.id, p]))
    const processedPlayers = new Set<string>()

    for (const issue of issues) {
        if (!NEEDS_PLACEMENT_LOOKUP.has(issue.code)) continue
        if (processedPlayers.has(issue.playerId)) continue
        processedPlayers.add(issue.playerId)

        const player = playerMap.get(issue.playerId)
        if (!player || player.manualOverride) continue

        const user = player.user
        const birthDate = user?.birthDate ?? null
        const gender = user?.gender ?? player.gender ?? null
        const weight = user?.weight ?? player.weight ?? 0
        const height = user?.height ?? player.height ?? 0
        const belt = user?.belt ?? player.belt ?? null
        const skillLevel = belt ? deriveSkillLevel(belt) : undefined
        const cat = player.category

        // Skip if missing essential data or height looks like bad entry (< 50cm)
        if (!birthDate || !gender || !cat) continue
        if (cat.type === 'KYORUGI' && height > 0 && height < 50) continue

        try {
            const suggestion = await findCategoryForPlayer(tournamentId, {
                birthDate,
                gender,
                weight,
                height: height > 0 ? height : undefined,
                belt: belt ?? undefined,
                type: cat.type,
                skillLevel: skillLevel ?? undefined,
            })

            if (suggestion && suggestion.id !== cat.id) {
                // Attach the suggestion to ALL issues for this player with a fixable code
                for (const iss of issues) {
                    if (iss.playerId === issue.playerId && NEEDS_PLACEMENT_LOOKUP.has(iss.code)) {
                        iss.fixable = true
                        iss.suggestedCategoryId = suggestion.id
                        iss.suggestedCategoryName = suggestion.name
                    }
                }
            }
        } catch {
            // placement engine failed — leave as not fixable
        }
    }

    // ── Enrich POOMSAE BELT_MISMATCH with placement suggestions ──────────────
    // For Poomsae athletes whose belt doesn't match their category's required belt,
    // run the placement engine with their actual belt to find the correct category.
    // Kyukpa is intentionally excluded from this fix.
    const processedPoomsaePlayers = new Set<string>()

    for (const issue of issues) {
        if (issue.code !== 'BELT_MISMATCH') continue

        const player = playerMap.get(issue.playerId)
        if (!player || player.manualOverride) continue
        if (player.category?.type !== 'POOMSAE') continue
        if (processedPoomsaePlayers.has(issue.playerId)) continue
        processedPoomsaePlayers.add(issue.playerId)

        const user = player.user
        const birthDate = user?.birthDate ?? null
        const gender = user?.gender ?? player.gender ?? null
        const belt = user?.belt ?? player.belt ?? null
        const cat = player.category

        if (!birthDate || !gender || !belt || !cat) continue

        try {
            const suggestion = await findCategoryForPlayer(tournamentId, {
                birthDate,
                gender,
                belt,
                weight: 0, // weight is irrelevant for Poomsae placement
                type: 'POOMSAE',
                poomsaeType: cat.subtype ?? 'INDIVIDUAL',
            })

            if (suggestion && suggestion.id !== cat.id) {
                for (const iss of issues) {
                    if (iss.playerId === issue.playerId && iss.code === 'BELT_MISMATCH') {
                        iss.fixable = true
                        iss.suggestedCategoryId = suggestion.id
                        iss.suggestedCategoryName = suggestion.name
                    }
                }
            }
        } catch {
            // placement engine failed — leave as not fixable
        }
    }

    return issues
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX AUDIT ISSUES — bulk-reassign players to their correct categories
// ─────────────────────────────────────────────────────────────────────────────
export type FixResult = {
    fixed: number
    skipped: number
    details: Array<{ playerName: string; from: string; to: string }>
}

export async function fixAuditIssues(
    tournamentId: string,
    fixes: Array<{ playerId: string; suggestedCategoryId: string; suggestedCategoryName: string; currentCategoryName: string; playerName: string }>
): Promise<FixResult> {
    const dbUser = await getAuthUser()
    if (!dbUser) throw new Error('Not authenticated')

    const result: FixResult = { fixed: 0, skipped: 0, details: [] }

    for (const fix of fixes) {
        // Verify the player exists and doesn't have manualOverride
        const player = await prisma.player.findUnique({
            where: { id: fix.playerId },
            select: { id: true, manualOverride: true, categoryId: true }
        })

        if (!player) { result.skipped++; continue }
        if (player.manualOverride) { result.skipped++; continue }
        // Already in the right category (race condition guard)
        if (player.categoryId === fix.suggestedCategoryId) { result.skipped++; continue }

        await prisma.player.update({
            where: { id: fix.playerId },
            data: { categoryId: fix.suggestedCategoryId }
        })

        result.fixed++
        result.details.push({
            playerName: fix.playerName,
            from: fix.currentCategoryName,
            to: fix.suggestedCategoryName,
        })
    }

    revalidatePath(`/tournament/${tournamentId}`)
    return result
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

export async function findPlayerCategory(
    tournamentId: string,
    playerData: {
        birthDate: Date | string,
        gender: string,
        weight: number,
        height?: number,
        belt?: string,
        poomsaeType?: string
        type?: string
    }
) {
    // Ensure dates are Date objects
    const profile = {
        ...playerData,
        birthDate: new Date(playerData.birthDate),
        skillLevel: deriveSkillLevel(playerData.belt || null)
    }

    const category = await findCategoryForPlayer(tournamentId, profile)
    return category
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

    const baseWhere: any = { clubName: clubName, role: { in: ['ATHLETE', 'ASSISTANT_CLUB_MASTER'] } }

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
            paymentMethod: org.affiliationPaymentMethod || 'manual',
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
        organizationId = tenant.id
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
            // Tournaments don't have organizationId — they're already scoped
            // by participatingClubs (only shows events the club was invited to)
            prisma.tournament.findMany({
                where: {
                    participatingClubs: { some: { clubId } },
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
                    participatingClubs: { some: { clubId } },
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
                    participatingClubs: { some: { clubId } },
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
        athleteCardPaymentMethods
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

export async function fetchAvailableEvents(clubId: string) {
    try {
        // Get club's organization hierarchy
        const club = await prisma.club.findUnique({
            where: { id: clubId },
            include: {
                organization: {
                    select: {
                        id: true,
                        parentOrganizationId: true
                    }
                }
            }
        })

        const clubOrgId = club?.organizationId
        const clubParentOrgId = club?.organization?.parentOrganizationId

        // Build list of organization IDs in the same "family"
        // This includes: the club's own org, the parent org, and all sibling orgs
        let familyOrgIds: string[] = clubOrgId ? [clubOrgId] : []

        if (clubParentOrgId) {
            // Add parent org
            familyOrgIds.push(clubParentOrgId)

            // Add all sibling organizations (orgs with same parent)
            const siblings = await prisma.organization.findMany({
                where: { parentOrganizationId: clubParentOrgId },
                select: { id: true }
            })
            familyOrgIds = [...new Set([...familyOrgIds, ...siblings.map(o => o.id)])]
        }

        // Also check: if the club's org IS a parent org, include all child orgs
        if (clubOrgId) {
            const childOrgs = await prisma.organization.findMany({
                where: { parentOrganizationId: clubOrgId },
                select: { id: true }
            })
            familyOrgIds = [...new Set([...familyOrgIds, ...childOrgs.map(o => o.id)])]
        }

        const [tournaments, promotionTests, seminars] = await Promise.all([
            // Fetch upcoming tournaments (open to all - no visibility filter)
            prisma.tournament.findMany({
                where: {
                    startDate: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                },
                include: {
                    participatingClubs: {
                        where: {
                            clubId: clubId
                        }
                    }
                },
                orderBy: { startDate: 'asc' }
            }),
            // Fetch promotion tests - filter by visibility and org family
            prisma.promotionTest.findMany({
                where: {
                    status: { in: ['UPCOMING', 'OPEN'] },
                    OR: [
                        { visibility: 'PUBLIC' },
                        {
                            visibility: 'PRIVATE',
                            organizationId: { in: familyOrgIds }
                        }
                    ]
                },
                include: {
                    participatingClubs: {
                        where: {
                            clubId: clubId
                        }
                    }
                },
                orderBy: { testDate: 'asc' }
            }),
            // Fetch seminars - filter by visibility and org family
            prisma.seminar.findMany({
                where: {
                    status: { in: ['UPCOMING', 'OPEN'] },
                    startDate: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    },
                    OR: [
                        { visibility: 'PUBLIC' },
                        {
                            visibility: 'PRIVATE',
                            organizationId: { in: familyOrgIds }
                        }
                    ]
                },
                include: {
                    participatingClubs: {
                        where: {
                            clubId: clubId
                        }
                    }
                },
                orderBy: { startDate: 'asc' }
            })
        ])

        return {
            tournaments: tournaments.map((t: any) => ({
                id: t.id,
                name: t.name,
                date: t.startDate,
                venue: t.venue,
                type: 'TOURNAMENT' as const,
                isJoined: t.participatingClubs.length > 0
            })),
            promotionTests: promotionTests.map((t: any) => ({
                id: t.id,
                name: t.name,
                date: t.testDate,
                venue: t.venue,
                type: 'PROMOTION_TEST' as const,
                isJoined: t.participatingClubs.length > 0
            })),
            seminars: seminars.map((t: any) => ({
                id: t.id,
                name: t.name,
                date: t.startDate,
                venue: t.venue,
                type: 'SEMINAR' as const,
                isJoined: t.participatingClubs.length > 0
            }))
        }
    } catch (error) {
        console.error('Failed to fetch available events:', error)
        throw new Error('Failed to fetch events')
    }
}

export async function toggleEventParticipation(
    type: 'TOURNAMENT' | 'PROMOTION_TEST' | 'SEMINAR',
    id: string,
    join: boolean,
    clubId: string
) {
    try {
        const dataKey = type === 'TOURNAMENT' ? 'tournamentId' : type === 'PROMOTION_TEST' ? 'promotionTestId' : 'seminarId'

        if (join) {
            await prisma.clubEventParticipation.create({
                data: {
                    clubId,
                    [dataKey]: id
                }
            })
        } else {
            await prisma.clubEventParticipation.deleteMany({
                where: {
                    clubId,
                    [dataKey]: id
                }
            })
        }

        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error(`Failed to ${join ? 'join' : 'leave'} event:`, error)
        return { error: 'Failed to update participation' }
    }
}

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
                ...data
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
            status: 'EXECUTED'
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

// ─────────────────────────────────────────────────────────────────────────────
// BULK SEND UNCONTESTED PROPOSALS
// Sends a proposal for every UNCONTESTED alert that doesn't already have a
// pending proposal. Optionally scoped to a single clubId.
// ─────────────────────────────────────────────────────────────────────────────
export async function bulkSendUncontestedProposals(
    tournamentId: string,
    clubId?: string   // if provided, only send for that club's athletes
): Promise<{ sent: number; alreadyPending: number; skipped: number }> {
    const { detectSmartAlerts } = await import('@/lib/smart-tournament-logic')

    // Fetch live alerts + existing proposals in parallel
    const [alerts, existingProposals] = await Promise.all([
        detectSmartAlerts(tournamentId),
        prisma.smartProposal.findMany({
            where: { tournamentId, type: 'UNCONTESTED', status: 'PENDING' },
            select: { data: true }
        })
    ])

    // Build a set of playerIds that already have a pending proposal
    const pendingPlayerIds = new Set<string>()
    for (const p of existingProposals) {
        try {
            const d = JSON.parse(p.data)
            if (d.playerId) pendingPlayerIds.add(d.playerId)
        } catch { /* ignore */ }
    }

    const uncontestedAlerts = alerts.filter(a => a.type === 'UNCONTESTED')

    let sent = 0, alreadyPending = 0, skipped = 0

    for (const alert of uncontestedAlerts) {
        const playerId  = alert.details?.playerId
        const alertClub = alert.details?.clubId

        // Scope to club if requested
        if (clubId && alertClub !== clubId) { skipped++; continue }

        // Skip if a proposal already exists for this player
        if (pendingPlayerIds.has(playerId)) { alreadyPending++; continue }

        await createSmartProposal(tournamentId, 'UNCONTESTED', {
            playerId,
            playerName:         alert.details?.playerName,
            sourceCategoryId:   alert.categoryId,
            sourceCategoryName: alert.details?.sourceCategoryName || alert.categoryName,
            targetCategoryId:   alert.details?.targetCategoryId   || null,
            targetCategoryName: alert.details?.targetCategoryName || null,
        })
        sent++
    }

    revalidatePath(`/organization`)
    revalidatePath(`/tournament/${tournamentId}`)
    return { sent, alreadyPending, skipped }
}

export async function submitClubDecision(
    proposalId: string,
    clubId: string,
    vote: string
) {
    // 4. Record the vote
    await prisma.smartProposalVote.upsert({
        where: {
            proposalId_clubId: { proposalId, clubId }
        },
        create: {
            proposalId,
            clubId,
            vote
        },
        update: {
            vote,
            timestamp: new Date()
        }
    })

    // Fetch proposal to check type and execute if needed
    const proposal = await prisma.smartProposal.findUnique({
        where: { id: proposalId }
    })

    // 5. UNCONTESTED and CROSS_DIVISION are unilateral — execute immediately on vote
    if (proposal?.type === 'UNCONTESTED' || proposal?.type === 'CROSS_DIVISION') {
        if (vote === 'WITHDRAW' || vote === 'WALKOVER' || vote === 'MOVE_UP') {
            await forceExecuteSmartAction(proposalId, vote)
        }
    }


    revalidatePath('/club') // Refresh club dashboard
    revalidatePath('/organization')
    return { success: true }
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
                ...(data.venue !== undefined && { venue: data.venue }),
                ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
                ...(data.registrationStart !== undefined && { registrationStart: data.registrationStart ? new Date(data.registrationStart) : null }),
                ...(data.registrationEnd !== undefined && { registrationEnd: data.registrationEnd ? new Date(data.registrationEnd) : null }),
                ...(data.earlyBirdDeadline !== undefined && { earlyBirdDeadline: data.earlyBirdDeadline ? new Date(data.earlyBirdDeadline) : null }),
                ...(data.earlyBirdPrice !== undefined && { earlyBirdPrice: data.earlyBirdPrice }),
                ...(data.regularPrice !== undefined && { regularPrice: data.regularPrice }),
                ...(data.headerImageUrl !== undefined && { headerImageUrl: data.headerImageUrl }),
                ...(data.status !== undefined && { status: data.status as any }),
                ...(data.guidelines !== undefined && { guidelines: data.guidelines }),
            }
        })

        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error('Failed to update tournament details:', error)
        return { success: false, error: 'Failed to update tournament details' }
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

        // ─── Option B: Consent Threshold ───────────────────────────────────────
        // For MERGE and SPLIT, block force-execute if the majority of clubs disagree.
        // UNCONTESTED is exempt — it's always a unilateral organiser decision.
        if (proposal.type === 'MERGE' || proposal.type === 'SPLIT') {
            const votes = await prisma.smartProposalVote.findMany({ where: { proposalId } })
            if (votes.length > 0) {
                const disagreeCount = votes.filter(v => v.vote === 'DISAGREE').length
                if (disagreeCount > votes.length / 2) {
                    return {
                        error: `Blocked: ${disagreeCount} of ${votes.length} clubs disagreed. Majority consent is required to proceed.`,
                        blocked: true,
                        disagreeCount,
                        totalVotes: votes.length
                    }
                }
            }
        }
        // ───────────────────────────────────────────────────────────────────────

        if (proposal.type === 'UNCONTESTED' || proposal.type === 'CROSS_DIVISION') {
            let decision = overrideVote

            if (!decision) {
                const vote = await prisma.smartProposalVote.findFirst({ where: { proposalId } })
                decision = vote?.vote
            }

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
                await prisma.player.update({
                    where: { id: data.playerId },
                    data: { registrationStatus: 'WITHDRAWN' }
                })
            }
            // WALKOVER: Do nothing, just mark proposal complete (handled at end)
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

        // Mark Proposal Completed
        await prisma.smartProposal.update({
            where: { id: proposalId },
            data: { status: 'COMPLETED' }
        })

        revalidatePath(`/organization`)
        revalidatePath(`/tournament/${proposal.tournamentId}`)
        return { success: true }

    } catch (e) {
        console.error("Smart Action Failed", e)
        return { error: 'Execution Failed' }
    }
}

export async function getClubSmartProposals(clubId: string) {
    if (!clubId) return []

    // 1. Find active tournaments for this club
    const participation = await prisma.clubEventParticipation.findMany({
        where: { clubId, tournamentId: { not: null } },
        select: { tournamentId: true }
    })

    if (participation.length === 0) return []

    const tournamentIds = participation.map(p => p.tournamentId!).filter(Boolean)

    // 2. Fetch all pending proposals for these tournaments
    const proposals = await prisma.smartProposal.findMany({
        where: {
            tournamentId: { in: tournamentIds },
            status: 'PENDING'
        },
        include: {
            tournament: { select: { name: true } },
            votes: true
        }
    })

    // 3. Filter proposals relevant to this club and inject fresh data
    const relevantProposals = []

    for (const p of proposals) {
        const data = JSON.parse(p.data)
        let isRelevant = false
        let enrichedData = { ...data }

        if (p.type === 'UNCONTESTED') {
            const player = await prisma.player.findUnique({
                where: { id: data.playerId },
                select: { clubId: true, name: true }
            })
            if (player?.clubId === clubId) {
                isRelevant = true
                enrichedData.playerName = player.name // Inject fresh name
            }
        }
        else if (p.type === 'MERGE') {
            const players = await prisma.player.findMany({
                where: { categoryId: data.sourceCategoryId, clubId },
                select: { id: true }
            })
            if (players.length > 0) isRelevant = true
        }
        else if (p.type === 'SPLIT') {
            const players = await prisma.player.findMany({
                where: { categoryId: data.categoryId, clubId },
                select: { id: true }
            })
            if (players.length > 0) isRelevant = true
        }

        if (isRelevant) {
            // check if already voted
            const myVote = p.votes.find(v => v.clubId === clubId)
            relevantProposals.push({
                ...p,
                data: JSON.stringify(enrichedData), // Return updated data
                myVote: myVote?.vote
            })
        }
    }

    return relevantProposals
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
                    user: { select: { birthDate: true } }
                }
            }
        },
        orderBy: [{ gender: 'asc' }, { minAge: 'asc' }, { name: 'asc' }],
    })

    return categories.map(cat => {
        // Determine which bracket engine to use
        let kyorugiSpecs: ReturnType<typeof generateSingleEliminationBracket> = []
        let poomsaeSpecs: ReturnType<typeof generatePoomsaeBracket> = []

        if (cat.type === 'POOMSAE') {
            poomsaeSpecs = generatePoomsaeBracket(
                cat.players as any,
                cat.subtype || 'INDIVIDUAL',
                cat.poomsaeForms
            )
        } else if ((cat.type === 'KYORUGI' || cat.type === 'KYUKPA') && cat.players.length >= 2) {
            kyorugiSpecs = generateSingleEliminationBracket(cat.players as any)
        }

        return {
            categoryId:   cat.id,
            categoryName: cat.name,
            gender:       cat.gender,
            skillLevel:   cat.skillLevel,
            type:         cat.type,
            subtype:      cat.subtype,
            playerCount:  cat.players.length,
            players: cat.players.map(p => ({
                id:          p.id,
                name:        p.name,
                clubId:      p.clubId,
                clubName:    (p as any).club?.name    || null,
                clubLogoUrl: (p as any).club?.logoUrl || null,
                belt:        p.belt        || null,
                height:      p.height      ?? null,
                weight:      p.weight      ?? null,
                division:    p.division    || null,
                birthDate:   (p as any).user?.birthDate?.toISOString() || null,
            })),
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
            // Poomsae specs (performance slots)
            poomsaeSpecs: poomsaeSpecs.map(s => ({
                round:             s.round,
                performanceNumber: s.performanceNumber,
                playerId:          s.playerId || null,
                playerName:        s.player?.name || null,
                displayName:       s.displayName || null,
                memberNames:       s.memberNames || null,
                targetRank:        s.targetRank ?? null,
                assignedForms:     s.assignedForms || null,
            })),
        }
    })
}

export async function previewCategoryBracket(categoryId: string) {
    const cat = await prisma.category.findUnique({
        where:   { id: categoryId },
        include: {
            players: {
                include: {
                    club: { select: { id: true, name: true, logoUrl: true } },
                    user: { select: { birthDate: true } }
                }
            }
        },
    })
    if (!cat) return null

    let kyorugiSpecs: ReturnType<typeof generateSingleEliminationBracket> = []
    let poomsaeSpecs: ReturnType<typeof generatePoomsaeBracket> = []

    if (cat.type === 'POOMSAE') {
        poomsaeSpecs = generatePoomsaeBracket(
            cat.players as any,
            cat.subtype || 'INDIVIDUAL',
            cat.poomsaeForms
        )
    } else if ((cat.type === 'KYORUGI' || cat.type === 'KYUKPA') && cat.players.length >= 2) {
        kyorugiSpecs = generateSingleEliminationBracket(cat.players as any)
    }

    return {
        categoryId:   cat.id,
        categoryName: cat.name,
        type:         cat.type,
        subtype:      cat.subtype,
        playerCount:  cat.players.length,
        players: cat.players.map(p => ({
            id:          p.id,
            name:        p.name,
            clubId:      p.clubId,
            clubName:    (p as any).club?.name    || null,
            clubLogoUrl: (p as any).club?.logoUrl || null,
            belt:        p.belt        || null,
            height:      p.height      ?? null,
            weight:      p.weight      ?? null,
            division:    p.division    || null,
            birthDate:   (p as any).user?.birthDate?.toISOString() || null,
        })),
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
            round:             s.round,
            performanceNumber: s.performanceNumber,
            playerId:          s.playerId || null,
            playerName:        s.player?.name || null,
            displayName:       s.displayName || null,
            memberNames:       s.memberNames || null,
            targetRank:        s.targetRank ?? null,
            assignedForms:     s.assignedForms || null,
        })),
    }
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
    const validCategoryIds = validCategories.map(c => c.id)

    // 2. Delete existing matches
    if (type === 'POOMSAE') {
        await prisma.poomsaeMatch.deleteMany({ where: { categoryRefId: { in: validCategoryIds } } })
    } else {
        await prisma.match.deleteMany({ where: { categoryRefId: { in: validCategoryIds } } })
    }

    // 3. Get next match ID
    const getNextMatchId = async (tId: string, t: string) => {
        if (t === 'POOMSAE') {
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
    if (type === 'POOMSAE') {
        let currentGlobalMatchId = await getNextMatchId(tournamentId, 'POOMSAE')
        for (const category of validCategories) {
            const poomsaeSpecs = generatePoomsaeBracket(
                category.players as any,
                category.subtype || 'INDIVIDUAL',
                category.poomsaeForms
            )
            const distinctGroupIndices = Array.from(new Set(poomsaeSpecs.map(s => s.roundGroupIndex))).sort((a, b) => a - b)
            const groupMapping = new Map<number, number>()
            distinctGroupIndices.forEach(idx => { groupMapping.set(idx, currentGlobalMatchId++) })
            const displayName = category.belt && !category.name.toLowerCase().includes(category.belt.toLowerCase())
                ? `${category.name} ${category.belt}` : category.name
            const createPromises = poomsaeSpecs.map(spec => {
                const sharedMatchId = groupMapping.get(spec.roundGroupIndex) || 0
                const nextGroupSharedId = groupMapping.get(spec.roundGroupIndex + 1) || null
                return prisma.poomsaeMatch.create({
                    data: {
                        categoryRefId: category.id, category: displayName,
                        round: spec.round, matchId: sharedMatchId, nextMatchId: nextGroupSharedId,
                        targetRank: spec.targetRank, performanceNumber: spec.performanceNumber,
                        playerId: spec.playerId || undefined,
                        displayName: spec.displayName || undefined,
                        memberIds: spec.memberIds || undefined,
                        memberNames: spec.memberNames || undefined,
                        assignedForms: spec.assignedForms, status: 'Pending',
                        court: category.court || "Unassigned"
                    }
                })
            })
            await Promise.all(createPromises)
        }
    } else {
        // KYORUGI / KYUKPA — use deterministic seed orders from preview
        let currentMatchNumber = await getNextMatchId(tournamentId, 'KYORUGI')

        const skillPriority: Record<string, number> = { 'novice': 1, 'intermediate': 2, 'advance': 3, 'advanced': 3 }

        type SpecWithCategory = ReturnType<typeof generateSingleEliminationBracket>[number] & {
            categoryId: string; categoryName: string; court: string;
            catMinAge: number; catMinWeight: number; catMinHeight: number;
            catSkillPriority: number; deferFinals: boolean;
        }

        const allSpecs: SpecWithCategory[] = []

        for (const category of validCategories) {
            if (category.players.length < 2) continue

            // Build pre-ordered player list from seed orders (if available)
            let preOrdered: typeof category.players | undefined = undefined
            const order = seedOrders[category.id]
            if (order && order.length > 0) {
                const playerMap = new Map(category.players.map(p => [p.id, p]))
                const ordered = order.map(id => playerMap.get(id)).filter(Boolean) as typeof category.players
                // Only use if all players are accounted for
                if (ordered.length === category.players.length) {
                    preOrdered = ordered
                }
            }

            const specs = generateSingleEliminationBracket(category.players, 1, preOrdered)

            const catMinAge = category.minAge ?? 999
            const catMinWeight = category.minWeight ?? 999
            const catMinHeight = category.minHeight ?? 999
            const catSkillPriority = skillPriority[(category.skillLevel || 'novice').toLowerCase()] || 1

            specs.forEach(s => {
                allSpecs.push({
                    ...s, categoryId: category.id, categoryName: category.name,
                    court: category.court || "Unassigned", catMinAge, catMinWeight, catMinHeight,
                    catSkillPriority, deferFinals: category.deferFinals,
                })
            })
        }

        // Sort (same logic as generateAllBrackets)
        allSpecs.sort((a, b) => {
            const aDef = a.isFinal && a.deferFinals
            const bDef = b.isFinal && b.deferFinals
            if (aDef && !bDef) return 1
            if (!aDef && bDef) return -1
            const aGroup = !a.deferFinals
            const bGroup = !b.deferFinals
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
            const createdMatch = await prisma.match.create({
                data: {
                    categoryRefId: spec.categoryId, category: spec.categoryName,
                    round: spec.round, matchId: currentMatchNumber++,
                    player1: spec.player1?.name || "TBD", player2: spec.player2?.name || "TBD",
                    winner: null, nextMatchSlot: spec.nextMatchSlot, court: spec.court
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
    }

    revalidatePath(`/tournament/${tournamentId}`)
    return { success: true, count: validCategories.length }
}

