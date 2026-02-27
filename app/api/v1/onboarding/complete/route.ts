import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * Converts a string to Title Case while preserving:
 * - Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII)
 * - Common abbreviations/suffixes after hyphens (R-XI, NCR, etc.)
 * - Short connector words stay lowercase (of, the, and, in, at, for, de, del)
 *
 * Examples:
 *   "HWARANG TAEKWONDO CLUB R-XI" → "Hwarang Taekwondo Club R-XI"
 *   "manila taekwondo center"     → "Manila Taekwondo Center"
 */
const ROMAN_NUMERALS = new Set(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'])
const LOWERCASE_WORDS = new Set(['of', 'the', 'and', 'in', 'at', 'for', 'de', 'del'])

function toTitleCase(str: string): string {
    return str
        .split(' ')
        .map((word, index) => {
            // Handle hyphenated words like R-XI
            if (word.includes('-')) {
                return word.split('-').map(part => {
                    const upper = part.toUpperCase()
                    if (ROMAN_NUMERALS.has(upper)) return upper
                    if (part.length <= 1) return upper
                    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                }).join('-')
            }

            const upper = word.toUpperCase()
            // Preserve roman numerals
            if (ROMAN_NUMERALS.has(upper)) return upper
            // Keep connector words lowercase (except first word)
            if (index > 0 && LOWERCASE_WORDS.has(word.toLowerCase())) return word.toLowerCase()
            // Standard title case
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        })
        .join(' ')
}

/**
 * POST /api/v1/onboarding/complete
 * 
 * Handles role-specific profile completion during onboarding:
 * - ATHLETE: Saves name, DOB, gender, weight, height, belt, club + profile image
 * - CLUB_MASTER: Saves owner profile (name + image) + creates Club record
 * - ORGANIZER: Saves owner profile (name + image) + creates Organization record
 * 
 * After saving, syncs { profileComplete: true } to Clerk publicMetadata.
 */
export async function POST(request: Request) {
    try {
        const dbUser = await authenticateApi()
        if (!dbUser) return apiError('Unauthorized', 401)

        const formData = await request.formData()
        const role = formData.get('role') as string
        const name = toTitleCase((formData.get('name') as string) || '')
        const imageFile = formData.get('image') as File | null

        if (!name) {
            return apiError('Name is required', 400)
        }

        // ─── UPLOAD PROFILE IMAGE TO CLERK ───
        if (imageFile && imageFile.size > 0 && dbUser.clerkId) {
            try {
                const client = await clerkClient()
                await client.users.updateUserProfileImage(dbUser.clerkId, {
                    file: imageFile
                })
            } catch (error) {
                console.error('Failed to upload profile image:', error)
                // Non-blocking — continue with profile save
            }
        }

        // ─── ROLE-SPECIFIC LOGIC ───
        if (role === 'ATHLETE') {
            const weight = parseFloat(formData.get('weight') as string)
            const height = parseFloat(formData.get('height') as string)
            const belt = formData.get('belt') as string
            const gender = formData.get('gender') as string
            const clubName = toTitleCase(formData.get('clubName') as string)
            const birthDateStr = formData.get('birthDate') as string
            const athleteNumber = (formData.get('athleteNumber') as string) || undefined

            if (!belt || !gender || !clubName || !birthDateStr || isNaN(weight) || isNaN(height)) {
                return apiError('All athlete profile fields are required', 400)
            }

            const birthDate = new Date(birthDateStr)

            await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                    name,
                    weight,
                    height,
                    belt,
                    gender,
                    clubName,
                    birthDate,
                    athleteNumber
                }
            })

        } else if (role === 'CLUB_MASTER') {
            const clubName = toTitleCase(formData.get('clubName') as string)
            const organizationId = formData.get('organizationId') as string
            const athleteNumber = (formData.get('athleteNumber') as string) || undefined
            const clubLogoFile = formData.get('clubLogo') as File | null
            const clubAddress = (formData.get('clubAddress') as string) || undefined
            const clubPhone = (formData.get('clubPhone') as string) || undefined

            if (!clubName || !organizationId) {
                return apiError('Club name and organization affiliation are required', 400)
            }

            // Update owner profile
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { name, athleteNumber }
            })

            // Upload club logo if provided (store as base64 or upload to a service)
            let clubLogoUrl: string | undefined = undefined
            if (clubLogoFile && clubLogoFile.size > 0) {
                // For now, we upload the logo to Clerk as a metadata note or save as blob
                // In production, you'd upload to S3/Cloudinary
                // For MVP, we'll store the logo URL once we handle file uploads
                // TODO: Implement proper file storage
            }

            // Create the Club record
            await prisma.club.create({
                data: {
                    name: clubName,
                    masterId: dbUser.id,
                    organizationId,
                    logoUrl: clubLogoUrl,
                    address: clubAddress,
                    phone: clubPhone,
                    status: 'PENDING'
                }
            })

        } else if (role === 'ORGANIZER') {
            const orgName = toTitleCase(formData.get('orgName') as string)
            const establishedDateStr = formData.get('establishedDate') as string
            const orgLogoFile = formData.get('orgLogo') as File | null

            if (!orgName || !establishedDateStr) {
                return apiError('Organization name and established date are required', 400)
            }

            const establishedAt = new Date(establishedDateStr)

            // Update owner profile
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { name }
            })

            // Upload org logo if provided
            let orgLogoUrl: string | undefined = undefined
            if (orgLogoFile && orgLogoFile.size > 0) {
                // TODO: Implement proper file storage
            }

            // Create the Organization record
            await prisma.organization.create({
                data: {
                    name: orgName,
                    ownerId: dbUser.id,
                    establishedAt,
                    logoUrl: orgLogoUrl,
                    status: 'PENDING'
                }
            })

        } else {
            // Unknown role — just save name
            await prisma.user.update({
                where: { id: dbUser.id },
                data: { name }
            })
        }

        // ─── SYNC profileComplete TO CLERK METADATA ───
        if (dbUser.clerkId) {
            try {
                const client = await clerkClient()
                await client.users.updateUser(dbUser.clerkId, {
                    publicMetadata: {
                        role: dbUser.role,
                        profileComplete: true
                    }
                })
            } catch (error) {
                console.error('Failed to sync profileComplete to Clerk:', error)
            }
        }

        return apiResponse({ success: true, message: 'Profile completed' })

    } catch (error: any) {
        console.error('Onboarding complete error:', error)
        return apiError(error.message || 'Failed to complete profile', 500)
    }
}
