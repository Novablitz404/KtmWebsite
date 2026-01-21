'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { getClubEventsData } from '@/app/club/data'

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
                const categoriesToCreate: { name: string; tournamentId: string }[] = []

                for (const division of template.divisions) {
                    for (const weightCat of division.categories) {
                        const genderLabel = weightCat.gender === 'Both' ? '' : weightCat.gender
                        const categoryName = `${division.name} ${genderLabel} ${weightCat.name}`.replace(/\s+/g, ' ').trim()
                        categoriesToCreate.push({ name: categoryName, tournamentId: tournament.id })
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
    return { success: true }
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

    // Delete Tournament
    await prisma.tournament.delete({
        where: { id }
    })

    revalidatePath('/organizer-tournaments')
    revalidatePath('/')
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

    // 1. Check for Organization Invite (Strict Enforcement)
    if (role === 'ORGANIZER') {
        const orgInvite = await prisma.organizationInvite.findUnique({ where: { email: userEmail } })

        if (!orgInvite) {
            throw new Error("Organization registration is by invitation only.")
        }

        // Invite valid - proceed
        assignedRole = 'ORGANIZER'
        await prisma.organizationInvite.delete({ where: { email: userEmail } })
    }

    // 2. Check for Club Master Invite
    const clubMasterInvite = await prisma.clubMasterInvite.findUnique({ where: { email: userEmail } })
    if (clubMasterInvite) {
        assignedRole = 'CLUB_MASTER'
        // Club Name will be provided by the user in the form if they are going through this flow
        // effectively treating them as a self-registered club master if they somehow bypassed the dedicated flow
        await prisma.clubMasterInvite.delete({ where: { email: userEmail } })
    }

    // 3. Check for Club Assistant Invite
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

    // If Organizer, create the Organization
    if (assignedRole === 'ORGANIZER' && assignedClubName) {
        await prisma.organization.create({
            data: {
                name: assignedClubName, // Using clubName as Organization Name
                establishedAt: birthDate, // Using birthDate as Established Date
                ownerId: dbUser.id
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

    // Check for Club Master Invite (Optional now)
    const clubMasterInvite = await prisma.clubMasterInvite.findUnique({ where: { email: userEmail } })

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

    // Delete the invite if it existed
    if (clubMasterInvite) {
        await prisma.clubMasterInvite.delete({ where: { email: userEmail } })
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

        // Build all categories first, then batch insert
        const categoriesToCreate: { name: string; tournamentId: string }[] = []

        for (const division of template.divisions) {
            for (const weightCat of division.categories) {
                const genderLabel = weightCat.gender === 'Both' ? '' : weightCat.gender
                const categoryName = `${division.name} ${genderLabel} ${weightCat.name}`.replace(/\s+/g, ' ').trim()
                categoriesToCreate.push({ name: categoryName, tournamentId })
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

export async function updatePlayerDetails({ playerId, name, height, weight, belt, skillLevel }: UpdatePlayerDetailsInput) {
    try {
        await prisma.player.update({
            where: { id: playerId },
            data: {
                ...(name !== undefined && { name }),
                ...(height !== undefined && { height }),
                ...(weight !== undefined && { weight }),
                ...(belt !== undefined && { belt }),
                ...(skillLevel !== undefined && { skillLevel })
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

export async function updateCategory(categoryId: string, tournamentId: string, data: { name?: string; type?: string; court?: string }) {
    try {
        await prisma.category.update({
            where: { id: categoryId },
            data
        })
        revalidatePath(`/tournament/${tournamentId}`)
        return { success: true }
    } catch (error) {
        console.error('Update Category Error:', error)
        return { error: 'Failed to update category' }
    }
}

export async function createCategory(tournamentId: string, name: string, type: string = 'KYORUGI', court: string = '') {
    try {
        await prisma.category.create({
            data: {
                tournamentId,
                name,
                type,
                court: court || null
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
                    name: true
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
            where: { clubName: clubName, role: 'ATHLETE' },
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        }),
        prisma.user.count({
            where: { clubName: clubName, role: 'ATHLETE' }
        })
    ])

    // Enrich with Clerk Avatars
    let membersWithAvatars = members.map(m => ({ ...m, imageUrl: null as string | null }))

    try {
        const clerkIds = members.map(m => m.clerkId).filter(Boolean)
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
