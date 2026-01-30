'use server'

import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { createClerkClient } from '@clerk/backend'
import { revalidatePath } from 'next/cache'

// Initialize Clerk client
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

// Generate a random 5-digit ID
function generateUserId(): string {
    return Math.floor(10000 + Math.random() * 90000).toString()
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
    email: string
    name: string
    gender?: string
    belt?: string
    weight?: number
    height?: number
    birthDate?: Date
}

export async function createClubMember(input: CreateClubMemberInput) {
    const user = await currentUser()
    if (!user) {
        return { error: 'Unauthorized' }
    }

    // Get the Club Master's club
    const clubMaster = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: { club: true }
    })

    if (!clubMaster || clubMaster.role !== 'CLUB_MASTER' || !clubMaster.club) {
        return { error: 'Only Club Masters can create members' }
    }

    const clubName = clubMaster.club.name

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
        where: { email: input.email }
    })

    if (existingUser) {
        return { error: 'A user with this email already exists' }
    }

    try {
        // Generate unique ID for our database
        // NOTE: We do NOT create a Clerk user here. The user will claim this account 
        // when they sign up with the matching email.
        let newId = generateUserId()
        let idExists = await prisma.user.findUnique({ where: { id: newId } })
        while (idExists) {
            newId = generateUserId()
            idExists = await prisma.user.findUnique({ where: { id: newId } })
        }

        // Create database user (Ghost Account)
        const newMember = await prisma.user.create({
            data: {
                id: newId,
                clerkId: null, // No Clerk ID yet
                email: input.email,
                name: input.name,
                role: 'ATHLETE',
                clubName: clubName,
                gender: input.gender || null,
                belt: input.belt || null,
                weight: input.weight || null,
                height: input.height || null,
                birthDate: input.birthDate || null,
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    // Verify requester is a CLUB_MASTER
    const requester = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true, clubName: true, club: { select: { id: true } } }
    })

    if (!requester || requester.role !== 'CLUB_MASTER' || !requester.club) {
        return { error: 'Only Club Masters can promote members' }
    }

    // Verify target member belongs to the same club
    const targetMember = await prisma.user.findUnique({
        where: { id: memberId },
        select: { clubName: true, role: true }
    })

    if (!targetMember) return { error: 'Member not found' }
    if (targetMember.clubName !== requester.clubName) {
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    // Verify requester is a CLUB_MASTER
    const requester = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true, clubName: true }
    })

    if (!requester || requester.role !== 'CLUB_MASTER') {
        return { error: 'Only Club Masters can demote members' }
    }

    // Verify target member belongs to the same club
    const targetMember = await prisma.user.findUnique({
        where: { id: memberId },
        select: { clubName: true, role: true }
    })

    if (!targetMember) return { error: 'Member not found' }
    if (targetMember.clubName !== requester.clubName) {
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
