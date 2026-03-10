import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { uploadAvatar } from '@/lib/supabase-storage'

export async function PUT(request: Request) {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

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

        // Upload image to Supabase Storage if provided
        let imageUrl: string | undefined = undefined
        if (imageFile && imageFile.size > 0) {
            const url = await uploadAvatar(user.id, imageFile)
            if (url) {
                imageUrl = `${url}?t=${Date.now()}`
            }
        }

        // Update Prisma User
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name,
                clubName: clubName || user.clubName,
                belt: belt || user.belt,
                gender: gender || user.gender,
                weight: isNaN(weight) ? undefined : weight,
                height: isNaN(height) ? undefined : height,
                birthDate: birthDate || undefined,
                ...(imageUrl && { imageUrl })
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

        // Cascade name change to all registration records
        const { cascadeUserName } = await import('@/lib/cascadeUserName')
        await cascadeUserName(user.id, name)

        return apiResponse(updatedUser)

    } catch (error) {
        console.error('Profile update error:', error)
        return apiError('Failed to update profile', 500)
    }
}
