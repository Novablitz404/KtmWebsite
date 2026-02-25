'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'avatars'

/**
 * Upload an avatar image to Supabase Storage.
 * Stores as `avatars/{userId}.webp` — overwrites any existing avatar.
 */
export async function uploadAvatar(userId: string, file: File | Blob): Promise<string | null> {
    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const filePath = `${userId}`

        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, buffer, {
                contentType: file.type || 'image/webp',
                upsert: true // Overwrite existing
            })

        if (uploadError) {
            console.error('Avatar upload error:', uploadError)
            return null
        }

        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(filePath)

        return publicUrl
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
export function getAvatarUrl(userId: string): string {
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
