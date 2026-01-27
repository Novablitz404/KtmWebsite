'use server'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateAthleteMetrics(formData: FormData) {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized')

    const weight = parseFloat(formData.get('weight') as string)
    const height = parseFloat(formData.get('height') as string)

    if (isNaN(weight) || isNaN(height)) {
        throw new Error('Invalid metrics')
    }

    await prisma.user.update({
        where: { clerkId: userId },
        data: {
            weight,
            height
        }
    })

    revalidatePath('/athlete')
}
