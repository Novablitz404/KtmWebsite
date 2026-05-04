'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthUser } from '@/lib/supabase/server'
import { toTitleCase } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'
import { getNextBelt } from '@/lib/belt'
import { countryToCode } from '@/lib/countries'
import crypto from 'crypto'
import { encrypt } from '@/lib/encryption'

export async function getOrganizationDashboardData() {
    const user = await getAuthUser()
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
            organization: {
                include: {
                    affiliatedOrganizations: {
                        where: { parentOrganizationStatus: 'APPROVED' }
                    }
                }
            }
        }
    })

    if (!dbUser || !dbUser.organization) {
        return null
    }
    const orgId = dbUser.organization.id

    // Optimize: Fetch Clubs and associated stats in parallel
    const [affiliatedClubs, affiliatedOrgsMemberCounts, clubMemberCounts] = await Promise.all([
        // 1. Fetch Affiliated Clubs
        prisma.club.findMany({
            where: { organizationId: orgId },
            include: {
                students: true,
                master: true,
                affiliations: {
                    where: { organizationId: orgId },
                    take: 1,
                    orderBy: { createdAt: 'desc' as const }
                }
            }
        }),

        // 2. Calculate Affiliated Orgs Stats (Parallel mapped)
        Promise.all(
            dbUser.organization.affiliatedOrganizations.map(async (org) => {
                const orgClubs = await prisma.club.findMany({
                    where: { organizationId: org.id },
                    select: { name: true } // Only need names for lookup
                })

                // Count Users (Athletes) for these clubs
                const clubNames = orgClubs.map(c => c.name)
                const count = await prisma.user.count({
                    where: {
                        clubName: { in: clubNames },
                        role: 'ATHLETE'
                    }
                })

                return { orgId: org.id, count, clubsCount: orgClubs.length }
            })
        ),

        // 3. Count Members (Users) per Club
        // We group by clubName to get counts directly from the User table
        prisma.user.groupBy({
            by: ['clubName'],
            where: {
                // We'd ideally filter by clubName in [list of club names], but fetching all is fine for now or we extract names
                role: 'ATHLETE'
            },
            _count: {
                _all: true
            }
        })
    ])

    // Create a map for quick lookup: ClubName -> Count
    const memberCountMap = new Map<string, number>()
    clubMemberCounts.forEach(c => {
        if (c.clubName) memberCountMap.set(c.clubName, c._count._all)
    })

    // Fetch Recent Members (Independent query but relies on clubIds, which we just got)
    // We could have fetched ALL students in query #1 but we wanted pagination/limit.
    // So this must happen after finding clubs.
    const clubIds = affiliatedClubs.map(c => c.id)
    const recentMembers = await prisma.player.findMany({
        where: { clubId: { in: clubIds } },
        take: 5,
        include: {
            club: true,
            user: { select: { email: true, name: true, belt: true } },
            category: { select: { name: true, tournament: { select: { name: true } } } }
        }
    })

    // Fetch Affiliated Organizations (already in memory from user query)
    const affiliatedOrgs = dbUser.organization.affiliatedOrganizations

    // Calculate Top Performing Clubs (CPU bound, fast)
    const topClubs = affiliatedClubs
        .map(club => ({
            id: club.id,
            name: club.name,
            logoUrl: club.logoUrl,
            memberCount: memberCountMap.get(club.name) || 0,
            masterName: club.master?.name || "Unknown",
            masterEmail: club.master?.email
        }))
        .sort((a, b) => b.memberCount - a.memberCount)
        .slice(0, 5)


    // Calculate Stats — count all members of this org (all roles)
    const totalDirectMembers = await prisma.user.count({
        where: { organizationMemberId: orgId }
    })
    const totalAffiliatedMembers = affiliatedOrgsMemberCounts.reduce((acc, item) => acc + item.count, 0)

    const affiliatedOrgsWithStats = affiliatedOrgs.map(org => {
        const stats = affiliatedOrgsMemberCounts.find(s => s.orgId === org.id)
        return {
            ...org,
            memberCount: stats?.count || 0,
            clubCount: stats?.clubsCount || 0
        }
    })

    return {
        organization: dbUser.organization,
        stats: {
            totalMembers: totalDirectMembers + totalAffiliatedMembers,
            directClubsCount: affiliatedClubs.length,
            affiliatedOrgsCount: affiliatedOrgs.length,
            totalDirectMembers,
            totalAffiliatedMembers
        },
        topClubs,
        allClubs: affiliatedClubs.map(c => ({
            id: c.id,
            name: c.name,
            logoUrl: c.logoUrl,
            masterName: c.master?.name || "Unknown",
            masterEmail: c.master?.email || null,
            masterImageUrl: c.master?.imageUrl || null,
            masterBelt: c.master?.belt || null,
            masterGender: c.master?.gender || null,
            masterCountry: c.master?.country || null,
            memberCount: memberCountMap.get(c.name) || 0,
            contactPhone: c.phone,
            address: c.address,
            status: c.status,
            affiliationStatus: (c as any).affiliations?.[0]?.status || 'UNPAID',
            affiliationExpiresAt: (c as any).affiliations?.[0]?.expiresAt || null,
            affiliationPaidAt: (c as any).affiliations?.[0]?.paidAt || null,
            affiliationProofImageUrl: (c as any).affiliations?.[0]?.proofImageUrl || null,
            affiliationId: (c as any).affiliations?.[0]?.id || null,
        })),
        affiliatedOrgs: affiliatedOrgsWithStats,
        recentMembers,
        announcements: await getOrganizationAnnouncements(orgId, 5),
        promotionTests: await getOrganizationPromotionTests(orgId, 5),
        seminars: await getOrganizationSeminars(orgId, 5),
        guidelineTemplates: await prisma.guidelineTemplate.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
    }
}

export async function getOrganizationAnnouncements(orgId: string, limit = 10) {
    const now = new Date()
    return prisma.announcement.findMany({
        where: {
            organizationId: orgId,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } }
            ]
        },
        orderBy: { createdAt: 'desc' },
        take: limit
    })
}

export async function createAnnouncement(formData: FormData) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    const title = formData.get('title') as string
    const content = formData.get('content') as string
    const priority = (formData.get('priority') as string) || 'NORMAL'
    const expiresAtStr = formData.get('expiresAt') as string

    if (!title || !content) return { error: 'Title and content are required' }

    const announcement = await prisma.announcement.create({
        data: {
            organizationId: dbUser.organization.id,
            title,
            content,
            priority,
            expiresAt: expiresAtStr ? new Date(expiresAtStr) : null
        }
    })

    return { success: true, announcement }
}

export async function deleteAnnouncement(announcementId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    // Verify announcement belongs to this organization
    const announcement = await prisma.announcement.findUnique({
        where: { id: announcementId }
    })

    if (!announcement || announcement.organizationId !== dbUser.organization.id) {
        return { error: 'Announcement not found or unauthorized' }
    }

    await prisma.announcement.delete({ where: { id: announcementId } })

    return { success: true }
}

// ============================================
// PROMOTION TEST ACTIONS
// ============================================

export async function getOrganizationPromotionTests(orgId: string, limit = 10) {
    return prisma.promotionTest.findMany({
        where: { organizationId: orgId },
        orderBy: { testDate: 'desc' },
        take: limit,
        include: {
            _count: { select: { registrations: true } }
        }
    })
}

export async function createPromotionTest(formData: FormData) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const testDate = formData.get('testDate') as string
    const registrationDeadline = formData.get('registrationDeadline') as string
    const venue = formData.get('venue') as string
    const visibility = (formData.get('visibility') as string) || 'PRIVATE'

    // Xendit Payment Integration
    const xenditEnabled = formData.get('xenditEnabled') === 'true'
    const xenditSecretKeyRaw = formData.get('xenditSecretKey') as string | null
    const xenditSecretKey = xenditEnabled && xenditSecretKeyRaw ? encrypt(xenditSecretKeyRaw) : null

    if (!name || !testDate) return { error: 'Name and test date are required' }

    const promotionTest = await prisma.promotionTest.create({
        data: {
            organizationId: dbUser.organization.id,
            name,
            description: description || null,
            testDate: new Date(testDate),
            registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
            venue: venue || null,
            status: 'UPCOMING',
            visibility,
            xenditEnabled,
            xenditSecretKey,
        }
    })

    return { success: true, promotionTest }
}

export async function updatePromotionTest(formData: FormData) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    const promotionTestId = formData.get('promotionTestId') as string
    if (!promotionTestId) return { error: 'Promotion Test ID is required' }

    const promotionTest = await prisma.promotionTest.findUnique({
        where: { id: promotionTestId }
    })

    if (!promotionTest || promotionTest.organizationId !== dbUser.organization.id) {
        return { error: 'Promotion test not found or unauthorized' }
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const testDate = formData.get('testDate') as string
    const registrationDeadline = formData.get('registrationDeadline') as string
    const venue = formData.get('venue') as string

    if (!name || !testDate) return { error: 'Name and test date are required' }

    await prisma.promotionTest.update({
        where: { id: promotionTestId },
        data: {
            name,
            description: description || null,
            testDate: new Date(testDate),
            registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
            venue: venue || null,
        }
    })

    revalidatePath('/organization')
    revalidatePath(`/promotions/${promotionTestId}`)
    return { success: true }
}

export async function updatePromotionTestStatus(promotionTestId: string, status: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    const promotionTest = await prisma.promotionTest.findUnique({
        where: { id: promotionTestId }
    })

    if (!promotionTest || promotionTest.organizationId !== dbUser.organization.id) {
        return { error: 'Promotion test not found or unauthorized' }
    }

    await prisma.promotionTest.update({
        where: { id: promotionTestId },
        data: { status }
    })

    return { success: true }
}

export async function deletePromotionTest(promotionTestId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    // Allow Admins to proceed even without an organization
    if (dbUser?.role !== 'ADMIN' && !dbUser?.organization) {
        return { error: 'No organization found' }
    }

    const promotionTest = await prisma.promotionTest.findUnique({
        where: { id: promotionTestId }
    })

    if (!promotionTest) return { error: 'Promotion test not found' }

    // Authorization: Owner OR Admin
    if (dbUser?.role !== 'ADMIN') {
        if (!dbUser?.organization || promotionTest.organizationId !== dbUser.organization.id) {
            return { error: 'Unauthorized' }
        }
    }

    await prisma.promotionTest.delete({ where: { id: promotionTestId } })

    revalidatePath('/organization')
    revalidatePath('/admin')
    return { success: true }
}

// ============================================
// SEMINAR ACTIONS
// ============================================

export async function getOrganizationSeminars(orgId: string, limit = 10) {
    return prisma.seminar.findMany({
        where: { organizationId: orgId },
        orderBy: { startDate: 'desc' },
        take: limit,
        include: {
            _count: { select: { registrations: true } }
        }
    })
}

export async function createSeminar(formData: FormData) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string // Optional
    const registrationDeadline = formData.get('registrationDeadline') as string
    const venue = formData.get('venue') as string
    const feeStr = formData.get('fee') as string
    const visibility = (formData.get('visibility') as string) || 'PRIVATE'
    const paymentInstructions = formData.get('paymentInstructions') as string

    // Xendit Payment Integration
    const xenditEnabled = formData.get('xenditEnabled') === 'true'
    const xenditSecretKeyRaw = formData.get('xenditSecretKey') as string | null
    const xenditSecretKey = xenditEnabled && xenditSecretKeyRaw ? encrypt(xenditSecretKeyRaw) : null

    const bannerFile = formData.get('banner') as File | null

    if (!name || !startDate) return { error: 'Name and start date are required' }

    // Handle Banner Image upload
    let bannerUrl: string | null = null
    if (bannerFile && bannerFile.size > 0) {
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            const bytes = await bannerFile.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Generate unique filename
            const timestamp = Date.now()
            const safeName = bannerFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `seminar-banner-${timestamp}-${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, buffer, {
                    contentType: bannerFile.type,
                    upsert: false
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filename)

            bannerUrl = publicUrl
        } catch (error) {
            console.error('Banner image upload error:', error)
            return { error: 'Failed to upload Banner Image' }
        }
    }

    const seminar = await prisma.seminar.create({
        data: {
            organizationId: dbUser.organization.id,
            name,
            description: description || null,
            startDate: new Date(startDate),
            endDate: endDate ? new Date(endDate) : null,
            registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
            venue: venue || null,
            fee: feeStr ? parseFloat(feeStr) : null,
            status: 'UPCOMING',
            visibility,
            paymentInstructions: paymentInstructions || null,
            bannerUrl,
            xenditEnabled,
            xenditSecretKey,
        }
    })

    revalidatePath('/organization')
    return { success: true, seminar }
}

export async function updateSeminarStatus(seminarId: string, status: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    const seminar = await prisma.seminar.findUnique({
        where: { id: seminarId }
    })

    if (!seminar || seminar.organizationId !== dbUser.organization.id) {
        return { error: 'Seminar not found or unauthorized' }
    }

    await prisma.seminar.update({
        where: { id: seminarId },
        data: { status }
    })

    return { success: true }
}

export async function deleteSeminar(seminarId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    // Allow Admins to proceed even without an organization
    if (dbUser?.role !== 'ADMIN' && !dbUser?.organization) {
        return { error: 'No organization found' }
    }

    const seminar = await prisma.seminar.findUnique({
        where: { id: seminarId }
    })

    if (!seminar) return { error: 'Seminar not found' }

    // Authorization: Owner OR Admin
    if (dbUser?.role !== 'ADMIN') {
        if (!dbUser?.organization || seminar.organizationId !== dbUser.organization.id) {
            return { error: 'Unauthorized' }
        }
    }

    await prisma.seminar.delete({ where: { id: seminarId } })

    revalidatePath('/organization')
    revalidatePath('/admin')
    return { success: true }
}

export async function updateSeminar(formData: FormData) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    const seminarId = formData.get('seminarId') as string
    if (!seminarId) return { error: 'Seminar ID is required' }

    const seminar = await prisma.seminar.findUnique({
        where: { id: seminarId }
    })

    if (!seminar || seminar.organizationId !== dbUser.organization.id) {
        return { error: 'Seminar not found or unauthorized' }
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const registrationDeadline = formData.get('registrationDeadline') as string
    const venue = formData.get('venue') as string
    const feeStr = formData.get('fee') as string
    const visibility = (formData.get('visibility') as string) || 'PRIVATE'
    const paymentInstructions = formData.get('paymentInstructions') as string
    const bannerFile = formData.get('banner') as File | null

    const paymentMethodsJson = formData.get('paymentMethods') as string

    if (!name || !startDate) return { error: 'Name and start date are required' }

    // Check if banner should be removed
    const removeBanner = formData.get('removeBanner') === 'true'

    let bannerUrl = removeBanner ? null : seminar.bannerUrl
    if (!removeBanner && bannerFile && bannerFile.size > 0) {
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            const bytes = await bannerFile.arrayBuffer()
            const buffer = Buffer.from(bytes)
            const timestamp = Date.now()
            const safeName = bannerFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `seminar-banner-${timestamp}-${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, buffer, { contentType: bannerFile.type, upsert: false })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filename)

            bannerUrl = publicUrl
        } catch (error) {
            console.error('Banner upload error:', error)
            return { error: 'Failed to upload Banner Image' }
        }
    }

    // Process Payment Methods
    const paymentMethodsData: {
        type: string
        name: string
        accountName: string
        accountNumber: string
        qrCodeUrl: string | null
    }[] = []
    if (paymentMethodsJson) {
        const rawMethods = JSON.parse(paymentMethodsJson)
        for (const pm of rawMethods) {
            let qrCodeUrl = pm.existingQrCodeUrl || null
            const qrKey = `qrCode_${pm.id}`
            const qrFile = formData.get(qrKey) as File | null

            console.log(`[updateSeminar] Processing method ${pm.id}, Key: ${qrKey}, File: ${qrFile ? `${qrFile.name} (${qrFile.size} bytes)` : 'null'}`)

            if (qrFile && qrFile.size > 0) {
                try {
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    )
                    const bytes = await qrFile.arrayBuffer()
                    const buffer = Buffer.from(bytes)
                    const timestamp = Date.now()
                    const safeName = qrFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                    const filename = `payment-qr-${timestamp}-${safeName}`

                    const { error: uploadError } = await supabase.storage
                        .from('qr-codes')
                        .upload(filename, buffer, { contentType: qrFile.type, upsert: false })

                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('qr-codes')
                            .getPublicUrl(filename)
                        qrCodeUrl = publicUrl
                    }
                } catch (e) {
                    console.error('QR Upload Error', e)
                }
            }

            paymentMethodsData.push({
                type: pm.type,
                name: pm.name,
                accountName: pm.accountName,
                accountNumber: pm.accountNumber,
                qrCodeUrl
            })
        }
    }

    // Use transaction to update seminar and replace payment methods
    await prisma.$transaction(async (tx) => {
        await tx.paymentMethod.deleteMany({ where: { seminarId } })

        await tx.seminar.update({
            where: { id: seminarId },
            data: {
                name,
                description: description || null,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
                venue: venue || null,
                fee: feeStr ? parseFloat(feeStr) : null,
                visibility,
                paymentInstructions: paymentInstructions || null,
                bannerUrl,
                paymentMethods: {
                    create: paymentMethodsData
                }
            }
        })
    })





    revalidatePath('/organization')
    revalidatePath(`/seminars/${seminarId}`)
    return { success: true }
}
export async function fetchSeminarRegistrations(
    seminarId: string,
    page: number = 1,
    limit: number = 10,
    search: string = ''
) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized', registrations: [], total: 0, totalPages: 0 }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    // Verify permission (Organization Owner of the seminar OR Admin)
    const seminar = await prisma.seminar.findUnique({
        where: { id: seminarId },
        select: { organizationId: true }
    })

    if (!seminar) return { error: 'Seminar not found', registrations: [], total: 0, totalPages: 0 }

    const isAdmin = dbUser?.role === 'ADMIN'
    const isOwner = dbUser?.organization?.id === seminar.organizationId

    if (!isAdmin && !isOwner) {
        return { error: 'Unauthorized', registrations: [], total: 0, totalPages: 0 }
    }

    const where: any = {
        seminarId,
        ...(search ? {
            OR: [
                { playerName: { contains: search, mode: 'insensitive' } },
                { clubName: { contains: search, mode: 'insensitive' } }
            ]
        } : {})
    }

    const [total, registrations] = await Promise.all([
        prisma.seminarRegistration.count({ where }),
        prisma.seminarRegistration.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit
        })
    ])

    // Manually fetch user images since there's no FK relation
    const playerIds = registrations.map(r => r.playerId).filter(Boolean) as string[]
    const users = await prisma.user.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, imageUrl: true }
    })

    const registrationsWithUser = registrations.map(r => {
        const user = users.find(u => u.id === r.playerId)
        return { ...r, user: user ? { imageUrl: user.imageUrl } : null }
    })

    return {
        registrations: registrationsWithUser,
        total,
        totalPages: Math.ceil(total / limit)
    }
}

export async function updateSeminarRegistrationStatus(registrationId: string, status?: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    // Verify permission (Organization Owner of the seminar)
    const registration = await prisma.seminarRegistration.findUnique({
        where: { id: registrationId },
        include: { seminar: true }
    })

    if (!registration) return { error: 'Registration not found' }

    const isAdmin = dbUser?.role === 'ADMIN'
    const isOwner = dbUser?.organization?.id === registration.seminar.organizationId

    if (!isAdmin && !isOwner) {
        return { error: 'Unauthorized' }
    }

    const data: any = {}
    if (status) {
        data.status = status
        // Auto-generate QR token on approval, clear on other statuses
        if (status === 'APPROVED') {
            data.qrCodeToken = crypto.randomUUID()
            // Auto-set payment to PAID for manual (non-Xendit) events
            if (!registration.seminar.xenditEnabled) {
                data.paymentStatus = 'PAID'
            }
        } else {
            data.qrCodeToken = null
        }
    }

    await prisma.seminarRegistration.update({
        where: { id: registrationId },
        data
    })

    revalidatePath(`/seminars/${registration.seminarId}`)
    return { success: true }
}

export async function deleteSeminarRegistration(registrationId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    const registration = await prisma.seminarRegistration.findUnique({
        where: { id: registrationId },
        include: { seminar: true }
    })

    if (!registration) return { error: 'Registration not found' }

    const isAdmin = dbUser?.role === 'ADMIN'
    const isOwner = dbUser?.organization?.id === registration.seminar.organizationId

    if (!isAdmin && !isOwner) {
        return { error: 'Unauthorized' }
    }

    await prisma.seminarRegistration.delete({
        where: { id: registrationId }
    })

    revalidatePath(`/seminars/${registration.seminarId}`)
    return { success: true }
}

// ============================================
// ORGANIZATION SETTINGS ACTIONS
// ============================================

export async function updateOrganizationSettings(formData: FormData) {
    try {
        const organizationId = formData.get('organizationId') as string
        const name = formData.get('name') as string
        const logoFile = formData.get('logo') as File | null
        const bannerFile = formData.get('emailBanner') as File | null
        const address = formData.get('address') as string | null
        const phone = formData.get('phone') as string | null
        const email = formData.get('email') as string | null
        const chairman = formData.get('chairman') as string | null
        const viceChairman = formData.get('viceChairman') as string | null
        const website = formData.get('website') as string | null
        const athleteCardFeeStr = formData.get('athleteCardFee') as string | null
        const athleteCardPaymentInstructions = formData.get('athleteCardPaymentInstructions') as string | null

        if (!organizationId) return { error: 'Organization ID is required' }
        if (!name) return { error: 'Organization Name is required' }

        const user = await getAuthUser()
        if (!user) return { error: 'Unauthorized' }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { organization: true }
        })

        if (!dbUser?.organization) {
            return { error: 'No organization found' }
        }

        // Verify ownership (or admin status if we had that granularity, for now Owner only)
        if (dbUser.organization.ownerId !== dbUser.id && dbUser.role !== 'ADMIN') {
            return { error: 'Only the Organization Owner can edit settings' }
        }

        // Double check ID
        if (dbUser.organization.id !== organizationId) {
            return { error: 'Organization ID mismatch' }
        }

        const updateData: any = {
            name,
        }

        if (address !== null) updateData.address = address
        if (phone !== null) updateData.contactPhone = phone
        if (email !== null) updateData.contactEmail = email
        if (chairman !== null) updateData.chairman = chairman
        if (viceChairman !== null) updateData.viceChairman = viceChairman
        if (website !== null) updateData.website = website
        if (athleteCardFeeStr !== null && athleteCardFeeStr.trim() !== '') {
            updateData.athleteCardFee = parseFloat(athleteCardFeeStr)
        } else if (athleteCardFeeStr === '') {
            updateData.athleteCardFee = null
        }
        if (athleteCardPaymentInstructions !== null) updateData.athleteCardPaymentInstructions = athleteCardPaymentInstructions

        // Handle default belt fees
        const whiteToPurpleFeeStr = formData.get('whiteToPurpleFee') as string
        const blueToMaroonFeeStr = formData.get('blueToMaroonFee') as string
        const brownFeeStr = formData.get('brownFee') as string

        if (whiteToPurpleFeeStr || blueToMaroonFeeStr || brownFeeStr) {
            updateData.defaultBeltFees = {
                whiteToPurple: whiteToPurpleFeeStr ? parseFloat(whiteToPurpleFeeStr) : null,
                blueToMaroon: blueToMaroonFeeStr ? parseFloat(blueToMaroonFeeStr) : null,
                brown: brownFeeStr ? parseFloat(brownFeeStr) : null
            }
        }

        // Handle Logo Upload
        if (logoFile && logoFile.size > 0) {
            // Validate file type (image only)
            if (!logoFile.type.startsWith('image/')) {
                return { error: 'File must be an image' }
            }
            // Validate size (e.g., 5MB)
            if (logoFile.size > 5 * 1024 * 1024) {
                return { error: 'Image size must be less than 5MB' }
            }

            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            const bytes = await logoFile.arrayBuffer()
            const buffer = Buffer.from(bytes)

            // Unique filename: org-logo-{orgId}-{timestamp}-{cleanName}
            const timestamp = Date.now()
            const safeName = logoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `org-logo-${organizationId}-${timestamp}-${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, buffer, {
                    contentType: logoFile.type,
                    upsert: false
                })

            if (uploadError) {
                console.error('Supabase upload error:', uploadError)
                return { error: 'Failed to upload image' }
            }

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filename)

            updateData.logoUrl = publicUrl
        }

        // Handle Banner Upload
        if (bannerFile && bannerFile.size > 0) {
            if (!bannerFile.type.startsWith('image/')) {
                return { error: 'Banner must be an image' }
            }
            if (bannerFile.size > 5 * 1024 * 1024) {
                return { error: 'Banner size must be less than 5MB' }
            }

            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            )

            const bytes = await bannerFile.arrayBuffer()
            const buffer = Buffer.from(bytes)

            const timestamp = Date.now()
            const safeName = bannerFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
            const filename = `org-banner-${organizationId}-${timestamp}-${safeName}`

            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, buffer, {
                    contentType: bannerFile.type,
                    upsert: false
                })

            if (uploadError) {
                console.error('Supabase banner upload error:', uploadError)
                return { error: 'Failed to upload banner image' }
            }

            const { data: { publicUrl } } = supabase.storage
                .from('uploads')
                .getPublicUrl(filename)

            updateData.emailBannerUrl = publicUrl
        }

        await prisma.organization.update({
            where: { id: organizationId },
            data: updateData
        })

        // Revalidate relevant paths
        revalidatePath('/organization')
        return { success: true }

    } catch (error) {
        console.error('Update Organization Settings Error:', error)
        return { error: 'Failed to update settings' }
    }
}

// ============================================
// CLUB APPROVAL ACTIONS
// ============================================

// Helper to check permissions
async function checkOrgPermission(organizationId: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser) throw new Error('User not found')

    // Check if user is the owner of the organization
    // OR if we implement managers for orgs later. For now, Owner only.
    // We need to fetch the organization to see if this user is the owner
    const organization = await prisma.organization.findUnique({
        where: { id: organizationId }
    })

    if (!organization) throw new Error('Organization not found')

    if (organization.ownerId !== dbUser.id) {
        // Also check if user is a System Admin if you have that role
        if (dbUser.role !== 'ADMIN') {
            throw new Error('Unauthorized')
        }
    }

    return true
}

export async function approveClub(clubId: string) {
    // We need to find the specific club first to get its organization ID for permission check
    const club = await prisma.club.findUnique({ where: { id: clubId } })
    if (!club) throw new Error('Club not found')
    if (!club.organizationId) throw new Error('Club is not associated with an organization')

    await checkOrgPermission(club.organizationId)

    await prisma.club.update({
        where: { id: clubId },
        data: { status: 'APPROVED' }
    })

    revalidatePath('/')
    revalidatePath('/organization')
}

export async function rejectClub(clubId: string) {
    const club = await prisma.club.findUnique({ where: { id: clubId } })
    if (!club) throw new Error('Club not found')
    if (!club.organizationId) throw new Error('Club is not associated with an organization')

    await checkOrgPermission(club.organizationId)

    // For rejection, we set status to REJECTED. 
    await prisma.club.update({
        where: { id: clubId },
        data: { status: 'REJECTED' }
    })

    revalidatePath('/')
    revalidatePath('/organization')
}

// ============================================
// MIGRATED FROM organizer-tournaments
// ============================================

export async function getOrganizationStats() {
    const user = await getAuthUser()
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
            organization: {
                include: {
                    clubs: {
                        include: { students: true }
                    },
                    affiliatedOrganizations: {
                        include: {
                            clubs: {
                                include: { students: true }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!dbUser || !dbUser.organization) return null

    const org = dbUser.organization

    // Direct Clubs
    const directClubsCount = org.clubs.length
    const directMembersCount = org.clubs.reduce((acc: number, club: any) => acc + club.students.length, 0)

    // Affiliated Orgs
    const affiliatedOrgsCount = org.affiliatedOrganizations.length

    // Members from Affiliated Orgs (assuming 1 level depth for now)
    const affiliatedMembersCount = org.affiliatedOrganizations.reduce((acc: number, affOrg: any) => {
        return acc + affOrg.clubs.reduce((cAcc: number, club: any) => cAcc + club.students.length, 0)
    }, 0)

    return {
        totalMembers: directMembersCount + affiliatedMembersCount,
        directClubs: directClubsCount,
        affiliatedOrgs: affiliatedOrgsCount,
        directMembers: directMembersCount,
        affiliatedMembers: affiliatedMembersCount
    }
}

export async function getOrganizerTournaments() {
    const user = await getAuthUser()
    const dbUser = user ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, role: true }
    }) : null

    // If no user or not an organizer, return null
    if (!dbUser || (dbUser.role !== 'ORGANIZER' && dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
        return null
    }

    // Optimized: Use _count instead of fetching all players
    const tournaments = await prisma.tournament.findMany({
        orderBy: { startDate: 'desc' },
        where: {
            OR: [
                { organizerId: dbUser.id },
                { managers: { some: { id: dbUser.id } } }
            ]
        },
        select: {
            id: true,
            name: true,
            startDate: true,
            venue: true,
            status: true,
            tier: true,
            headerImageUrl: true,
            registrationStart: true,
            registrationEnd: true,
            earlyBirdDeadline: true,
            earlyBirdPrice: true,
            regularPrice: true,
            guidelineTemplate: {
                select: { name: true }
            },
            _count: {
                select: {
                    categories: true
                }
            },
            categories: {
                select: {
                    _count: {
                        select: { players: true }
                    }
                }
            }
        }
    })

    return tournaments
}

// ============================================
// ORGANIZATION AFFILIATION ACTIONS
// ============================================

export async function searchOrganizations(query: string) {
    if (!query || query.length < 2) return []

    const orgs = await prisma.organization.findMany({
        where: {
            name: {
                contains: query,
                mode: 'insensitive'
            },
            status: 'APPROVED' // Only find valid organizations
        },
        select: {
            id: true,
            name: true,
            logoUrl: true,
            chairman: true
        },
        take: 5
    })

    return orgs
}

export async function requestAffiliation(parentOrgId: string) {
    const user = await getAuthUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { organization: true }
        })

        if (!dbUser?.organization) {
            return { success: false, error: "Organization not found" }
        }

        // Prevent self-affiliation
        if (dbUser.organization.id === parentOrgId) {
            return { success: false, error: "Cannot affiliate with yourself" }
        }

        await prisma.organization.update({
            where: { id: dbUser.organization.id },
            data: {
                parentOrganizationId: parentOrgId,
                parentOrganizationStatus: "PENDING"
            }
        })

        revalidatePath('/organization')
        return { success: true }
    } catch (error) {
        console.error("Error requesting affiliation:", error)
        return { success: false, error: "Failed to request affiliation" }
    }
}

export async function getAffiliationRequests() {
    const user = await getAuthUser()
    if (!user) return []

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return []

    const requests = await prisma.organization.findMany({
        where: {
            parentOrganizationId: dbUser.organization.id,
            parentOrganizationStatus: "PENDING"
        },
        include: {
            owner: { select: { name: true, email: true } }
        }
    })

    return requests
}

export async function approveAffiliation(childOrgId: string) {
    // Check permission first
    const user = await getAuthUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { success: false, error: "Organization not found" }

    // Verify the child org is actually requesting to join THIS org
    const childOrg = await prisma.organization.findUnique({
        where: { id: childOrgId }
    })

    if (childOrg?.parentOrganizationId !== dbUser.organization.id) {
        return { success: false, error: "Invalid request" }
    }

    try {
        await prisma.organization.update({
            where: { id: childOrgId },
            data: {
                parentOrganizationStatus: "APPROVED"
            }
        })

        revalidatePath('/organization')
        return { success: true }
    } catch (error) {
        console.error("Error approving affiliation:", error)
        return { success: false, error: "Failed to approve affiliation" }
    }
}

export async function rejectAffiliation(childOrgId: string) {
    // Check permission first
    const user = await getAuthUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { success: false, error: "Organization not found" }

    // Verify the child org is actually requesting to join THIS org
    const childOrg = await prisma.organization.findUnique({
        where: { id: childOrgId }
    })

    if (childOrg?.parentOrganizationId !== dbUser.organization.id) {
        return { success: false, error: "Invalid request" }
    }

    try {
        await prisma.organization.update({
            where: { id: childOrgId },
            data: {
                parentOrganizationId: null,
                parentOrganizationStatus: null // Reset completely so they can request again if needed
            }
        })

        revalidatePath('/organization')
        return { success: true }
    } catch (error) {
        console.error("Error rejecting affiliation:", error)
        return { success: false, error: "Failed to reject affiliation" }
    }
}

// ============================================
// CO-ORGANIZER MANAGEMENT ACTIONS
// ============================================

// Helper to check if user is owner or co-organizer of an organization
async function getOrganizationAccess(userId: string, orgId: string) {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
            id: true,
            ownerId: true,
            coOrganizers: { select: { id: true } }
        }
    })

    if (!org) return null

    const isOwner = org.ownerId === userId
    const isCoOrganizer = org.coOrganizers.some(co => co.id === userId)

    return { org, isOwner, isCoOrganizer, hasAccess: isOwner || isCoOrganizer }
}

// Get organization co-organizers and pending invites
export async function getOrganizationCoOrganizers(orgId: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) throw new Error('User not found')

    const access = await getOrganizationAccess(dbUser.id, orgId)
    if (!access?.hasAccess) throw new Error('You do not have access to this organization')

    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            owner: { select: { id: true, name: true, email: true } },
            coOrganizers: { select: { id: true, name: true, email: true, role: true } },
            coOrganizerInvites: { select: { id: true, email: true, createdAt: true } }
        }
    })

    const orgDetails = access.org as any

    return {
        owner: orgDetails?.owner,
        coOrganizers: orgDetails?.coOrganizers || [],
        pendingInvites: orgDetails?.coOrganizerInvites || [],
        isOwner: access.isOwner
    }
}

import { sendEmail } from '@/lib/email-service'
import InviteEmail from '@/emails/InviteEmail'
import React from 'react'

// Invite a co-organizer (owner only)
export async function inviteCoOrganizer(orgId: string, email: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) throw new Error('User not found')

    const access = await getOrganizationAccess(dbUser.id, orgId)
    if (!access?.isOwner) throw new Error('Only the organization owner can add co-organizers')

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
    })

    if (existingUser) {
        // Check if already a co-organizer
        const isAlreadyCoOrganizer = await prisma.organization.findFirst({
            where: {
                id: orgId,
                coOrganizers: { some: { id: existingUser.id } }
            }
        })

        if (isAlreadyCoOrganizer) {
            return { error: 'This user is already a co-organizer' }
        }

        // Check if they are the owner
        if (access.org.ownerId === existingUser.id) {
            return { error: 'This user is already the owner' }
        }

        // Add existing user as co-organizer
        await prisma.organization.update({
            where: { id: orgId },
            data: {
                coOrganizers: { connect: { id: existingUser.id } }
            }
        })

        revalidatePath('/organization')
        return { success: true, message: `${existingUser.name || existingUser.email} has been added as a co-organizer` }
    }

    // User doesn't exist - create invite
    const existingInvite = await prisma.coOrganizerInvite.findUnique({
        where: { email_organizationId: { email: normalizedEmail, organizationId: orgId } }
    })

    if (existingInvite) {
        return { error: 'An invite has already been sent to this email' }
    }

    const invite = (await prisma.coOrganizerInvite.create({
        data: {
            email: normalizedEmail,
            organizationId: orgId
        }
    })) as any

    // Send the Magic Link Invite via Resend
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ktmsports.com'
    const inviteLink = `${baseUrl}/invite/${invite.token}`

    const orgDetails = access.org as any

    await sendEmail({
        to: normalizedEmail,
        subject: `You have been invited to Co-Organize ${orgDetails.name || 'an Organization'}`,
        reactData: React.createElement(InviteEmail, {
            roleName: 'Co-Organizer',
            organizationName: orgDetails.name || 'Organization',
            inviterName: dbUser.name || '',
            inviteLink
        })
    })

    revalidatePath('/organization')
    return { success: true, message: `Invite sent to ${normalizedEmail}` }
}

// Remove a co-organizer (owner only)
export async function removeCoOrganizer(orgId: string, coOrganizerUserId: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) throw new Error('User not found')

    const access = await getOrganizationAccess(dbUser.id, orgId)
    if (!access?.isOwner) throw new Error('Only the organization owner can remove co-organizers')

    await prisma.organization.update({
        where: { id: orgId },
        data: {
            coOrganizers: { disconnect: { id: coOrganizerUserId } }
        }
    })

    revalidatePath('/organization')
    return { success: true }
}

// Cancel a pending invite (owner only)
export async function cancelCoOrganizerInvite(inviteId: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) throw new Error('User not found')

    const invite = await prisma.coOrganizerInvite.findUnique({
        where: { id: inviteId },
        include: { organization: { select: { ownerId: true } } }
    })

    if (!invite) throw new Error('Invite not found')
    if (invite.organization.ownerId !== dbUser.id) {
        throw new Error('Only the organization owner can cancel invites')
    }

    await prisma.coOrganizerInvite.delete({ where: { id: inviteId } })

    revalidatePath('/organization')
    return { success: true }
}

// Transfer organization ownership to a co-organizer (owner only)
export async function transferOrganizationOwnership(orgId: string, newOwnerId: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) throw new Error('User not found')

    // Verify current user is the owner
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            coOrganizers: { select: { id: true } }
        }
    })

    if (!org) throw new Error('Organization not found')
    if (org.ownerId !== dbUser.id) {
        throw new Error('Only the organization owner can transfer ownership')
    }

    // Verify new owner is a current co-organizer
    const isCoOrganizer = org.coOrganizers.some(co => co.id === newOwnerId)
    if (!isCoOrganizer) {
        throw new Error('New owner must be an existing co-organizer')
    }

    // Perform the swap in a transaction
    await prisma.$transaction([
        // Remove new owner from co-organizers
        prisma.organization.update({
            where: { id: orgId },
            data: {
                coOrganizers: { disconnect: { id: newOwnerId } }
            }
        }),
        // Add old owner to co-organizers
        prisma.organization.update({
            where: { id: orgId },
            data: {
                coOrganizers: { connect: { id: dbUser.id } }
            }
        }),
        // Transfer ownership
        prisma.organization.update({
            where: { id: orgId },
            data: { ownerId: newOwnerId }
        })
    ])

    revalidatePath('/organization')
    return { success: true }
}
// NEW: Parallel Fetcher for Events View
export async function getOrganizationEventsData() {
    const user = await getAuthUser()
    if (!user) return { tournaments: [], promotionTests: [] }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { tournaments: [], promotionTests: [] }
    const orgId = dbUser.organization.id

    const [tournaments, promotionTests, seminars] = await Promise.all([
        getOrganizerTournaments(),
        getOrganizationPromotionTests(orgId, 50),
        getOrganizationSeminars(orgId, 50)
    ])

    return { tournaments, promotionTests, seminars }
}

export async function registerForPromotionTest(promotionTestId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { club: true }
    })

    if (!dbUser) return { error: 'User profile not found' }

    // Check if already registered
    const existing = await prisma.promotionTestRegistration.findFirst({
        where: {
            promotionTestId,
            playerId: dbUser.id // Assuming 1:1 user-player registration for now. If user manages kids, logic differs. But "just click register" implies self-reg.
        }
    })

    if (existing) return { error: 'Already registered' }

    // Calculate Age
    let age = 0
    if (dbUser.birthDate) {
        const today = new Date()
        const birthDate = new Date(dbUser.birthDate)
        age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
    }

    const registration = await prisma.promotionTestRegistration.create({
        data: {
            promotionTestId,
            playerId: dbUser.id,
            playerName: toTitleCase(dbUser.name || 'Unknown'),
            clubName: dbUser.clubName || dbUser.club?.name,
            currentBelt: dbUser.belt || 'White',
            targetBelt: getNextBelt(dbUser.belt || 'White'), // Calculated automatically
            age: age,
            status: 'PENDING',
            paymentStatus: 'UNPAID'
        }
    })

    revalidatePath(`/promotions/${promotionTestId}`)
    return { success: true, registrationId: registration.id }
}

export async function registerForSeminar(seminarId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { club: true }
    })

    if (!dbUser) return { error: 'User profile not found' }

    const existing = await prisma.seminarRegistration.findFirst({
        where: {
            seminarId,
            // We use name/club check if playerId is ambiguous, but safer to use user ID correlation if possible.
            // Since we don't strictly link `User` to `Player` 1:1 in a enforced way for registration uniqueness:
            // I'll assume 1 registration per User Account for now.
            // Wait, schema `playerId` is String? 
            // I'll store `dbUser.id` in `playerId` column if it fits semantics, or leaving it null and rely on name?
            // Only `playerId` is indexed. `playerName` is not unique.
            // Storing `dbUser.id` in `playerId` is good practice if `dbUser.id` represents the person.
            playerId: dbUser.id
        }
    })

    if (existing) return { error: 'Already registered' }

    let age = 0
    if (dbUser.birthDate) {
        const today = new Date()
        const birthDate = new Date(dbUser.birthDate)
        age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
    }

    const registration = await prisma.seminarRegistration.create({
        data: {
            seminarId,
            playerId: dbUser.id,
            playerName: toTitleCase(dbUser.name || 'Unknown'),
            clubName: dbUser.clubName || dbUser.club?.name,
            belt: dbUser.belt || 'White',
            age: age,
            status: 'PENDING'
        }
    })

    revalidatePath(`/seminars/${seminarId}`)
    return { success: true, registrationId: registration.id }
}

// ============================================
// CLUB MEMBER MANAGEMENT (FOR ORGANIZATION)
// ============================================

export async function getClubMembersForOrg(clubId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    // Verify Club belongs to Organization
    const club = await prisma.club.findUnique({
        where: { id: clubId }
    })

    if (!club || club.organizationId !== dbUser.organization.id) {
        return { error: 'Club not found or unauthorized' }
    }

    // Fetch members (Users) of the club
    const members = await prisma.user.findMany({
        where: {
            clubName: club.name,
            role: 'ATHLETE'
        },
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            email: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            birthDate: true,
            imageUrl: true
        }
    })

    return { success: true, members }
}

export async function createMemberForClub(clubId: string, input: {
    name: string
    email?: string
    gender?: string
    belt?: string
    weight?: number
    height?: number
    birthDate?: string
    athleteNumber?: string
}) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) {
        return { error: 'Only organizers can add members to clubs' }
    }

    // Verify club belongs to this org
    const club = await prisma.club.findUnique({ where: { id: clubId } })
    if (!club || club.organizationId !== dbUser.organization.id) {
        return { error: 'Club not found or unauthorized' }
    }

    // Check duplicate email
    if (input.email) {
        const existing = await prisma.user.findUnique({ where: { email: input.email } })
        if (existing) return { error: 'A user with this email already exists' }
    }

    try {
        // Generate unique 5-digit ID
        let newId = Math.floor(10000 + Math.random() * 90000).toString()
        let idExists = await prisma.user.findUnique({ where: { id: newId } })
        while (idExists) {
            newId = Math.floor(10000 + Math.random() * 90000).toString()
            idExists = await prisma.user.findUnique({ where: { id: newId } })
        }

        const memberEmail = input.email || `noemail-${newId}@member.ktm`

        const newMember = await prisma.user.create({
            data: {
                id: newId,
                clerkId: null,
                email: memberEmail,
                name: toTitleCase(input.name),
                role: 'ATHLETE',
                clubName: club.name,
                gender: input.gender || null,
                belt: input.belt || null,
                weight: input.weight ? parseFloat(String(input.weight)) : null,
                height: input.height ? parseFloat(String(input.height)) : null,
                birthDate: input.birthDate ? new Date(input.birthDate) : null,
                athleteNumber: input.athleteNumber || null,
            }
        })

        revalidatePath('/organization')

        return { success: true, member: newMember }
    } catch (error: any) {
        console.error('Error creating member for club:', error)
        return { error: error.message || 'Failed to create member' }
    }
}

export async function updateClubMemberAsOrg(userId: string, data: {
    name?: string,
    belt?: string,
    gender?: string,
    weight?: number,
    height?: number
}) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    // 1. Verify Requestor is Org Admin/Owner
    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    // 2. Fetch Target User
    const targetUser = await prisma.user.findUnique({
        where: { id: userId }
    })

    if (!targetUser || !targetUser.clubName) return { error: 'User not found or not in a club' }

    // 3. Verify Target User's Club belongs to Requestor's Organization
    // We have to find the club by name since User only stores clubName
    // Potential Issue: Multiple clubs with same name? Assuming distinct names for now or finding first match.
    // Better: We should ideally link User -> Club with valid ID.
    // Current workaround: Find a club with this name that belongs to THIS organization.
    const club = await prisma.club.findFirst({
        where: {
            name: targetUser.clubName,
            organizationId: dbUser.organization.id
        }
    })

    if (!club) {
        return { error: 'This user does not belong to a club under your organization.' }
    }

    // 4. Update User
    await prisma.user.update({
        where: { id: userId },
        data: {
            name: data.name ? toTitleCase(data.name) : undefined,
            belt: data.belt || undefined,
            gender: data.gender || undefined,
            weight: data.weight || undefined,
            height: data.height || undefined
        }
    })

    // Cascade all profile changes (name, belt, placement) to related records
    const { cascadeUserProfile } = await import('@/lib/cascadeUserProfile')
    cascadeUserProfile(userId).catch(console.error)

    revalidatePath('/organization')
    return { success: true }
}

// ============================================
// ATHLETE CARD MANAGEMENT ACTIONS
// ============================================



async function generateAthleteNumber(country: string | null | undefined): Promise<string> {
    const code = countryToCode(country)
    const year = new Date().getFullYear()
    const prefix = `${code}-${year}-`

    const existing = await prisma.user.findMany({
        where: { athleteNumber: { startsWith: prefix } },
        select: { athleteNumber: true },
        orderBy: { athleteNumber: 'desc' },
        take: 1,
    })

    let nextNumber = 1
    if (existing.length > 0 && existing[0].athleteNumber) {
        const parts = existing[0].athleteNumber.split('-')
        const currentMax = parseInt(parts[2], 10)
        if (!isNaN(currentMax)) {
            nextNumber = currentMax + 1
        }
    }

    return `${prefix}${String(nextNumber).padStart(7, '0')}`
}

export async function getOrganizationAthletes() {
    const user = await getAuthUser()
    if (!user) return []

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return []
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) return []

    const orgId = dbUser.organization.id

    // Get all clubs under this org
    const clubs = await prisma.club.findMany({
        where: { organizationId: orgId },
        select: { name: true }
    })

    const clubNames = clubs.map(c => c.name)

    // Get all athletes from these clubs
    const athletes = await prisma.user.findMany({
        where: {
            clubName: { in: clubNames },
            role: 'ATHLETE'
        },
        select: {
            id: true,
            name: true,
            email: true,
            clubName: true,
            belt: true,
            isVerified: true,
            athleteNumber: true,
            imageUrl: true,
            country: true,
            createdAt: true,
            cardPaymentProofUrl: true,
            cardPaymentStatus: true,
        },
        orderBy: { name: 'asc' }
    })

    return athletes
}

export async function toggleAthleteCardStatus(athleteId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) return { error: 'Unauthorized' }

    const orgId = dbUser.organization.id

    // Verify the athlete belongs to this org's clubs
    const orgClubs = await prisma.club.findMany({
        where: { organizationId: orgId },
        select: { name: true }
    })
    const clubNames = orgClubs.map(c => c.name)

    const targetUser = await prisma.user.findUnique({
        where: { id: athleteId },
        select: { id: true, isVerified: true, athleteNumber: true, country: true, clubName: true }
    })

    if (!targetUser) return { error: 'Athlete not found' }
    if (!targetUser.clubName || !clubNames.includes(targetUser.clubName)) {
        return { error: 'Athlete does not belong to your organization' }
    }

    if (!targetUser.isVerified) {
        // Activate: generate or renew athlete number
        let athleteNumber: string
        if (targetUser.athleteNumber) {
            // Renewal: keep same suffix, update year
            const parts = targetUser.athleteNumber.split('-')
            const code = parts[0]
            const suffix = parts[2]
            athleteNumber = `${code}-${new Date().getFullYear()}-${suffix}`
        } else {
            athleteNumber = await generateAthleteNumber(targetUser.country)
        }
        await prisma.user.update({
            where: { id: athleteId },
            data: {
                isVerified: true,
                athleteNumber,
                createdAt: new Date(),
            }
        })
    } else {
        // Deactivate: preserve athleteNumber for future renewal
        await prisma.user.update({
            where: { id: athleteId },
            data: {
                isVerified: false,
                // athleteNumber is preserved for renewal
            }
        })
    }

    revalidatePath('/organization')
    return { success: true }
}

// ============================================
// FINANCIAL DATA ACTIONS
// ============================================

export async function getOrganizationFinancials() {
    const user = await getAuthUser()
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: { select: { id: true, defaultBeltFees: true, feeDistributions: true, name: true, logoUrl: true, address: true, contactPhone: true, contactEmail: true, chairman: true, affiliationFee: true } } }
    })

    if (!dbUser?.organization) return null
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) return null

    const orgId = dbUser.organization.id

    const [promotionTests, seminars, tournaments] = await Promise.all([
        prisma.promotionTest.findMany({
            where: { organizationId: orgId },
            include: {
                registrations: {
                    select: {
                        id: true,
                        paymentStatus: true,
                        playerName: true,
                        clubName: true,
                        currentBelt: true,
                        createdAt: true,
                    }
                }
            },
            orderBy: { testDate: 'desc' }
        }),
        prisma.seminar.findMany({
            where: { organizationId: orgId },
            include: {
                registrations: {
                    select: {
                        id: true,
                        status: true,
                        playerName: true,
                        clubName: true,
                        createdAt: true,
                    }
                }
            },
            orderBy: { startDate: 'desc' }
        }),
        prisma.tournament.findMany({
            where: { organizerId: dbUser.id },
            select: {
                id: true,
                name: true,
                startDate: true,
                status: true,
                earlyBirdPrice: true,
                regularPrice: true,
                earlyBirdDeadline: true,
                categoryPricing: true,
                categories: {
                    select: {
                        id: true,
                        type: true,
                        subtype: true,
                        players: {
                            select: {
                                id: true,
                                name: true,
                                club: { select: { name: true } },
                                registrationStatus: true,
                                createdAt: true,
                            }
                        }
                    }
                }
            },
            orderBy: { startDate: 'desc' }
        })
    ])

    // Build per-event financial breakdown

    const dbDistributions = (dbUser.organization.feeDistributions || {}) as Record<string, { name: string; amount: number }[]>

    // Helper to calculate net and buckets for a single event sum
    function computeDistribution(eventType: string, grossAmount: number, pax: number) {
        const rules = dbDistributions[eventType] || []
        let totalDeductions = 0
        const distributionBreakdown: Record<string, number> = {}

        rules.forEach(rule => {
            const deduction = rule.amount * pax
            distributionBreakdown[rule.name] = (distributionBreakdown[rule.name] || 0) + deduction
            totalDeductions += deduction
        })

        const net = Math.max(0, grossAmount - totalDeductions)
        return { net, deductions: distributionBreakdown, totalDeductions }
    }

    // --- Promotion Tests ---
    const WHITE_TO_PURPLE_BELTS = ['white', 'yellow', 'orange', 'green', 'purple']
    const BLUE_TO_MAROON_BELTS = ['blue', 'maroon', 'red']

    function getPromoFee(belt: string | null | undefined, beltFees: any, baseFee: number) {
        if (!belt) return baseFee
        const b = belt.toLowerCase()
        if (WHITE_TO_PURPLE_BELTS.includes(b)) return Number(beltFees.whiteToPurple) || baseFee
        if (BLUE_TO_MAROON_BELTS.includes(b)) return Number(beltFees.blueToMaroon) || baseFee
        if (b === 'brown') return Number(beltFees.brown) || baseFee
        return baseFee
    }

    const promotionBreakdown = promotionTests.map(pt => {
        const baseFee = pt.fee || 0
        const beltFees = (dbUser.organization?.defaultBeltFees || {}) as Record<string, number>
        const totalRegs = pt.registrations.length

        let totalExpected = 0
        let totalCollected = 0
        let paidCount = 0
        let unpaidCount = 0

        const mappedRegistrations = pt.registrations.map(r => {
            const beltFee = getPromoFee(r.currentBelt, beltFees, baseFee)
            const isPaid = r.paymentStatus === 'PAID'

            totalExpected += beltFee
            if (isPaid) {
                totalCollected += beltFee
                paidCount++
            } else {
                unpaidCount++
            }

            const regStats = isPaid ? computeDistribution('promotion', beltFee, 1) : { net: 0, totalDeductions: 0 }

            return {
                id: r.id,
                playerName: r.playerName,
                clubName: r.clubName || 'Independent',
                status: r.paymentStatus,
                amountExpected: beltFee,
                amountPaid: isPaid ? beltFee : 0,
                deduction: regStats.totalDeductions,
                net: regStats.net
            }
        })

        const stats = computeDistribution('promotion', totalCollected, paidCount)

        return {
            id: pt.id,
            type: 'promotion' as const,
            name: pt.name,
            date: pt.testDate.toISOString(),
            status: pt.status,
            fee: baseFee,
            totalRegistrations: totalRegs,
            paidCount,
            unpaidCount,
            totalCollected,
            totalExpected,
            netRevenue: stats.net,
            deductions: stats.deductions,
            registrations: mappedRegistrations
        }
    })

    // --- Seminars ---
    const seminarBreakdown = seminars.map(s => {
        const fee = s.fee || 0
        const approvedRegs = s.registrations.filter(r => r.status === 'APPROVED')
        const totalRegs = s.registrations.length

        const mappedRegistrations = s.registrations.map(r => {
            const isPaid = r.status === 'APPROVED'
            const regStats = isPaid ? computeDistribution('seminar', fee, 1) : { net: 0, totalDeductions: 0 }

            return {
                id: r.id,
                playerName: r.playerName,
                clubName: r.clubName || 'Independent',
                status: isPaid ? 'PAID' : 'UNPAID',
                amountExpected: fee,
                amountPaid: isPaid ? fee : 0,
                deduction: regStats.totalDeductions,
                net: regStats.net
            }
        })

        const stats = computeDistribution('seminar', approvedRegs.length * fee, approvedRegs.length)

        return {
            id: s.id,
            type: 'seminar' as const,
            name: s.name,
            date: s.startDate.toISOString(),
            status: s.status,
            fee,
            totalRegistrations: totalRegs,
            paidCount: approvedRegs.length, // approved = paid for seminars
            unpaidCount: totalRegs - approvedRegs.length,
            totalCollected: approvedRegs.length * fee,
            totalExpected: totalRegs * fee,
            netRevenue: stats.net,
            deductions: stats.deductions,
            registrations: mappedRegistrations
        }
    })

    // --- Tournaments (with category pricing + early bird logic) ---
    const tournamentBreakdown = tournaments.map(t => {
        const catPricing = (t.categoryPricing || {}) as Record<string, { earlyBird?: number | null; regular?: number | null }>
        const earlyBirdDeadline = t.earlyBirdDeadline ? new Date(t.earlyBirdDeadline) : null

        let totalExpected = 0
        let totalCollected = 0
        let totalRegs = 0
        let paidCount = 0
        const mappedRegistrations: any[] = []

        for (const category of t.categories) {
            const comboKey = `${category.type}_${category.subtype}`
            const catPrice = catPricing[comboKey]

            for (const player of category.players) {
                totalRegs++

                // Determine the fee for this player
                let playerFee = 0
                const isEarlyBird = earlyBirdDeadline && player.createdAt < earlyBirdDeadline

                if (catPrice) {
                    // Category-specific pricing takes priority
                    playerFee = isEarlyBird
                        ? (catPrice.earlyBird || catPrice.regular || 0)
                        : (catPrice.regular || 0)
                } else {
                    // Fall back to tournament-level pricing
                    playerFee = isEarlyBird
                        ? (t.earlyBirdPrice || t.regularPrice || 0)
                        : (t.regularPrice || 0)
                }

                totalExpected += playerFee
                const isPaid = player.registrationStatus === 'APPROVED'

                if (isPaid) {
                    paidCount++
                    totalCollected += playerFee
                }

                const regStats = isPaid ? computeDistribution('tournament', playerFee, 1) : { net: 0, totalDeductions: 0 }

                mappedRegistrations.push({
                    id: player.id,
                    playerName: (player as any).name || 'Player',
                    clubName: (player as any).club?.name || 'Independent',
                    status: isPaid ? 'PAID' : 'UNPAID',
                    amountExpected: playerFee,
                    amountPaid: isPaid ? playerFee : 0,
                    deduction: regStats.totalDeductions,
                    net: regStats.net
                })
            }
        }

        const stats = computeDistribution('tournament', totalCollected, paidCount)

        return {
            id: t.id,
            type: 'tournament' as const,
            name: t.name,
            date: t.startDate.toISOString(),
            status: t.status,
            fee: 0, // Varies per category — displayed as "Varies" in UI
            totalRegistrations: totalRegs,
            paidCount,
            unpaidCount: totalRegs - paidCount,
            totalCollected,
            totalExpected,
            netRevenue: stats.net,
            deductions: stats.deductions,
            registrations: mappedRegistrations
        }
    })

    const allEvents = [...tournamentBreakdown, ...promotionBreakdown, ...seminarBreakdown]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // --- Club Affiliation Revenue ---
    const affiliations = await prisma.clubAffiliation.findMany({
        where: { organizationId: orgId, paymentStatus: 'PAID' },
        include: { club: { select: { name: true } } },
        orderBy: { paidAt: 'desc' }
    })

    const affiliationRevenue = affiliations.reduce((sum, a) => sum + (a.amountPaid || 0), 0)
    const affiliationItems = affiliations.map(a => {
        const amt = a.amountPaid || 0
        const stats = computeDistribution('affiliation', amt, 1)

        return {
            id: a.id,
            type: 'affiliation' as const,
            name: `${a.club.name} — Affiliation`,
            date: a.paidAt?.toISOString() || a.createdAt.toISOString(),
            status: 'PAID',
            totalRegistrations: 1,
            paidCount: 1,
            unpaidCount: 0,
            totalCollected: amt,
            totalExpected: amt,
            netRevenue: stats.net,
            deductions: stats.deductions,
            registrations: [{
                id: a.id,
                playerName: a.club.name,
                clubName: a.club.name,
                status: 'PAID',
                amountExpected: amt,
                amountPaid: amt,
                deduction: stats.totalDeductions,
                net: stats.net
            }]
        }
    })

    // Pending affiliations (not yet paid)
    const pendingAffiliations = await prisma.clubAffiliation.findMany({
        where: { organizationId: orgId, paymentStatus: { not: 'PAID' } },
    })
    const pendingAffiliationRevenue = pendingAffiliations.length * (dbUser.organization.affiliationFee || 0)

    // Combine all events + affiliations
    const allItems = [...allEvents, ...affiliationItems]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Aggregated totals (events only for expected/collected)
    const eventTotalExpected = allEvents.reduce((sum, e) => sum + e.totalExpected, 0)
    const eventTotalCollected = allEvents.reduce((sum, e) => sum + e.totalCollected, 0)
    const totalRevenue = eventTotalExpected + affiliationRevenue + pendingAffiliationRevenue
    const totalCollected = eventTotalCollected + affiliationRevenue
    const totalPending = totalRevenue - totalCollected
    const totalRegistrations = allEvents.reduce((sum, e) => sum + e.totalRegistrations, 0)

    // Collection rate
    const collectionRate = totalRevenue > 0 ? Math.round((totalCollected / totalRevenue) * 100) : 0

    const totalNetRevenue = allItems.reduce((sum, e) => sum + (e.netRevenue || 0), 0)
    const totalDeductions = totalCollected - totalNetRevenue

    // Aggregate deductions by bucket name across all items
    const aggregatedDeductions: Record<string, number> = {}
    allItems.forEach(item => {
        if (item.deductions) {
            Object.entries(item.deductions).forEach(([bucketName, amount]) => {
                aggregatedDeductions[bucketName] = (aggregatedDeductions[bucketName] || 0) + (amount as number)
            })
        }
    })

    // Revenue by event type
    const revenueByType = {
        tournaments: tournamentBreakdown.reduce((sum, e) => sum + e.totalCollected, 0),
        promotions: promotionBreakdown.reduce((sum, e) => sum + e.totalCollected, 0),
        seminars: seminarBreakdown.reduce((sum, e) => sum + e.totalCollected, 0),
        affiliations: affiliationRevenue,
    }

    // YoY comparison
    const now = new Date()
    const currentYear = now.getFullYear()
    const thisYearEvents = allItems.filter(e => new Date(e.date).getFullYear() === currentYear)
    const lastYearEvents = allItems.filter(e => new Date(e.date).getFullYear() === currentYear - 1)
    const thisYearCollected = thisYearEvents.reduce((sum, e) => sum + e.totalCollected, 0)
    const lastYearCollected = lastYearEvents.reduce((sum, e) => sum + e.totalCollected, 0)
    const yoyChange = lastYearCollected > 0 ? Math.round(((thisYearCollected - lastYearCollected) / lastYearCollected) * 100) : (thisYearCollected > 0 ? 100 : 0)

    // Monthly revenue data for bar chart (last 12 months)
    const monthlyData: { month: string; tournaments: number; promotions: number; seminars: number; affiliations: number }[] = []
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = d.toLocaleDateString('en-US', { month: 'short' })
        const year = d.getFullYear()
        const month = d.getMonth()

        const tournamentRevenue = tournamentBreakdown
            .filter(e => {
                const ed = new Date(e.date)
                return ed.getFullYear() === year && ed.getMonth() === month
            })
            .reduce((sum, e) => sum + e.totalCollected, 0)

        const promoRevenue = promotionBreakdown
            .filter(e => {
                const ed = new Date(e.date)
                return ed.getFullYear() === year && ed.getMonth() === month
            })
            .reduce((sum, e) => sum + e.totalCollected, 0)

        const semRevenue = seminarBreakdown
            .filter(e => {
                const ed = new Date(e.date)
                return ed.getFullYear() === year && ed.getMonth() === month
            })
            .reduce((sum, e) => sum + e.totalCollected, 0)

        const affRevenue = affiliations
            .filter(a => {
                const ad = new Date((a.paidAt || a.createdAt))
                return ad.getFullYear() === year && ad.getMonth() === month
            })
            .reduce((sum, a) => sum + (a.amountPaid || 0), 0)

        monthlyData.push({ month: monthKey, tournaments: tournamentRevenue, promotions: promoRevenue, seminars: semRevenue, affiliations: affRevenue })
    }

    // Free events count
    const freeEventsCount = allEvents.filter(e => e.totalExpected === 0).length

    return {
        organization: {
            name: dbUser.organization.name,
            logoUrl: dbUser.organization.logoUrl,
            address: dbUser.organization.address,
            contactPhone: dbUser.organization.contactPhone,
            contactEmail: dbUser.organization.contactEmail,
            chairman: dbUser.organization.chairman,
        },
        summary: {
            totalRevenue,
            totalCollected,
            totalPending,
            totalNetRevenue,
            totalDeductions,
            aggregatedDeductions,
            totalRegistrations,
            affiliationRevenue,
            collectionRate,
            freeEventsCount,
        },
        events: allItems,
        monthlyData,
        revenueByType,
        distributions: dbDistributions,
        yoy: {
            thisYear: thisYearCollected,
            lastYear: lastYearCollected,
            changePercent: yoyChange,
            currentYear,
        },
    }
}

// ----------------------------------------------------
// FEE DISTRIBUTION RULES SERVER ACTION
// ----------------------------------------------------
export async function updateFeeDistributions(configData: Record<string, { name: string; amount: number }[]>) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) return { error: 'Unauthorized' }

    try {
        await prisma.organization.update({
            where: { id: dbUser.organization.id },
            data: { feeDistributions: configData }
        })

        revalidatePath('/organization')
        return { success: true }
    } catch (e: any) {
        return { error: e.message || 'Failed to update rules' }
    }
}

// ============================================
// CLUB AFFILIATION FEE MANAGEMENT
// ============================================

export async function updateAffiliationSettings(data: {
    affiliationFee?: number
    affiliationPaymentMethod?: string
    affiliationInstructions?: string | null
    affiliationXenditEnabled?: boolean
    affiliationXenditSecretKey?: string | null
    affiliationPaymentMethods?: any[] | null
}) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }
    if (!['ORGANIZER', 'ADMIN'].includes(dbUser.role)) return { error: 'Only the owner can update affiliation settings' }

    const updateData: any = {}
    if (data.affiliationFee !== undefined) updateData.affiliationFee = data.affiliationFee
    if (data.affiliationPaymentMethod !== undefined) updateData.affiliationPaymentMethod = data.affiliationPaymentMethod
    if (data.affiliationInstructions !== undefined) updateData.affiliationInstructions = data.affiliationInstructions
    if (data.affiliationXenditEnabled !== undefined) updateData.affiliationXenditEnabled = data.affiliationXenditEnabled
    if (data.affiliationPaymentMethods !== undefined) updateData.affiliationPaymentMethods = data.affiliationPaymentMethods
    if (data.affiliationXenditSecretKey !== undefined) {
        updateData.affiliationXenditSecretKey = data.affiliationXenditSecretKey
            ? encrypt(data.affiliationXenditSecretKey)
            : null
    }

    await prisma.organization.update({
        where: { id: dbUser.organization.id },
        data: updateData
    })

    revalidatePath('/organization')
    return { success: true }
}

export async function getClubAffiliations() {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) return { error: 'Unauthorized' }

    const orgId = dbUser.organization.id

    // Get all clubs under this org with their affiliation records
    const clubs = await prisma.club.findMany({
        where: { organizationId: orgId },
        include: {
            master: { select: { name: true, email: true } },
            affiliations: {
                where: { organizationId: orgId },
                take: 1,
                orderBy: { createdAt: 'desc' }
            },
            _count: {
                select: {
                    students: { where: { registrationStatus: 'APPROVED' } }
                }
            }
        },
        orderBy: { name: 'asc' }
    })

    const org = dbUser.organization
    const savedMethods = (org as any).affiliationPaymentMethods || []

    // Fallback: build from legacy single fields if new JSON is empty
    const legacyMethod = savedMethods.length === 0 && org.affiliationBankName ? [{
        id: 'legacy',
        label: org.affiliationBankName,
        bankName: org.affiliationBankName,
        accountNo: org.affiliationBankAccountNo || '',
        accountName: org.affiliationBankAccountName || '',
        qrCodeUrl: org.affiliationQrCodeUrl || null,
    }] : []

    return {
        success: true,
        clubs: clubs.map(c => ({
            id: c.id,
            name: c.name,
            masterName: c.master.name,
            masterEmail: c.master.email,
            memberCount: c._count.students,
            affiliation: c.affiliations[0] || null,
        })),
        orgFee: org.affiliationFee,
        paymentMethod: org.affiliationPaymentMethod,
        paymentMethods: savedMethods.length > 0 ? savedMethods : legacyMethod,
        instructions: org.affiliationInstructions,
    }
}

export async function approveAffiliationProof(affiliationId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) return { error: 'Unauthorized' }

    const affiliation = await prisma.clubAffiliation.findUnique({
        where: { id: affiliationId }
    })

    if (!affiliation || affiliation.organizationId !== dbUser.organization.id) {
        return { error: 'Affiliation not found' }
    }

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    await prisma.clubAffiliation.update({
        where: { id: affiliationId },
        data: {
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            paidAt: now,
            expiresAt,
            amountPaid: dbUser.organization.affiliationFee,
            reviewedBy: dbUser.id,
            reviewedAt: now,
        }
    })

    revalidatePath('/organization')
    return { success: true }
}

export async function rejectAffiliationProof(affiliationId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) return { error: 'Unauthorized' }

    const affiliation = await prisma.clubAffiliation.findUnique({
        where: { id: affiliationId }
    })

    if (!affiliation || affiliation.organizationId !== dbUser.organization.id) {
        return { error: 'Affiliation not found' }
    }

    await prisma.clubAffiliation.update({
        where: { id: affiliationId },
        data: {
            status: 'UNPAID',
            paymentStatus: 'UNPAID',
            proofImageUrl: null,
            proofSubmittedAt: null,
            reviewedBy: dbUser.id,
            reviewedAt: new Date(),
        }
    })

    revalidatePath('/organization')
    return { success: true }
}

export async function manuallyActivateAffiliation(clubId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) return { error: 'Unauthorized' }

    const orgId = dbUser.organization.id
    const fee = dbUser.organization.affiliationFee || 0

    // Verify the club belongs to this organization
    const club = await prisma.club.findFirst({
        where: { id: clubId, organizationId: orgId }
    })
    if (!club) return { error: 'Club not found in your organization' }

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Upsert — create if no record exists, update if one does
    await prisma.clubAffiliation.upsert({
        where: { clubId_organizationId: { clubId, organizationId: orgId } },
        create: {
            clubId,
            organizationId: orgId,
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            paymentMethod: 'manual',
            amountPaid: fee,
            paidAt: now,
            expiresAt,
            reviewedBy: dbUser.id,
            reviewedAt: now,
        },
        update: {
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            paymentMethod: 'manual',
            amountPaid: fee,
            paidAt: now,
            expiresAt,
            reviewedBy: dbUser.id,
            reviewedAt: now,
        }
    })

    revalidatePath('/organization')
    return { success: true }
}

// ============================================
// ORGANIZATION EVENTS LIST (lightweight)
// ============================================

export async function getOrganizationEvents() {
    const user = await getAuthUser()
    if (!user) return []

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: { select: { id: true } } }
    })

    if (!dbUser?.organization) return []

    const orgId = dbUser.organization.id

    const [tournaments, seminars, promotions] = await Promise.all([
        prisma.tournament.findMany({
            where: { organizerId: dbUser.id },
            select: { id: true, name: true },
            orderBy: { startDate: 'desc' }
        }),
        prisma.seminar.findMany({
            where: { organizationId: orgId },
            select: { id: true, name: true },
            orderBy: { startDate: 'desc' }
        }),
        prisma.promotionTest.findMany({
            where: { organizationId: orgId },
            select: { id: true, name: true },
            orderBy: { testDate: 'desc' }
        }),
    ])

    return [
        ...tournaments.map(t => ({ id: t.id, name: t.name, type: 'tournament' as const })),
        ...seminars.map(s => ({ id: s.id, name: s.name, type: 'seminar' as const })),
        ...promotions.map(p => ({ id: p.id, name: p.name, type: 'promotion' as const })),
    ]
}

// ============================================
// ADVANCE PAYMENT LEDGER ACTIONS
// ============================================

async function getOrgContext() {
    const user = await getAuthUser()
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: { select: { id: true } } }
    })

    if (!dbUser?.organization) return null
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) return null

    return { userId: dbUser.id, orgId: dbUser.organization.id }
}

export async function getAdvancePayments() {
    const ctx = await getOrgContext()
    if (!ctx) return []

    return prisma.advancePayment.findMany({
        where: { organizationId: ctx.orgId },
        orderBy: { paidAt: 'desc' }
    })
}

export async function createAdvancePayment(data: {
    payerName: string
    clubName?: string
    amount: number
    eventType?: string
    eventId?: string
    eventName?: string
    notes?: string
    paidAt: string
}) {
    const ctx = await getOrgContext()
    if (!ctx) return { error: 'Unauthorized' }

    await prisma.advancePayment.create({
        data: {
            organizationId: ctx.orgId,
            payerName: data.payerName,
            clubName: data.clubName || null,
            amount: data.amount,
            eventType: data.eventType || null,
            eventId: data.eventId || null,
            eventName: data.eventName || null,
            notes: data.notes || null,
            paidAt: new Date(data.paidAt),
            status: 'UNMATCHED'
        }
    })

    revalidatePath('/organization')
    return { success: true }
}

export async function updateAdvancePaymentStatus(id: string, status: 'MATCHED' | 'REFUNDED' | 'UNMATCHED') {
    const ctx = await getOrgContext()
    if (!ctx) return { error: 'Unauthorized' }

    const payment = await prisma.advancePayment.findUnique({ where: { id } })
    if (!payment || payment.organizationId !== ctx.orgId) return { error: 'Not found' }

    await prisma.advancePayment.update({
        where: { id },
        data: {
            status,
            matchedAt: status === 'MATCHED' ? new Date() : null,
        }
    })

    revalidatePath('/organization')
    return { success: true }
}

export async function deleteAdvancePayment(id: string) {
    const ctx = await getOrgContext()
    if (!ctx) return { error: 'Unauthorized' }

    const payment = await prisma.advancePayment.findUnique({ where: { id } })
    if (!payment || payment.organizationId !== ctx.orgId) return { error: 'Not found' }

    await prisma.advancePayment.delete({ where: { id } })

    revalidatePath('/organization')
    return { success: true }
}

// ============================================
// EXPENSE TRACKER ACTIONS
// ============================================

export async function getExpenses() {
    const ctx = await getOrgContext()
    if (!ctx) return []

    return prisma.expense.findMany({
        where: { organizationId: ctx.orgId },
        orderBy: { date: 'desc' }
    })
}

export async function createExpense(data: {
    description: string
    amount: number
    category: string
    date: string
    receiptUrl?: string
    eventType?: string
    eventId?: string
    eventName?: string
}) {
    const ctx = await getOrgContext()
    if (!ctx) return { error: 'Unauthorized' }

    await prisma.expense.create({
        data: {
            organizationId: ctx.orgId,
            description: data.description,
            amount: data.amount,
            category: data.category,
            date: new Date(data.date),
            receiptUrl: data.receiptUrl || null,
            eventType: data.eventType || null,
            eventId: data.eventId || null,
            eventName: data.eventName || null,
        }
    })

    revalidatePath('/organization')
    return { success: true }
}

export async function deleteExpense(id: string) {
    const ctx = await getOrgContext()
    if (!ctx) return { error: 'Unauthorized' }

    const expense = await prisma.expense.findUnique({ where: { id } })
    if (!expense || expense.organizationId !== ctx.orgId) return { error: 'Not found' }

    await prisma.expense.delete({ where: { id } })

    revalidatePath('/organization')
    return { success: true }
}

// ============================================
// BALANCE SHEET ACTION
// ============================================

export async function getBalanceSheet() {
    const ctx = await getOrgContext()
    if (!ctx) return null

    const [financials, advancePayments, expenses] = await Promise.all([
        getOrganizationFinancials(),
        prisma.advancePayment.findMany({
            where: { organizationId: ctx.orgId },
            orderBy: { paidAt: 'desc' }
        }),
        prisma.expense.findMany({
            where: { organizationId: ctx.orgId },
            orderBy: { date: 'desc' }
        }),
    ])

    if (!financials) return null

    // Revenue breakdown
    const totalRevenue = financials.summary.totalCollected

    // Advance payments breakdown
    const unmatchedPayments = advancePayments.filter(p => p.status === 'UNMATCHED')
    const matchedPayments = advancePayments.filter(p => p.status === 'MATCHED')
    const totalUnmatched = unmatchedPayments.reduce((s, p) => s + p.amount, 0)
    const totalMatched = matchedPayments.reduce((s, p) => s + p.amount, 0)

    // Expense breakdown by category
    const expensesByCategory: Record<string, number> = {}
    let totalExpenses = 0
    expenses.forEach(e => {
        expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount
        totalExpenses += e.amount
    })

    // Net position: Revenue - Expenses
    const netPosition = totalRevenue - totalExpenses

    return {
        revenue: {
            total: totalRevenue,
            byType: financials.revenueByType,
            netRevenue: financials.summary.totalNetRevenue,
            deductions: financials.summary.totalDeductions,
        },
        advancePayments: {
            totalUnmatched,
            totalMatched,
            unmatchedCount: unmatchedPayments.length,
            matchedCount: matchedPayments.length,
        },
        expenses: {
            total: totalExpenses,
            byCategory: expensesByCategory,
            items: expenses,
        },
        netPosition,
    }
}

// ============================================
// FEE MANAGEMENT ACTIONS
// ============================================

export async function updatePromotionTestFees(formData: FormData) {
    try {
        const organizationId = formData.get('organizationId') as string
        if (!organizationId) return { error: 'Organization ID is required' }

        const user = await getAuthUser()
        if (!user) return { error: 'Unauthorized' }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { organization: true }
        })

        if (!dbUser?.organization || (dbUser.organization.ownerId !== dbUser.id && dbUser.role !== 'ADMIN') || dbUser.organization.id !== organizationId) {
            return { error: 'Unauthorized to edit these settings' }
        }

        const whiteToPurpleFeeStr = formData.get('whiteToPurpleFee') as string
        const blueToMaroonFeeStr = formData.get('blueToMaroonFee') as string
        const brownFeeStr = formData.get('brownFee') as string

        const defaultBeltFees = {
            whiteToPurple: whiteToPurpleFeeStr ? parseFloat(whiteToPurpleFeeStr) : null,
            blueToMaroon: blueToMaroonFeeStr ? parseFloat(blueToMaroonFeeStr) : null,
            brown: brownFeeStr ? parseFloat(brownFeeStr) : null
        }

        await prisma.organization.update({
            where: { id: organizationId },
            data: { defaultBeltFees }
        })

        return { success: true }
    } catch (e) {
        console.error('Failed to update promotion test fees:', e)
        return { error: 'Failed to update promotion test fees' }
    }
}

export async function updateAthleteCardFees(formData: FormData) {
    try {
        const organizationId = formData.get('organizationId') as string
        if (!organizationId) return { error: 'Organization ID is required' }

        const user = await getAuthUser()
        if (!user) return { error: 'Unauthorized' }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { organization: true }
        })

        if (!dbUser?.organization || (dbUser.organization.ownerId !== dbUser.id && dbUser.role !== 'ADMIN') || dbUser.organization.id !== organizationId) {
            return { error: 'Unauthorized to edit these settings' }
        }

        const athleteCardFeeStr = formData.get('athleteCardFee') as string | null
        const athleteCardPaymentInstructions = formData.get('athleteCardPaymentInstructions') as string | null
        const athleteCardPaymentMethodsStr = formData.get('athleteCardPaymentMethods') as string | null

        let defaultMethods = null
        if (athleteCardPaymentMethodsStr) {
            try {
                defaultMethods = JSON.parse(athleteCardPaymentMethodsStr)
            } catch (e) {
                console.error('Failed to parse payment methods array')
            }
        }

        await prisma.organization.update({
            where: { id: organizationId },
            data: {
                athleteCardFee: athleteCardFeeStr ? parseFloat(athleteCardFeeStr) : null,
                athleteCardPaymentInstructions: athleteCardPaymentInstructions || null,
                athleteCardPaymentMethods: defaultMethods
            }
        })

        return { success: true }
    } catch (e) {
        console.error('Failed to update athlete card fees:', e)
        return { error: 'Failed to update athlete card fees' }
    }
}

// ============================================
// REVOCATION ACTIONS
// ============================================

/**
 * Revoke a club's affiliation — permanently deletes the club, all members,
 * and all related data from the database + Supabase Auth.
 */
export async function revokeClubAffiliation(clubId: string, confirmName: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }
    const orgId = dbUser.organization.id

    // Fetch the club and verify it belongs to this org
    const club = await prisma.club.findUnique({
        where: { id: clubId },
        include: { master: true }
    })

    if (!club || club.organizationId !== orgId) {
        return { error: 'Club not found or not affiliated with your organization' }
    }

    // Two-step confirmation: name must match exactly
    if (confirmName.trim().toLowerCase() !== club.name.trim().toLowerCase()) {
        return { error: 'Club name does not match. Please type the exact club name to confirm.' }
    }

    // Collect all user IDs (members + master)
    const clubMembers = await prisma.user.findMany({
        where: { clubName: club.name, role: { in: ['ATHLETE', 'ASSISTANT_CLUB_MASTER'] } },
        select: { id: true, clerkId: true }
    })

    const allUserIds = [...clubMembers.map(m => m.id), club.masterId]
    const allClerkIds = [
        ...clubMembers.map(m => m.clerkId).filter(Boolean),
        club.master.clerkId
    ].filter(Boolean) as string[]

    // ── Active Tournament Guard ──
    const activePlayers = await prisma.player.findMany({
        where: {
            userId: { in: allUserIds },
            category: {
                tournament: {
                    status: { in: ['UPCOMING', 'ONGOING'] }
                }
            }
        },
        include: {
            category: {
                include: {
                    tournament: { select: { name: true } }
                }
            }
        }
    })

    if (activePlayers.length > 0) {
        const tournamentNames = [...new Set(activePlayers.map(p => p.category?.tournament?.name).filter(Boolean))]
        return {
            error: `Cannot revoke — ${club.name} has ${activePlayers.length} player(s) in active/upcoming tournaments: ${tournamentNames.join(', ')}. Remove them from those tournaments first.`
        }
    }

    // ── FK-Safe Cascading Delete (inside a transaction) ──
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Delete PoomsaeMatch records for players
            const playerIds = await tx.player.findMany({
                where: { OR: [{ userId: { in: allUserIds } }, { clubId: club.id }] },
                select: { id: true }
            })
            const pIds = playerIds.map(p => p.id)

            if (pIds.length > 0) {
                await tx.poomsaeMatch.deleteMany({ where: { playerId: { in: pIds } } })
                // GuestRegistration has onDelete: Cascade on Player, but we delete manually to be safe
                await tx.guestRegistration.deleteMany({ where: { playerId: { in: pIds } } })
            }

            // 2. Delete Player records
            await tx.player.deleteMany({
                where: { OR: [{ userId: { in: allUserIds } }, { clubId: club.id }] }
            })

            // 3. Delete ApiKey records
            await tx.apiKey.deleteMany({ where: { ownerId: { in: allUserIds } } })

            // 4. Delete ClubAffiliation records
            await tx.clubAffiliation.deleteMany({ where: { clubId: club.id } })

            // 5. Delete BulkRegistration records
            await tx.bulkRegistration.deleteMany({ where: { clubId: club.id } })

            // 6. Delete all User records (PushSubscription + Notification cascade automatically)
            await tx.user.deleteMany({ where: { id: { in: allUserIds } } })

            // 7. Delete the Club record (ClubEventParticipation cascades automatically)
            await tx.club.delete({ where: { id: club.id } })
        })

        // ── Delete Supabase Auth accounts ──
        if (allClerkIds.length > 0) {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
            )
            for (const clerkId of allClerkIds) {
                try {
                    await supabaseAdmin.auth.admin.deleteUser(clerkId)
                } catch (authErr) {
                    console.error(`[RevokeClub] Failed to delete auth user ${clerkId}:`, authErr)
                }
            }
        }

        console.log(`[RevokeClub] Org admin ${dbUser.id} revoked club "${club.name}" — deleted ${allUserIds.length} users`)

        revalidatePath('/organization')
        return { success: true, deletedUsers: allUserIds.length, clubName: club.name }
    } catch (error: any) {
        console.error('[RevokeClub] Transaction failed:', error)
        return { error: error.message || 'Failed to revoke club affiliation' }
    }
}

/**
 * Revoke an individual athlete — permanently deletes them from DB + Supabase Auth.
 */
export async function revokeAthlete(athleteId: string) {
    const user = await getAuthUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }
    const orgId = dbUser.organization.id

    // Find the athlete
    const athlete = await prisma.user.findUnique({
        where: { id: athleteId },
        select: { id: true, clerkId: true, name: true, clubName: true, role: true }
    })

    if (!athlete) return { error: 'Athlete not found' }

    // Verify the athlete belongs to a club under this org
    if (athlete.clubName) {
        const club = await prisma.club.findFirst({
            where: { name: athlete.clubName, organizationId: orgId }
        })
        if (!club) {
            return { error: 'This athlete is not in a club affiliated with your organization' }
        }
    } else {
        return { error: 'Athlete has no club association' }
    }

    // ── Active Tournament Guard ──
    const activePlayers = await prisma.player.findMany({
        where: {
            userId: athlete.id,
            category: {
                tournament: {
                    status: { in: ['UPCOMING', 'ONGOING'] }
                }
            }
        },
        include: {
            category: {
                include: {
                    tournament: { select: { name: true } }
                }
            }
        }
    })

    if (activePlayers.length > 0) {
        const tournamentNames = [...new Set(activePlayers.map(p => p.category?.tournament?.name).filter(Boolean))]
        return {
            error: `Cannot revoke — ${athlete.name} has registrations in active/upcoming tournaments: ${tournamentNames.join(', ')}. Remove them first.`
        }
    }

    // ── Delete in FK-safe order ──
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Delete PoomsaeMatch records
            const playerIds = await tx.player.findMany({
                where: { userId: athlete.id },
                select: { id: true }
            })
            const pIds = playerIds.map(p => p.id)

            if (pIds.length > 0) {
                await tx.poomsaeMatch.deleteMany({ where: { playerId: { in: pIds } } })
                await tx.guestRegistration.deleteMany({ where: { playerId: { in: pIds } } })
            }

            // 2. Delete Player records
            await tx.player.deleteMany({ where: { userId: athlete.id } })

            // 3. Delete ApiKey records
            await tx.apiKey.deleteMany({ where: { ownerId: athlete.id } })

            // 4. Delete User (PushSubscription + Notification cascade)
            await tx.user.delete({ where: { id: athlete.id } })
        })

        // Delete from Supabase Auth
        if (athlete.clerkId) {
            try {
                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!,
                )
                await supabaseAdmin.auth.admin.deleteUser(athlete.clerkId)
            } catch (authErr) {
                console.error(`[RevokeAthlete] Failed to delete auth user ${athlete.clerkId}:`, authErr)
            }
        }

        console.log(`[RevokeAthlete] Org admin ${dbUser.id} revoked athlete "${athlete.name}" (${athlete.id})`)

        revalidatePath('/organization')
        return { success: true, athleteName: athlete.name }
    } catch (error: any) {
        console.error('[RevokeAthlete] Transaction failed:', error)
        return { error: error.message || 'Failed to revoke athlete' }
    }
}
