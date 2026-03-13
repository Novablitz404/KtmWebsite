'use server'

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { toTitleCase } from '@/lib/utils'

// Generate a random 9-digit ID
function generateUserId(): string {
    return Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')
}

// Generate a temporary password (8 chars, alphanumeric)
function generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}

interface CreateClubMemberInput {
    email?: string
    name: string
    gender?: string
    belt?: string
    weight?: number
    height?: number
    birthDate?: Date
    athleteNumber?: string
}

export async function createClubMember(input: CreateClubMemberInput) {
    const dbUser = await getAuthUser()
    if (!dbUser) {
        return { error: 'Unauthorized' }
    }

    // Get the Club Master's club
    const clubMaster = await prisma.user.findUnique({
        where: { id: dbUser.id },
        include: { club: true }
    })

    if (!clubMaster || clubMaster.role !== 'CLUB_MASTER' || !clubMaster.club) {
        return { error: 'Only Club Masters can create members' }
    }

    const clubName = clubMaster.club.name

    // Check if email already exists (only when email is provided)
    if (input.email) {
        const existingUser = await prisma.user.findUnique({
            where: { email: input.email }
        })

        if (existingUser) {
            return { error: 'A user with this email already exists' }
        }
    }

    try {
        // Generate unique ID for our database
        let newId = generateUserId()
        let idExists = await prisma.user.findUnique({ where: { id: newId } })
        while (idExists) {
            newId = generateUserId()
            idExists = await prisma.user.findUnique({ where: { id: newId } })
        }

        // Use provided email or generate a placeholder
        const memberEmail = input.email || `noemail-${newId}@member.ktm`

        // Create database user (Ghost Account)
        const newMember = await prisma.user.create({
            data: {
                id: newId,
                clerkId: null, // No Clerk ID yet
                email: memberEmail,
                name: toTitleCase(input.name),
                role: 'ATHLETE',
                clubName: clubName,
                gender: input.gender || null,
                belt: input.belt || null,
                weight: input.weight || null,
                height: input.height || null,
                birthDate: input.birthDate || null,
                athleteNumber: input.athleteNumber || null,
            }
        })

        revalidatePath('/club')

        return {
            success: true,
            member: newMember,
            tempPassword: null // No password needed
        }
    } catch (error: any) {
        console.error('Error creating club member:', error)
        return { error: error.message || 'Failed to create member' }
    }
}

export async function promoteToAssistant(memberId: string) {
    const dbUser = await getAuthUser()
    if (!dbUser) return { error: 'Unauthorized' }

    if (!dbUser || dbUser.role !== 'CLUB_MASTER') {
        return { error: 'Only Club Masters can promote members' }
    }

    // Verify target member belongs to the same club
    const targetMember = await prisma.user.findUnique({
        where: { id: memberId },
        select: { clubName: true, role: true }
    })

    if (!targetMember) return { error: 'Member not found' }
    if (targetMember.clubName !== dbUser.clubName) {
        return { error: 'Member does not belong to your club' }
    }

    try {
        await prisma.user.update({
            where: { id: memberId },
            data: { role: 'ASSISTANT_CLUB_MASTER' }
        })
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error('Error promoting member:', error)
        return { error: 'Failed to promote member' }
    }
}

export async function demoteToAthlete(memberId: string) {
    const dbUser = await getAuthUser()
    if (!dbUser) return { error: 'Unauthorized' }

    if (!dbUser || dbUser.role !== 'CLUB_MASTER') {
        return { error: 'Only Club Masters can demote members' }
    }

    // Verify target member belongs to the same club
    const targetMember = await prisma.user.findUnique({
        where: { id: memberId },
        select: { clubName: true, role: true }
    })

    if (!targetMember) return { error: 'Member not found' }
    if (targetMember.clubName !== dbUser.clubName) {
        return { error: 'Member does not belong to your club' }
    }

    if (targetMember.role !== 'ASSISTANT_CLUB_MASTER') {
        return { error: 'User is not an Assistant Club Master' }
    }

    try {
        await prisma.user.update({
            where: { id: memberId },
            data: { role: 'ATHLETE' }
        })
        revalidatePath('/club')
        return { success: true }
    } catch (error) {
        console.error('Error demoting member:', error)
        return { error: 'Failed to demote member' }
    }
}

export async function getAthleteDetails(memberId: string) {
    const dbUser = await getAuthUser()
    if (!dbUser) return { error: 'Unauthorized' }

    if (!dbUser || dbUser.role !== 'CLUB_MASTER') {
        return { error: 'Only Club Masters can view athlete details' }
    }

    // Fetch the member
    const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
            id: true,
            name: true,
            email: true,
            gender: true,
            belt: true,
            weight: true,
            height: true,
            birthDate: true,
            clubName: true,
            isVerified: true,
            imageUrl: true,
        }
    })

    if (!member || member.clubName !== dbUser.clubName) {
        return { error: 'Member not found or not in your club' }
    }

    // Fetch tournament entries (Players linked to this user)
    const players = await prisma.player.findMany({
        where: { userId: memberId },
        select: {
            id: true,
            name: true,
            medal: true,
            registrationStatus: true,
            belt: true,
            weight: true,
            division: true,
            poomsaeType: true,
            category: {
                select: {
                    name: true,
                    type: true,
                    tournament: {
                        select: {
                            name: true,
                            startDate: true,
                        }
                    }
                }
            },
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' }
    })

    // Fetch promotion test registrations
    const promotions = await prisma.promotionTestRegistration.findMany({
        where: { playerId: memberId },
        select: {
            id: true,
            playerName: true,
            currentBelt: true,
            targetBelt: true,
            status: true,
            paymentStatus: true,
            createdAt: true,
            promotionTest: {
                select: {
                    name: true,
                    testDate: true,
                    venue: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    // Fetch seminar registrations
    const seminars = await prisma.seminarRegistration.findMany({
        where: { playerId: memberId },
        select: {
            id: true,
            playerName: true,
            belt: true,
            status: true,
            createdAt: true,
            seminar: {
                select: {
                    name: true,
                    startDate: true,
                    venue: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return {
        member,
        tournaments: players.map(p => ({
            id: p.id,
            tournamentName: p.category?.tournament?.name || 'Unknown',
            tournamentDate: p.category?.tournament?.startDate,
            categoryName: p.category?.name || 'Unknown',
            categoryType: p.category?.type || 'Unknown',
            medal: p.medal,
            status: p.registrationStatus,
            belt: p.belt,
            weight: p.weight,
            division: p.division,
            poomsaeType: p.poomsaeType,
            date: p.createdAt,
        })),
        promotions: promotions.map(p => ({
            id: p.id,
            testName: p.promotionTest?.name || 'Unknown',
            testDate: p.promotionTest?.testDate,
            venue: p.promotionTest?.venue,
            currentBelt: p.currentBelt,
            targetBelt: p.targetBelt,
            status: p.status,
            paymentStatus: p.paymentStatus,
            date: p.createdAt,
        })),
        seminars: seminars.map(s => ({
            id: s.id,
            seminarName: s.seminar?.name || 'Unknown',
            seminarDate: s.seminar?.startDate,
            venue: s.seminar?.venue,
            belt: s.belt,
            status: s.status,
            date: s.createdAt,
        })),
    }
}

// Supabase client for avatar uploads
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function uploadMemberAvatar(formData: FormData) {
    const dbUser = await getAuthUser()
    if (!dbUser) throw new Error('Unauthorized')

    const file = formData.get('avatar') as File | null
    const memberId = formData.get('memberId') as string | null

    if (!file || file.size === 0) throw new Error('No file provided')
    if (!memberId) throw new Error('No member ID provided')

    // Validate club master permission
    if (dbUser.role !== 'CLUB_MASTER') {
        throw new Error('Only Club Masters can upload member avatars')
    }

    // Validate member belongs to this club
    const member = await prisma.user.findUnique({
        where: { id: memberId },
        select: { clubName: true }
    })
    if (!member || member.clubName !== dbUser.clubName) {
        throw new Error('Member not found in your club')
    }

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = `${memberId}`

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, buffer, {
            contentType: file.type,
            upsert: true
        })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

    // Update DB
    await prisma.user.update({
        where: { id: memberId },
        data: { imageUrl: urlWithCacheBust }
    })

    revalidatePath('/club')
    revalidatePath('/members')

    return { url: urlWithCacheBust }
}
