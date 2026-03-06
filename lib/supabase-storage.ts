'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'avatars'

/**
 * Helper: Delete old file before uploading new one.
 * Silently ignores errors (file might not exist yet).
 */
async function deleteOldFile(bucket: string, filePath: string) {
    try {
        await supabase.storage.from(bucket).remove([filePath])
    } catch {
        // Ignore — old file may not exist
    }
}

/**
 * Helper: Append cache-busting timestamp to URL so browsers always fetch fresh image.
 */
function cacheBust(url: string): string {
    return `${url}?t=${Date.now()}`
}

/**
 * Upload an avatar image to Supabase Storage.
 * Deletes old avatar first, then uploads new one.
 * Stores as `avatars/{userId}`.
 */
export async function uploadAvatar(userId: string, file: File | Blob): Promise<string | null> {
    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filePath = `${userId}`

        // Delete old avatar first
        await deleteOldFile(BUCKET, filePath)

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                contentType: file.type || 'image/webp',
                upsert: true
            })

        if (uploadError) {
            console.error('Avatar upload error:', uploadError)
            return null
        }

        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(filePath)

        return cacheBust(publicUrl)
    } catch (error) {
        console.error('Avatar upload failed:', error)
        return null
    }
}

/**
 * Upload avatar from a URL (used for migration from Clerk).
 * Downloads the image, then uploads to Supabase Storage.
 */
export async function uploadAvatarFromUrl(userId: string, imageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(imageUrl)
        if (!response.ok) return null

        const blob = await response.blob()
        return uploadAvatar(userId, blob)
    } catch (error) {
        console.error(`Failed to migrate avatar for ${userId}:`, error)
        return null
    }
}

/**
 * Get the public URL for a user's avatar.
 */
export async function getAvatarUrl(userId: string): Promise<string> {
    const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(userId)

    return publicUrl
}

/**
 * Delete a user's avatar from Supabase Storage.
 */
export async function deleteAvatar(userId: string): Promise<boolean> {
    try {
        const { error } = await supabase.storage
            .from(BUCKET)
            .remove([userId])

        if (error) {
            console.error('Avatar delete error:', error)
            return false
        }
        return true
    } catch (error) {
        console.error('Avatar delete failed:', error)
        return false
    }
}

/**
 * Upload a logo to the 'logos' bucket.
 * Deletes old logo first, then uploads new one.
 */
export async function uploadLogo(id: string, file: File | Blob): Promise<string | null> {
    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filePath = `${id}`

        // Delete old logo first
        await deleteOldFile('logos', filePath)

        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(filePath, buffer, {
                contentType: file.type || 'image/webp',
                upsert: true
            })

        if (uploadError) {
            console.error('Logo upload error:', uploadError)
            return null
        }

        const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(filePath)

        return cacheBust(publicUrl)
    } catch (error) {
        console.error('Logo upload failed:', error)
        return null
    }
}

/**
 * Upload a tournament banner/header image to the 'logos' bucket.
 * Deletes old banner first, then uploads new one.
 * Stores as `banners/{tournamentId}`.
 */
export async function uploadBanner(tournamentId: string, file: File | Blob): Promise<string | null> {
    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const filePath = `banners/${tournamentId}`

        // Delete old banner first
        await deleteOldFile('logos', filePath)

        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(filePath, buffer, {
                contentType: file.type || 'image/webp',
                upsert: true
            })

        if (uploadError) {
            console.error('Banner upload error:', uploadError)
            return null
        }

        const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(filePath)

        return cacheBust(publicUrl)
    } catch (error) {
        console.error('Banner upload failed:', error)
        return null
    }
}

/**
 * Upload a proof-of-payment image to the 'proof-of-payment' bucket.
 * Stores as `proof-of-payment/{affiliationId}`.
 */
export async function uploadProofOfPayment(affiliationId: string, file: File | Blob): Promise<string | null> {
    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const filePath = `${affiliationId}`

        // Delete old proof first
        await deleteOldFile('proof-of-payment', filePath)

        const { error: uploadError } = await supabase.storage
            .from('proof-of-payment')
            .upload(filePath, buffer, {
                contentType: file.type || 'image/webp',
                upsert: true
            })

        if (uploadError) {
            console.error('Proof of payment upload error:', uploadError)
            return null
        }

        const { data: { publicUrl } } = supabase.storage
            .from('proof-of-payment')
            .getPublicUrl(filePath)

        return cacheBust(publicUrl)
    } catch (error) {
        console.error('Proof of payment upload failed:', error)
        return null
    }
}
