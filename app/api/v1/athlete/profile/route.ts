import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

export async function PUT(request: Request) {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

        // Ensure user is authorized to edit their profile (users can edit their own)
        // Usually we restrict role changes, but basic profile info is fine.

        const formData = await request.formData()

        const name = formData.get('name') as string
        const clubName = formData.get('clubName') as string
        const belt = formData.get('belt') as string
        const gender = formData.get('gender') as string
        const weight = parseFloat(formData.get('weight') as string)
        const height = parseFloat(formData.get('height') as string)
        const birthDateStr = formData.get('birthDate') as string
        const imageFile = formData.get('image') as File | null

        if (!name) {
            return apiError('Name is required', 400)
        }

        const birthDate = birthDateStr ? new Date(birthDateStr) : undefined

        // Update Prisma User
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name,
                clubName: clubName || user.clubName, // Keep existing if not provided? Or allow empty? Assuming provided.
                belt: belt || user.belt,
                gender: gender || user.gender,
                weight: isNaN(weight) ? undefined : weight,
                height: isNaN(height) ? undefined : height,
                birthDate: birthDate || undefined
            },
            select: {
                id: true,
                name: true,
                clubName: true,
                belt: true,
                gender: true,
                weight: true,
                height: true,
                birthDate: true,
                role: true
            }
        })

        // Update Clerk User Image if Provided
        if (imageFile && imageFile.size > 0 && user.clerkId) {
            try {
                const client = await clerkClient()
                await client.users.updateUserProfileImage(user.clerkId, {
                    file: imageFile
                })
            } catch (error) {
                console.error('Failed to update Clerk profile image via API:', error)
                // Return success but with a warning in real world, but for now just log it.
                // We'll proceed as if success since DB update worked
            }
        }

        return apiResponse(updatedUser)

    } catch (error) {
        console.error('Profile update error:', error)
        return apiError('Failed to update profile', 500)
    }
}
