'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'
import { currentUser } from '@clerk/nextjs/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function updateClubDetails(formData: FormData) {
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const clubId = formData.get('clubId') as string
    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const phone = formData.get('phone') as string
    const logoFile = formData.get('logo') as File | null

    if (!clubId || !name) {
        throw new Error('Club ID and name are required')
    }

    // Verify ownership
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        include: { master: true }
    })

    if (!club) throw new Error('Club not found')
    if (club.master.clerkId !== user.id) throw new Error('Not authorized')

    // Handle Logo Upload
    let logoUrl = club.logoUrl
    if (logoFile && logoFile.size > 0) {
        try {
            const bytes = await logoFile.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Generate unique filename
            const timestamp = Date.now()
            const safeName = logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `club-logo-${clubId}-${timestamp}-${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, buffer, {
                    contentType: logoFile.type,
                    upsert: false
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filename)

            logoUrl = publicUrl
        } catch (error) {
            console.error('Logo upload error:', error)
            // Continue update even if image fails, or throw?
            // Better to warn but continue data update
        }
    }

    // Update Club
    await prisma.club.update({
        where: { id: clubId },
        data: {
            name,
            address: address || null,
            phone: phone || null,
            logoUrl
        }
    })

    revalidatePath('/club')
    return { success: true }
}
