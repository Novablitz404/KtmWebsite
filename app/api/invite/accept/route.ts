import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerClient } from '@/lib/supabase/server'
import { uploadAvatar } from '@/lib/supabase-storage'

export async function POST(req: Request) {
    try {
        const formData = await req.formData()
        const token = formData.get('token') as string
        const name = formData.get('name') as string
        const password = formData.get('password') as string
        const role = formData.get('role') as string
        const inviteId = formData.get('inviteId') as string
        const imageFile = formData.get('image') as File | null

        if (!token || !name || !password || !role || !inviteId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabase = await createServerClient()

        let userEmail = ''
        let organizationId = ''
        let tournamentId = ''

        // 1. Verify the Invite Exists & Get Context
        if (role === 'CO_ORGANIZER') {
            const invite = await prisma.coOrganizerInvite.findUnique({ where: { id: inviteId, token } })
            if (!invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 })
            userEmail = invite.email
            organizationId = invite.organizationId
        } else if (role === 'MANAGER') {
            const invite = await prisma.tournamentManagerInvite.findUnique({ where: { id: inviteId, token } })
            if (!invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 })
            userEmail = invite.email
            tournamentId = invite.tournamentId
        } else {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
        }

        // 2. Create the User in Supabase Auth
        // Because they own the email address where the invite was sent, we auto-confirm them
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userEmail,
            password: password,
            options: {
                data: {
                    full_name: name,
                    role: role,
                }
            }
        })

        if (authError || !authData.user) {
            console.error('Supabase Auth Error:', authError)
            return NextResponse.json({ error: authError?.message || 'Failed to create authentication context' }, { status: 500 })
        }

        const authUser = authData.user

        // 3. Generate 5-digit ID for Prisma User
        const generate5DigitId = async (): Promise<string> => {
            let attempts = 0
            while (attempts < 100) {
                const randomNum = Math.floor(Math.random() * 100000)
                const id = randomNum.toString().padStart(5, '0')
                const exists = await prisma.user.findUnique({ where: { id } })
                if (!exists) return id
                attempts++
            }
            throw new Error('Could not generate unique ID')
        }

        const newUserId = await generate5DigitId()

        // 4. Handle Profile Picture Upload if exists
        let imageUrl = null
        if (imageFile && imageFile.size > 0) {
            try {
                imageUrl = await uploadAvatar(newUserId, imageFile)
            } catch (err) {
                console.error("Failed to upload avatar:", err)
            }
        }

        // 5. Create the Prisma User and Assign Relations
        await prisma.$transaction(async (tx) => {
            // Create user
            const dbUser = await tx.user.create({
                data: {
                    id: newUserId,
                    clerkId: authUser.id,
                    email: userEmail,
                    role: role,
                    name: name,
                    imageUrl: imageUrl,
                }
            })

            // Connect & Delete Invite
            if (role === 'CO_ORGANIZER') {
                await tx.organization.update({
                    where: { id: organizationId },
                    data: { coOrganizers: { connect: { id: dbUser.id } } }
                })
                await tx.coOrganizerInvite.delete({ where: { id: inviteId } })
            } else if (role === 'MANAGER') {
                await tx.tournament.update({
                    where: { id: tournamentId },
                    data: { managers: { connect: { id: dbUser.id } } }
                })
                await tx.tournamentManagerInvite.delete({ where: { id: inviteId } })
            }
        })

        // Sign them in immediately using the created session if available, or just redirect to normal sign-in
        if (authData.session) {
            await supabase.auth.setSession({
                access_token: authData.session.access_token,
                refresh_token: authData.session.refresh_token,
            })
        }

        const redirectTo = role === 'CO_ORGANIZER' ? '/organization' : `/tournament/${tournamentId}`

        return NextResponse.json({ success: true, redirectTo })

    } catch (error: any) {
        console.error('Invite Accept Error:', error)
        return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 })
    }
}
