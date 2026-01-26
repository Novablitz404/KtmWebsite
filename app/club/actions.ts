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

    // Generate temporary password
    const tempPassword = generateTempPassword()

    try {
        // Create Clerk user
        const clerkUser = await clerkClient.users.createUser({
            emailAddress: [input.email],
            password: tempPassword,
            firstName: input.name?.split(' ')[0] || '',
            lastName: input.name?.split(' ').slice(1).join(' ') || '',
            skipPasswordChecks: true, // Allow simple temp passwords
        })

        // Generate unique ID for our database
        let newId = generateUserId()
        let idExists = await prisma.user.findUnique({ where: { id: newId } })
        while (idExists) {
            newId = generateUserId()
            idExists = await prisma.user.findUnique({ where: { id: newId } })
        }

        // Create database user
        const newMember = await prisma.user.create({
            data: {
                id: newId,
                clerkId: clerkUser.id,
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
            tempPassword: tempPassword // Return so Club Master can share it
        }
    } catch (error: any) {
        console.error('Error creating club member:', error)

        // Handle Clerk-specific errors
        if (error?.errors?.[0]?.code === 'form_identifier_exists') {
            return { error: 'This email is already registered with Clerk' }
        }

        return { error: error.message || 'Failed to create member' }
    }
}
