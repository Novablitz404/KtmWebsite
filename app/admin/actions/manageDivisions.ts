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

// DIVISIONS

export async function addDivision(templateId: string, data: FormData) {
    try {
        await checkAdmin()
        const name = data.get('name') as string
        const minAge = parseInt(data.get('minAge') as string)
        const maxAge = parseInt(data.get('maxAge') as string)
        const displayOrder = parseInt(data.get('displayOrder') as string) || 0

        if (!templateId || !name) throw new Error('Missing required fields')

        await prisma.division.create({
            data: {
                templateId,
                name,
                minAge,
                maxAge,
                displayOrder
            }
        })

        revalidatePath('/admin') // Or specific cache tag
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function deleteDivision(id: string) {
    try {
        await checkAdmin()
        await prisma.division.delete({ where: { id } })
        revalidatePath('/admin')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function updateDivision(id: string, data: FormData) {
    try {
        await checkAdmin()
        const name = data.get('name') as string
        const minAge = parseInt(data.get('minAge') as string)
        const maxAge = parseInt(data.get('maxAge') as string)
        const displayOrder = parseInt(data.get('displayOrder') as string)

        await prisma.division.update({
            where: { id },
            data: { name, minAge, maxAge, displayOrder }
        })
        revalidatePath('/admin')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}


// CATEGORIES

export async function addCategory(divisionId: string, data: FormData) {
    try {
        await checkAdmin()
        const name = data.get('name') as string
        const gender = data.get('gender') as string
        const minWeight = parseFloat(data.get('minWeight') as string) || 0
        const maxWeight = parseFloat(data.get('maxWeight') as string) || 0
        const minHeight = parseFloat(data.get('minHeight') as string) || 0
        const maxHeight = parseFloat(data.get('maxHeight') as string) || 0
        const displayOrder = parseInt(data.get('displayOrder') as string) || 0

        if (!divisionId || !name || !gender) throw new Error('Missing required fields')

        await prisma.weightCategory.create({
            data: {
                divisionId,
                name,
                gender,
                minWeight,
                maxWeight,
                minHeight,
                maxHeight,
                displayOrder
            }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}

export async function deleteCategory(id: string) {
    try {
        await checkAdmin()
        await prisma.weightCategory.delete({ where: { id } })
        revalidatePath('/admin')
        return { success: true }
    } catch (error: any) {
        return { error: error.message }
    }
}
