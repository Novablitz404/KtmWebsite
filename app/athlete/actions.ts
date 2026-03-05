'use server'

import { getAuthUser } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function updateAthleteMetrics(formData: FormData) {
    const user = await getAuthUser()
    if (!user) throw new Error('Unauthorized')

    const weight = parseFloat(formData.get('weight') as string)
    const height = parseFloat(formData.get('height') as string)

    if (isNaN(weight) || isNaN(height)) {
        throw new Error('Invalid metrics')
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            weight,
            height
        }
    })

    revalidatePath('/athlete')
}
