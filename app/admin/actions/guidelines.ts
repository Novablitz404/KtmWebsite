'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

async function checkAdmin() {
    const { userId } = await auth()
    if (!userId) return null

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }
    return true
}

export async function createGuidelineTemplate(data: FormData) {
    try {
        await checkAdmin()
        const name = data.get('name') as string
        const content = data.get('content') as string

        if (!name) throw new Error('Name is required')

        await prisma.guidelineTemplate.create({
            data: {
                name,
                content
            }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function updateGuidelineTemplate(data: FormData) {
    try {
        await checkAdmin()
        const id = data.get('id') as string
        const name = data.get('name') as string
        const content = data.get('content') as string

        if (!id || !name) throw new Error('ID and Name are required')

        await prisma.guidelineTemplate.update({
            where: { id },
            data: {
                name,
                content
            }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function deleteGuidelineTemplate(id: string) {
    try {
        await checkAdmin()
        if (!id) throw new Error('ID is required')

        await prisma.guidelineTemplate.delete({
            where: { id }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}
