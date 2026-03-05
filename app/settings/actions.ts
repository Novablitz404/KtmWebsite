'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthUser } from '@/lib/supabase/server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function updateOrganizationProfile(organizationId: string, formData: FormData) {
    const user = await getAuthUser()
    if (!user) throw new Error('Unauthorized')

    const name = formData.get('name') as string
    const chairman = formData.get('chairman') as string
    const viceChairman = formData.get('viceChairman') as string
    const address = formData.get('address') as string
    const website = formData.get('website') as string
    const contactEmail = formData.get('contactEmail') as string
    const contactPhone = formData.get('contactPhone') as string
    const logoFile = formData.get('logo') as File | null

    const whiteToPurpleFeeStr = formData.get('whiteToPurpleFee') as string
    const blueToMaroonFeeStr = formData.get('blueToMaroonFee') as string
    const brownFeeStr = formData.get('brownFee') as string

    if (!name) throw new Error('Organization Name is required')

    let logoUrl: string | undefined = undefined

    // Handle Logo Upload
    if (logoFile && logoFile.size > 0) {
        try {
            const bytes = await logoFile.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Generate unique filename
            const timestamp = Date.now()
            const safeName = logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `org-logo-${organizationId}-${timestamp}-${safeName}`

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
            // Continue update even if image upload fails? or throw? 
            // We'll log it but proceed with other updates for now.
        }
    }

    let defaultBeltFees: any = undefined
    if (whiteToPurpleFeeStr || blueToMaroonFeeStr || brownFeeStr) {
        defaultBeltFees = {
            whiteToPurple: whiteToPurpleFeeStr ? parseFloat(whiteToPurpleFeeStr) : null,
            blueToMaroon: blueToMaroonFeeStr ? parseFloat(blueToMaroonFeeStr) : null,
            brown: brownFeeStr ? parseFloat(brownFeeStr) : null
        }
    }

    await prisma.organization.update({
        where: { id: organizationId },
        data: {
            name,
            chairman,
            viceChairman,
            address,
            website,
            contactEmail,
            contactPhone,
            ...(logoUrl && { logoUrl }), // Only update if new logo uploaded
            ...(defaultBeltFees && { defaultBeltFees })
        }
    })

    revalidatePath('/organization')
}

export async function uploadProfilePicture(formData: FormData) {
    const dbUser = await getAuthUser()
    if (!dbUser) throw new Error('Unauthorized')

    const file = formData.get('avatar') as File | null
    if (!file || file.size === 0) throw new Error('No file provided')

    // Validate file
    if (file.size > 5 * 1024 * 1024) throw new Error('File too large (max 5MB)')
    if (!file.type.startsWith('image/')) throw new Error('File must be an image')

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filePath = `${dbUser.id}`

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, buffer, {
            contentType: file.type,
            upsert: true
        })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

    // Add cache-busting query param to force browsers to show new image
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

    // Update DB
    await prisma.user.update({
        where: { id: dbUser.id },
        data: { imageUrl: urlWithCacheBust }
    })

    revalidatePath('/organization')
    revalidatePath('/club')
    revalidatePath('/athlete')
    revalidatePath('/admin')
    revalidatePath('/onboarding')

    return { url: urlWithCacheBust }
}
