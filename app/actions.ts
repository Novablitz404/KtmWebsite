'use server'

import { revalidatePath } from 'next/cache'
import { findCategoryForPlayer } from '@/lib/placement'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { getClubEventsData } from '@/app/club/data'
import { generatePoomsaeBracket } from '@/lib/poomsae-logic'
import { BracketMatchSpec, generateSingleEliminationBracket } from '@/lib/bracket-logic'
import { deriveSkillLevel, extractBeltFromCategoryName } from '@/lib/skill-logic'
import { toTitleCase } from '@/lib/utils'


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
    const headerImage = formData.get('headerImage') as File | null

    if (!name || !startDateStr) {
        return { error: 'Tournament name and date are required' }
    }

    // Get current user for organizer scoping
    const user = await currentUser()
    if (!user) {
        return { error: 'You must be logged in to create a tournament' }
    }

    // Find DB user to get ID
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id }
    })

    if (!dbUser) {
        return { error: 'User profile not found' }
    }

    // Parse dates
    const startDate = new Date(startDateStr)
    const registrationStart = registrationStartStr ? new Date(registrationStartStr) : null
    const registrationEnd = registrationEndStr ? new Date(registrationEndStr) : null

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
            headerImageUrl,
            organizerId: dbUser.id,
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
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id }
    })

    if (!dbUser) throw new Error('User not found')

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
    const club = formData.get('club') as string
    const skillLevel = formData.get('skillLevel') as string
    const categoryId = formData.get('categoryId') as string
    const poomsaeType = formData.get('poomsaeType') as string
    const tournamentId = formData.get('tournamentId') as string

    if (!name || !categoryId) return

    // Generate unique 5-digit player ID
    const generatePlayerId = async (): Promise<string> => {
        let attempts = 0
        while (attempts < 100) {
            const randomNum = Math.floor(Math.random() * 100000)
            const id = randomNum.toString().padStart(5, '0')
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
            name,
            gender: gender || 'Male',
            belt: belt || 'Black',
            // @ts-ignore: Prisma types delay
            club: club || '',
            // @ts-ignore: Prisma types delay
            skillLevel: skillLevel || 'Novice',
            weight: isNaN(weight) ? null : weight,
            poomsaeType: poomsaeType || 'INDIVIDUAL',
            categoryId,
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

    // 2. Fetch Tournament for match_count base
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        select: { match_count: true }
    })

    let currentGlobalMatchId = (tournament?.match_count || 0) + 1
    const validCategories = categories.filter(c => c.players.length > 0)

    // 3. Delete Existing Matches (Bulk)
    const validCategoryIds = validCategories.map(c => c.id)
    if (type === 'POOMSAE') {
        await prisma.poomsaeMatch.deleteMany({
            where: { categoryRefId: { in: validCategoryIds } }
        })
    } else {
        await prisma.match.deleteMany({
            where: { categoryRefId: { in: validCategoryIds } }
        })
    }

    // 4. In-Memory Generation & Parallel DB Writes
    // We'll collect all creation operations and run them transactionally or in parallel batches

    if (type === 'POOMSAE') {
        // --- POOMSAE GENERATION ---

        // We need to execute sequentially or manage the shared ID counter carefully
        // Since we are inside one action, we can just increment the local variable `currentGlobalMatchId`

        for (const category of validCategories) {
            const players = category.players
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

            // Using standard create loop here because createMany doesn't support relation IDs easily
            // and we need to map `nextMatchId`
            // Optimization: We could use createMany if we pre-calculated everything, 
            // but `nextMatchId` for Poomsae is simple (just an int), so createMany IS Possible!
            // BUT, PoomsaeMatch has `player` relation which createMany handles via playerId string.
            // So we can use createMany for speed! 

            // Actually, we'll stick to a parallel Promise.all loop per category for safety and simplicity first
            // to avoid transaction limits if there are thousands of matches.

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
                        assignedForms: spec.assignedForms,
                        status: 'Pending',
                        court: category.court || "Unassigned"
                    }
                })
            })

            await Promise.all(createPromises)
        }

    } else {
        // --- KYORUGI & KYUKPA GENERATION ---

        // Kyukpa also uses Single Elimination, so it shares this logic.

        // Use a different strategy:
        // Kyorugi matches rely on database auto-increment IDs for linking (previous generation logic)
        // OR we can assign manual IDs if we change schema to standard Int.
        // Currently `Match` uses `Int @id @default(autoincrement())`.

        // The existing `generateBracketsForCategory` function relies on receiving the DB ID back to update links.
        // We can reuse that function but call it in parallel for all categories?
        // HOWEVER, that function manages its own deletion and revalidation.
        // And it relies on auto-increment, so we can't batch-insert easily with known IDs.

        // Strategy: Run them sequentially or in small chunks to avoid DB connection exhaustion.
        // Since we already deleted all matches, we can just run the logic.

        // Note: The existing logic logic does:
        // 1. generateSingleEliminationBracket (memory)
        // 2. create Matches (db) -> get IDs
        // 3. update Matches (db) -> link nextMatchId

        // We'll re-implement optimized Kyorugi loop here to avoid the overhead of `generateBracketsForCategory`

        for (const category of validCategories) {
            if (category.players.length < 2) continue; // Skip single players

            const bracketSpecs = generateSingleEliminationBracket(category.players)
            const idMapping = new Map<number, number>();

            const sortedSpecs = [...bracketSpecs].sort((a, b) => {
                if (a.round !== b.round) return a.round - b.round;
                return a.id - b.id;
            });

            // Pass 1
            for (const spec of sortedSpecs) {
                const createdMatch = await prisma.match.create({
                    data: {
                        categoryRefId: category.id,
                        category: category.name,
                        round: spec.round,
                        player1: spec.player1?.name || "TBD",
                        player2: spec.player2?.name || "TBD",
                        winner: null,
                        status: 'Pending',
                        nextMatchSlot: spec.nextMatchSlot,
                        court: category.court || "Unassigned"
                    }
                });
                idMapping.set(spec.id, createdMatch.id);
            }

            // Pass 2 updates
            const linkUpdates = []
            for (const spec of bracketSpecs) {
                if (spec.nextMatchId !== null) {
                    const actualId = idMapping.get(spec.id);
                    const actualNextId = idMapping.get(spec.nextMatchId);
                    if (actualId && actualNextId) {
                        linkUpdates.push(
                            prisma.match.update({
                                where: { id: actualId },
                                data: { nextMatchId: actualNextId }
                            })
                        )
                    }
                }
            }
            await Promise.all(linkUpdates)
        }
    }

    // 5. Update Match Count
    await prisma.tournament.update({
        where: { id: tournamentId },
        data: { match_count: currentGlobalMatchId }
    })

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

        const poomsaeSpecs = generatePoomsaeBracket(
            players,
            category.subtype || 'INDIVIDUAL',
            category.poomsaeForms
        )

        // Get count of distinct groups to assign global match IDs
        const distinctGroupIndices = Array.from(new Set(poomsaeSpecs.map(s => s.roundGroupIndex))).sort((a, b) => a - b)

        // Fetch tournament to get/increment match_count
        const tournament = await prisma.tournament.findUnique({
            where: { id: category.tournamentId },
            select: { match_count: true }
        })

        const startMatchNum = (tournament?.match_count || 0) + 1

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
                player1: spec.player1?.name || "TBD",
                player2: spec.player2?.name || "TBD",
                winner: null,
                status: 'Pending',
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

    // Sort by round (Round 1 first = earliest matches get lowest auto-increment IDs)
    const matchesForInsertion = [...matchesWithTracking].sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round;
        return a.id - b.id;
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
                status: 'Pending',
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
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const role = formData.get('role') as string
    const firstNameRaw = formData.get('firstName') as string
    const lastNameRaw = formData.get('lastName') as string

    // Standardize Names to Title Case
    const firstName = toTitleCase(firstNameRaw)
    const lastName = toTitleCase(lastNameRaw)
    const clubName = formData.get('clubName') as string
    const birthDateStr = formData.get('birthDate') as string
    const gender = formData.get('gender') as string
    const belt = formData.get('belt') as string

    // Validation
    const isOrganizer = role === 'ORGANIZER'
    const isManager = role === 'MANAGER'

    // Basic requirements for everyone
    if (!firstName || !lastName || !birthDateStr) {
        throw new Error('Name and date information are required')
    }

    // Role-specific requirements
    if (isOrganizer) {
        if (!clubName) throw new Error('Organization name is required')
        // Belt/Gender optional for Organizer
    } else if (!isManager) {
        // Athletes and Club Masters need everything
        if (!gender || !belt || !clubName) {
            throw new Error('All profile fields are required')
        }
    }

    const birthDate = new Date(birthDateStr)

    // Check if user already exists (by clerkId OR email)
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { clerkId: user.id },
                { email: user.emailAddresses[0].emailAddress }
            ]
        }
    })

    if (existingUser) {
        // User already onboarded - update clerkId if needed and redirect
        if (existingUser.clerkId !== user.id) {
            await prisma.user.update({
                where: { id: existingUser.id },
                data: { clerkId: user.id }
            })
        }
        return
    }

    // Generate unique 5-digit ID
    const generate5DigitId = async (): Promise<string> => {
        let attempts = 0;
        while (attempts < 100) {
            const randomNum = Math.floor(Math.random() * 100000);
            const id = randomNum.toString().padStart(5, '0');
            const exists = await prisma.user.findUnique({ where: { id } });
            if (!exists) return id;
            attempts++;
        }
        throw new Error('Could not generate unique ID after 100 attempts');
    };

    const newUserId = await generate5DigitId();
    const userEmail = user.emailAddresses[0].emailAddress

    // ----------------------------------------------------
    // CHECK FOR INVITES & OVERRIDE ROLE IF APPLICABLE
    // ----------------------------------------------------
    let assignedRole = role
    let assignedClubName = clubName

    // 1. Organizer role - no invite needed, will be PENDING until admin approval
    // (Organization created with PENDING status below)

    // 2. Check for Club Assistant Invite
    const assistantInvite = await prisma.clubAssistantInvite.findUnique({ where: { email: userEmail } })
    if (assistantInvite) {
        assignedRole = 'ASSISTANT_CLUB_MASTER'
        assignedClubName = assistantInvite.clubName
        await prisma.clubAssistantInvite.delete({ where: { email: userEmail } })
    }

    // Create the User record
    const dbUser = await prisma.user.create({
        data: {
            id: newUserId,
            clerkId: user.id,
            email: userEmail,
            role: assignedRole,
            name: `${firstName} ${lastName}`,
            clubName: assignedClubName,
            birthDate: birthDate,
            gender: gender || null,
            belt: belt || null
        }
    })

    // If Club Master match, create the Club
    if (assignedRole === 'CLUB_MASTER' && assignedClubName) {
        let orgId = formData.get('organizationId') as string

        // If checking for valid organization (mandatory for new clubs)
        // If we are here, it means we are creating a new club (assignedClubName is present)
        // However, if the user was invited, they might be joining an existing club?
        // Wait, CURRENTLY completeOnboarding logic is:
        // if user is CLUB_MASTER, we create a NEW CLUB with masterId = user.id
        // This implies 1 Master = 1 Club (Owned).

        // If it was an invite, we might want to skip organization check if the invite already handled it?
        // But currently ClubMasterInvite doesn't seem to link to a Club, it invites a user TO BECOME a master.

        // So validation:
        if (!orgId) {
            // Fallback: If no organizationId provided (maybe old flow?), we block or assign default?
            // For strict mode:
            throw new Error("Organization affiliation is required to create a club.")
        }

        await prisma.club.create({
            data: {
                name: assignedClubName,
                masterId: dbUser.id,
                organizationId: orgId,
                status: 'PENDING'
            }
        })
    }

    // If Organizer, create the Organization with PENDING status
    if (assignedRole === 'ORGANIZER' && assignedClubName) {
        await prisma.organization.create({
            data: {
                name: assignedClubName, // Using clubName as Organization Name
                establishedAt: birthDate, // Using birthDate as Established Date
                ownerId: dbUser.id,
                status: 'PENDING' // Requires admin approval
            }
        })
    }

    // 4. Check for Tournament Manager Invites (Can exist alongside any role)
    const managerInvites = await prisma.tournamentManagerInvite.findMany({ where: { email: userEmail } })
    if (managerInvites.length > 0) {
        for (const invite of managerInvites) {
            await prisma.tournament.update({
                where: { id: invite.tournamentId },
                data: { managers: { connect: { id: dbUser.id } } }
            })
            // Delete the invite
            await prisma.tournamentManagerInvite.delete({ where: { id: invite.id } })
        }
    }

    // 5. Check for Co-Organizer Invites (Can exist alongside any role)
    const coOrganizerInvites = await prisma.coOrganizerInvite.findMany({ where: { email: userEmail } })
    if (coOrganizerInvites.length > 0) {
        for (const invite of coOrganizerInvites) {
            await prisma.organization.update({
                where: { id: invite.organizationId },
                data: { coOrganizers: { connect: { id: dbUser.id } } }
            })
            // Delete the invite
            await prisma.coOrganizerInvite.delete({ where: { id: invite.id } })
        }
    }
    // ----------------------------------------------------------------
    // SYNC ROLE TO CLERK METADATA (For optimal redirection)
    // ----------------------------------------------------------------
    // This allows middleware to redirect without DB lookup
    try {
        const client = await clerkClient()
        await client.users.updateUser(user.id, {
            publicMetadata: {
                role: assignedRole
            }
        })
    } catch (error) {
        console.error('Failed to sync role to Clerk metadata:', error)
        // Don't fail the whole request, as DB is already updated.
        // The user will fall back to DB-based redirect.
    }
}

export async function completeClubMasterOnboarding(formData: FormData) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

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
    const userEmail = user.emailAddresses[0].emailAddress

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { clerkId: user.id },
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

    // Generate unique 5-digit ID
    const generate5DigitId = async (): Promise<string> => {
        let attempts = 0;
        while (attempts < 100) {
            const randomNum = Math.floor(Math.random() * 100000);
            const id = randomNum.toString().padStart(5, '0');
            const exists = await prisma.user.findUnique({ where: { id } });
            if (!exists) return id;
            attempts++;
        }
        throw new Error('Could not generate unique ID after 100 attempts');
    };

    const newUserId = await generate5DigitId();

    // Create the User record
    const dbUser = await prisma.user.create({
        data: {
            id: newUserId,
            clerkId: user.id,
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

    // Update Clerk Image if provided
    if (imageFile && imageFile.size > 0 && updatedUser.clerkId) {
        try {
            const client = await clerkClient()
            await client.users.updateUserProfileImage(updatedUser.clerkId, {
                file: imageFile
            })
        } catch (error) {
            console.error('Failed to update Clerk profile image:', error)
            // We don't throw here to allow the other profile updates to succeed even if image fails
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

    // Generate unique 5-digit player ID
    const generatePlayerId = async (): Promise<string> => {
        let attempts = 0
        while (attempts < 100) {
            const randomNum = Math.floor(Math.random() * 100000)
            const id = randomNum.toString().padStart(5, '0')
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

    // Find club by name (if user belongs to one)
    const club = clubName ? await prisma.club.findFirst({
        where: { name: clubName }
    }) : null

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
            await prisma.player.update({
                where: { id: player.id },
                data: {
                    skillLevel: player.skillLevel,
                    registrationStatus: 'APPROVED'
                }
            })
        }

        revalidatePath('/club')
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

    // Generate unique 5-digit player ID
    const generatePlayerId = async (): Promise<string> => {
        let attempts = 0
        while (attempts < 100) {
            const randomNum = Math.floor(Math.random() * 100000)
            const id = randomNum.toString().padStart(5, '0')
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
                ...(name !== undefined && { name }),
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

export async function getTournamentPlayers(tournamentId: string, skip?: number, take?: number) {
    return await prisma.player.findMany({
        where: {
            category: {
                tournamentId
            }
        },
        include: {
            category: {
                select: { id: true, name: true, type: true, tournamentId: true, court: true }
            },
            club: {
                select: { id: true, name: true }
            }
        },
        orderBy: {
            category: {
                name: 'asc'
            }
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

        const user = await currentUser()
        if (!user) return { error: 'Unauthorized' }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { role: true, id: true, club: true, clubName: true }
        })

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
    const tournaments = await prisma.tournament.findMany({
        where: {
            startDate: {
                gte: new Date()
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
            birthDate: true,
            clerkId: true // for avatar
        },
        take: 10
    })
    return members
}

export async function fetchClubMembers(clubName: string, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize

    const [members, totalCount] = await Promise.all([
        prisma.user.findMany({
            where: { clubName: clubName, role: { in: ['ATHLETE', 'ASSISTANT_CLUB_MASTER'] } },
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        }),
        prisma.user.count({
            where: { clubName: clubName, role: { in: ['ATHLETE', 'ASSISTANT_CLUB_MASTER'] } }
        })
    ])

    // Enrich with Clerk Avatars
    let membersWithAvatars = members.map(m => ({ ...m, imageUrl: null as string | null }))

    try {
        const clerkIds = members.map(m => m.clerkId).filter((id): id is string => !!id)
        if (clerkIds.length > 0) {
            const client = await clerkClient()
            const clerkUsers = await client.users.getUserList({
                userId: clerkIds,
                limit: clerkIds.length
            })

            const avatarMap = new Map()
            clerkUsers.data.forEach((u: any) => avatarMap.set(u.id, u.imageUrl))

            membersWithAvatars = members.map(m => ({
                ...m,
                imageUrl: (avatarMap.get(m.clerkId) as string) || null
            }))
        }
    } catch (e) {
        console.error("Failed to fetch clerk avatars", e)
    }

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

export async function fetchLandingPageEvents() {
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    // Parallel fetch
    const [upcomingTournaments, upcomingPromotions] = await Promise.all([
        prisma.tournament.findMany({
            where: {
                startDate: { gte: currentDate },
                status: { not: 'CANCELLED' }
            },
            orderBy: { startDate: 'asc' },
            take: 6
        }),
        prisma.promotionTest.findMany({
            where: {
                testDate: { gte: currentDate },
                visibility: 'PUBLIC'
            },
            orderBy: { testDate: 'asc' },
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

    // Normalize promotions
    const normalizedPromotions = upcomingPromotions.map(p => ({
        id: p.id,
        type: 'PROMOTION',
        name: p.name,
        date: p.testDate,
        venue: p.venue,
        imageUrl: p.bannerUrl,
        status: p.status,
        regStart: null,
        regEnd: p.registrationDeadline,
        link: `/events/promotion/${p.id}` // Placeholder link logic from page.tsx discussion
    }))

    // Combine and sort
    return [...normalizedTournaments, ...normalizedPromotions]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 6)
}

export async function fetchAthleteDashboardData(clerkId: string) {
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
        }
    })

    if (!dbUser) return null

    // Fetch club info if user has a club
    let clubLogo: string | null = null
    let clubId: string | null = null

    if (dbUser.clubName) {
        const club = await prisma.club.findFirst({
            where: { name: { equals: dbUser.clubName, mode: 'insensitive' } },
            select: { id: true, logoUrl: true }
        })
        clubLogo = club?.logoUrl || null
        clubId = club?.id || null
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
        orderBy: { id: 'desc' },
        take: 10
    })

    // Fetch generic upcoming events for the club (My Events)
    let clubUpcomingEvents: any[] = []
    if (clubId) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        clubUpcomingEvents = await prisma.tournament.findMany({
            where: {
                participatingClubs: { some: { clubId } },
                startDate: { gte: today },
                status: { not: 'CANCELLED' } // detailed view handles cancelled, but dashboard list maybe clean?
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
        })
    }

    return {
        user: dbUser,
        clubLogo,
        registrations,
        clubUpcomingEvents
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

    const registeredTournamentIds = userRegistrations.map(r => r.category.tournamentId)

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
        const [tournaments, promotionTests] = await Promise.all([
            // Fetch upcoming tournaments
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
            // Fetch open promotion tests
            prisma.promotionTest.findMany({
                where: {
                    status: { in: ['UPCOMING', 'OPEN'] }
                },
                include: {
                    participatingClubs: {
                        where: {
                            clubId: clubId
                        }
                    }
                },
                orderBy: { testDate: 'asc' }
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
            }))
        }
    } catch (error) {
        console.error('Failed to fetch available events:', error)
        throw new Error('Failed to fetch events')
    }
}

export async function toggleEventParticipation(
    type: 'TOURNAMENT' | 'PROMOTION_TEST',
    id: string,
    join: boolean,
    clubId: string
) {
    try {
        if (join) {
            await prisma.clubEventParticipation.create({
                data: {
                    clubId,
                    ...(type === 'TOURNAMENT' ? { tournamentId: id } : { promotionTestId: id })
                }
            })
        } else {
            await prisma.clubEventParticipation.deleteMany({
                where: {
                    clubId,
                    ...(type === 'TOURNAMENT' ? { tournamentId: id } : { promotionTestId: id })
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

export async function unregisterFromTournament(tournamentId: string) {
    const user = await currentUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id }
    })

    if (!dbUser) {
        return { error: 'User not found' }
    }

    try {
        await prisma.player.deleteMany({
            where: {
                userId: dbUser.id,
                category: {
                    tournamentId: tournamentId
                }
            }
        })

        revalidatePath('/athlete')
        return { success: true }
    } catch (error) {
        console.error('Error unregistering from tournament:', error)
        return { error: 'Failed to unregister' }
    }
}

export async function removeMemberFromClub(memberId: string) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

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

export async function updateClubMember(memberId: string, data: { name?: string, weight?: number, belt?: string, gender?: string }) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    try {
        await prisma.user.update({
            where: { id: memberId },
            data: {
                ...data
            }
        })
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
    const user = await currentUser()
    if (!user) return []

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: {
            createdTournaments: {
                where: { status: 'UPCOMING' },
                select: { id: true, name: true }
            }
        }
    })

    if (!dbUser) return []

    const allAlerts = []

    for (const tournament of dbUser.createdTournaments) {
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

    // 5. If UNCONTESTED and action is unilateral (Withdraw/Walkover), execute immediately
    if (proposal?.type === 'UNCONTESTED') {
        if (vote === 'WITHDRAW' || vote === 'WALKOVER') {
            await forceExecuteSmartAction(proposalId, vote)
        }
    }

    revalidatePath('/club') // Refresh club dashboard
    revalidatePath('/organization')
    return { success: true }
}

export async function updateTournamentGuidelines(tournamentId: string, guidelinesText: string) {
    const user = await currentUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
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

        if (proposal.type === 'UNCONTESTED') {
            // Uncontested Actions: MOVE_UP, WALKOVER, WITHDRAW
            // Using the overrideVote as the decision (since this is typically 1 club)
            // Or fetch the single vote if overrideVote is null
            let decision = overrideVote

            if (!decision) {
                const vote = await prisma.smartProposalVote.findFirst({ where: { proposalId } })
                decision = vote?.vote
            }

            if (!decision) return { error: 'No decision made yet' }

            if (decision === 'MOVE_UP') {
                // Move player to target category (assuming we can find it)
                // For now, "Move Up" likely needs a target. 
                // If the logic didn't provide one, we might need a manual selection?
                // But for automation, let's assume we find the next weight category.

                // If data doesn't have targetId, we can't move. 
                // The alert/proposal data SHOULD contain target options or we find it now.
                const player = await prisma.player.findUnique({
                    where: { id: data.playerId },
                    include: { category: true }
                })

                if (player) {
                    // Find next heavier category
                    const siblings = await prisma.category.findMany({
                        where: {
                            tournamentId: player.category.tournamentId,
                            // same division/gender/belt
                            gender: player.category.gender,
                            minAge: player.category.minAge,
                            belt: player.category.belt
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
                        return { error: 'No heavier category found' }
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
                include: { players: true }
            })

            if (category) {
                // Create Group A / B
                const baseName = category.name
                const [cA, cB] = await prisma.$transaction([
                    prisma.category.create({
                        data: {
                            ...category,
                            id: undefined, // new ID
                            name: `${baseName} (Group A)`,
                            players: undefined, // don't copy relation
                            matches: undefined
                        }
                    }),
                    prisma.category.create({
                        data: {
                            ...category,
                            id: undefined,
                            name: `${baseName} (Group B)`,
                            players: undefined,
                            matches: undefined
                        }
                    })
                ])

                // Split players (Even/Odd)
                const updates = category.players.map((p, i) =>
                    prisma.player.update({
                        where: { id: p.id },
                        data: { categoryId: i % 2 === 0 ? cA.id : cB.id }
                    })
                )

                await prisma.$transaction(updates)
                await prisma.category.delete({ where: { id: categoryId } })
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

    return { available: !user }
}
