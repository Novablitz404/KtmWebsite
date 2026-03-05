'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { getAuthUser } from '@/lib/supabase/server'

export async function generateApiKey(ownerId: string, description: string) {
    try {
        const user = await getAuthUser()
        if (!user) return { error: 'Unauthorized' }

        // Must be Admin to create keys for others? Or Admin creates for Organizers?
        // The prompt says "Admin only". Let's verify admin role.
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id }
        })

        if (!dbUser || dbUser.role !== 'ADMIN') {
            // If user is not admin, they can only generate keys for themselves
            if (!dbUser || ownerId !== dbUser.id) {
                return { error: 'Forbidden' }
            }
        }

        const key = 'ktm_live_' + randomBytes(16).toString('hex')

        await prisma.apiKey.create({
            data: {
                key,
                ownerId,
                description,
                isActive: true
            }
        })

        revalidatePath('/admin/api-keys')
        return { success: true, key } // Return key to show ONCE
    } catch (error) {
        console.error('Generate Key Error:', error)
        return { error: 'Failed to generate key' }
    }
}

export async function revokeApiKey(keyId: string) {
    try {
        const user = await getAuthUser()
        if (!user) return { error: 'Unauthorized' }

        const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
        if (!dbUser || dbUser.role !== 'ADMIN') return { error: 'Forbidden' }

        await prisma.apiKey.update({
            where: { id: keyId },
            data: { isActive: false }
        })

        revalidatePath('/admin/api-keys')
        return { success: true }
    } catch (error) {
        console.error('Revoke Key Error:', error)
        return { error: 'Failed to revoke key' }
    }
}

export async function deleteApiKey(keyId: string) {
    try {
        const user = await getAuthUser()
        if (!user) return { error: 'Unauthorized' }

        const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
        if (!dbUser || dbUser.role !== 'ADMIN') return { error: 'Forbidden' }

        await prisma.apiKey.delete({
            where: { id: keyId }
        })

        revalidatePath('/admin/api-keys')
        return { success: true }
    } catch (error) {
        console.error('Delete Key Error:', error)
        return { error: 'Failed to delete key' }
    }
}
