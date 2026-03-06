import { apiError, apiResponse } from '@/lib/auth-api'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
// clerkClient removed — metadata stored in DB only
import { uploadAvatar, uploadLogo } from '@/lib/supabase-storage'

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
 * For new sign-ups, creates the DB user record if it doesn't exist yet.
 */
export async function POST(request: Request) {
    try {
        // Get the authenticated Supabase user
        const supabase = await createServerClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return apiError('Unauthorized', 401)

        // Look up existing DB record, or create one for new sign-ups
        let dbUser = await prisma.user.findUnique({
            where: { clerkId: authUser.id },
            select: { id: true, email: true, organizationMemberId: true }
        })

        if (!dbUser) {
            // New sign-up: create DB record with unique 5-digit ID
            const role = (authUser.user_metadata?.role as string) || 'ATHLETE'
            let newId = Math.floor(10000 + Math.random() * 90000).toString()
            while (await prisma.user.findUnique({ where: { id: newId } })) {
                newId = Math.floor(10000 + Math.random() * 90000).toString()
            }
            dbUser = await prisma.user.create({
                data: {
                    id: newId,
                    clerkId: authUser.id,
                    email: authUser.email!,
                    role,
                },
                select: { id: true, email: true, organizationMemberId: true }
            })
            console.log(`[Onboarding] Created new DB user ${dbUser.id} for ${authUser.email} (role: ${role})`)
        }

        const formData = await request.formData()
        const role = formData.get('role') as string
        const name = toTitleCase((formData.get('name') as string) || '')
        const imageFile = formData.get('image') as File | null

        if (!name) {
            return apiError('Name is required', 400)
        }

        // ─── UPLOAD PROFILE IMAGE TO SUPABASE ───
        let profileImageUrl: string | undefined = undefined
        if (imageFile && imageFile.size > 0) {
            const url = await uploadAvatar(dbUser.id, imageFile)
            if (url) {
                // Add explicit cache bust query string to match club logic and force client refresh
                profileImageUrl = `${url}?t=${Date.now()}`
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
            const country = (formData.get('country') as string) || undefined

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
                    country,
                    ...(profileImageUrl && { imageUrl: profileImageUrl })
                }
            })

        } else if (role === 'CLUB_MASTER') {
            const clubName = toTitleCase(formData.get('clubName') as string)
            const organizationId = formData.get('organizationId') as string
            const country = (formData.get('country') as string) || undefined
            const clubLogoFile = formData.get('clubLogo') as File | null
            const clubAddress = (formData.get('clubAddress') as string) || undefined
            const clubPhone = (formData.get('clubPhone') as string) || undefined
            const belt = (formData.get('belt') as string) || undefined
            const gender = (formData.get('gender') as string) || undefined

            if (!clubName || !organizationId) {
                return apiError('Club name and organization affiliation are required', 400)
            }

            // Update owner profile
            await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                    name,
                    clubName,
                    country,
                    belt,
                    gender,
                    ...(profileImageUrl && { imageUrl: profileImageUrl })
                }
            })

            // Upload club logo if provided 
            let clubLogoUrl: string | undefined = undefined
            // We use the dbUser.id as a prefix/unique ID for the club logo, since the club doesn't have an ID yet 
            // Wait, we can generate a random string, or just create the club first then upload.
            // Let's create the club first, then upload the logo, then update the club.
            const club = await prisma.club.create({
                data: {
                    name: clubName,
                    masterId: dbUser.id,
                    organizationId,
                    address: clubAddress,
                    phone: clubPhone,
                    status: 'PENDING'
                }
            })

            if (clubLogoFile && clubLogoFile.size > 0) {
                const url = await uploadLogo(`club-${club.id}`, clubLogoFile)
                if (url) {
                    clubLogoUrl = `${url}?t=${Date.now()}`
                    await prisma.club.update({
                        where: { id: club.id },
                        data: { logoUrl: clubLogoUrl }
                    })
                }
            }

            // Create ClubAffiliation with proof if provided during onboarding
            const proofImageFile = formData.get('proofImage') as File | null
            if (proofImageFile && proofImageFile.size > 0) {
                // Create affiliation record first
                const affiliation = await prisma.clubAffiliation.create({
                    data: {
                        clubId: club.id,
                        organizationId,
                        status: 'PENDING_REVIEW',
                        paymentStatus: 'PENDING',
                    }
                })

                // Upload proof image
                const { uploadProofOfPayment } = await import('@/lib/supabase-storage')
                const proofUrl = await uploadProofOfPayment(affiliation.id, proofImageFile)
                if (proofUrl) {
                    await prisma.clubAffiliation.update({
                        where: { id: affiliation.id },
                        data: {
                            proofImageUrl: proofUrl,
                            proofSubmittedAt: new Date(),
                        }
                    })
                }
            }

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
                data: {
                    name,
                    ...(profileImageUrl && { imageUrl: profileImageUrl })
                }
            })

            // Create the Organization record, then upload logo
            const org = await prisma.organization.create({
                data: {
                    name: orgName,
                    ownerId: dbUser.id,
                    establishedAt,
                    status: 'PENDING'
                }
            })

            // Upload org logo if provided
            let orgLogoUrl: string | undefined = undefined
            if (orgLogoFile && orgLogoFile.size > 0) {
                const url = await uploadLogo(`org-${org.id}`, orgLogoFile)
                if (url) {
                    orgLogoUrl = `${url}?t=${Date.now()}`
                    await prisma.organization.update({
                        where: { id: org.id },
                        data: { logoUrl: orgLogoUrl }
                    })
                }
            }

        } else {
            // Unknown role — just save name
            await prisma.user.update({
                where: { id: dbUser.id },
                data: {
                    name,
                    ...(profileImageUrl && { imageUrl: profileImageUrl })
                }
            })
        }

        // ─── BACKFILL organizationMemberId FOR ORG DOMAIN SIGN-UPS ───
        if (!dbUser.organizationMemberId) {
            const headersList = request.headers
            const orgSlug = headersList.get('x-org-slug')

            if (orgSlug && orgSlug !== 'ktm') {
                const org = await prisma.organization.findFirst({
                    where: {
                        OR: [
                            { slug: orgSlug },
                            { customDomain: orgSlug },
                        ]
                    },
                    select: { id: true }
                })

                if (org) {
                    await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { organizationMemberId: org.id }
                    })
                    console.log(`[Onboarding] Set organizationMemberId=${org.id} for user ${dbUser.id} (${dbUser.email})`)
                }
            }
        }

        // Role and profile status stored in DB — no Clerk metadata sync needed

        return apiResponse({ success: true, message: 'Profile completed' })

    } catch (error: any) {
        console.error('Onboarding complete error:', error)
        return apiError(error.message || 'Failed to complete profile', 500)
    }
}
