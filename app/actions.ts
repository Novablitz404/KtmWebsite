'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

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
    const guidelinePdf = formData.get('guidelinePdf') as File | null
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

    // Handle PDF upload
    let guidelinePdfUrl: string | null = null
    if (guidelinePdf && guidelinePdf.size > 0) {
        try {
            const bytes = await guidelinePdf.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Generate unique filename
            const timestamp = Date.now()
            const safeName = guidelinePdf.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `${timestamp}-${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, buffer, {
                    contentType: 'application/pdf',
                    upsert: false
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filename)

            guidelinePdfUrl = publicUrl
        } catch (error) {
            console.error('PDF upload error:', error)
            return { error: 'Failed to upload PDF file' }
        }
    }

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

    await prisma.tournament.create({
        data: {
            name,
            venue: venue || null,
            startDate,
            registrationStart,
            registrationEnd,
            guidelinePdfUrl,
            headerImageUrl,
            organizerId: dbUser.id,
        },
    })

    revalidatePath('/')
    revalidatePath('/tournaments')
    return { success: true }
}

export async function createCategory(formData: FormData) {
    const name = formData.get('name') as string
    const tournamentId = formData.get('tournamentId') as string

    if (!name || !tournamentId) return

    await prisma.category.create({
        data: {
            name,
            tournamentId,
        },
    })

    revalidatePath(`/tournament/${tournamentId}`)
}

export async function createPlayer(formData: FormData) {
    const name = formData.get('name') as string
    const gender = formData.get('gender') as string
    const belt = formData.get('belt') as string
    const weight = parseFloat(formData.get('weight') as string)
    const club = formData.get('club') as string
    const skillLevel = formData.get('skillLevel') as string
    const categoryId = formData.get('categoryId') as string
    const tournamentId = formData.get('tournamentId') as string

    if (!name || !categoryId) return

    await prisma.player.create({
        data: {
            name,
            gender: gender || 'Male',
            belt: belt || 'Black',
            // @ts-ignore: Prisma types delay
            club: club || '',
            // @ts-ignore: Prisma types delay
            skillLevel: skillLevel || 'Novice',
            weight: isNaN(weight) ? null : weight,
            categoryId,
        },
    })

    revalidatePath(`/tournament/${tournamentId}`)
}

import { generateSingleEliminationBracket } from '@/lib/bracket-logic'

export async function generateBracketsForCategory(categoryId: string) {
    if (!categoryId) return

    const players = await prisma.player.findMany({
        where: { categoryId },
    })

    if (players.length < 2) return

    await prisma.match.deleteMany({
        where: { categoryRefId: categoryId }
    })

    // Fetch category name for denormalization
    const category = await prisma.category.findUnique({ where: { id: categoryId } })

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
                court: "Unassigned"
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

    // Find tournament ID to revalidate
    if (category) {
        revalidatePath(`/tournament/${category.tournamentId}`)
    }
}
import { BracketMatchSpec } from '@/lib/bracket-logic'

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
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const clubName = formData.get('clubName') as string
    const birthDateStr = formData.get('birthDate') as string
    const gender = formData.get('gender') as string
    const belt = formData.get('belt') as string

    // Validation
    const isOrganizerOrManager = role === 'ORGANIZER' || role === 'MANAGER'

    if (!firstName || !lastName || !birthDateStr || !gender || !belt || (!clubName && !isOrganizerOrManager)) {
        throw new Error('All fields are required')
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

    // Create the User record
    const dbUser = await prisma.user.create({
        data: {
            id: newUserId,
            clerkId: user.id,
            email: user.emailAddresses[0].emailAddress,
            role: role,
            name: `${firstName} ${lastName}`,
            clubName: clubName,
            birthDate: birthDate,
            gender: gender,
            belt: belt
        }
    })

    // If Club Master, create the Club
    if (role === 'CLUB_MASTER' && clubName) {
        await prisma.club.create({
            data: {
                name: clubName,
                masterId: dbUser.id
            }
        })
    }
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
}

export async function registerForTournament(input: RegisterForTournamentInput) {
    const { categoryId, userId, name, gender, belt, weight, clubName } = input

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
                clubId: club?.id || null,
                registrationStatus: 'PENDING',
                skillLevel: null // To be set by Club Master
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

    // Find or create the category for this tournament
    let category = await prisma.category.findFirst({
        where: {
            tournamentId,
            name: categoryName
        }
    })

    if (!category) {
        category = await prisma.category.create({
            data: {
                name: categoryName,
                tournamentId
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
                skillLevel: null // To be set by Club Master
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

        // Create categories from template
        let categoriesCreated = 0

        for (const division of template.divisions) {
            for (const weightCat of division.categories) {
                // Create category name: "Division Gender WeightClass"
                // e.g., "Cadet Male FIN" or "Junior Female Under 58kg"
                const genderLabel = weightCat.gender === 'Both' ? '' : weightCat.gender
                const categoryName = `${division.name} ${genderLabel} ${weightCat.name}`.replace(/\s+/g, ' ').trim()

                await prisma.category.create({
                    data: {
                        name: categoryName,
                        tournamentId
                    }
                })
                categoriesCreated++
            }
        }

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
    height?: number
    weight?: number
    belt?: string
}

export async function updatePlayerDetails({ playerId, height, weight, belt }: UpdatePlayerDetailsInput) {
    try {
        await prisma.player.update({
            where: { id: playerId },
            data: {
                ...(height !== undefined && { height }),
                ...(weight !== undefined && { weight }),
                ...(belt !== undefined && { belt })
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
