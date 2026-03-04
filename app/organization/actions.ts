'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { getNextBelt } from '@/lib/belt'
import { countryToCode } from '@/lib/countries'
import crypto from 'crypto'

export async function getOrganizationDashboardData() {
    const user = await currentUser()
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
                students: true, // Still needed for player-specific data if any
                master: true
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


    // Calculate Stats
    const totalDirectMembers = affiliatedClubs.reduce((acc, club) => acc + (memberCountMap.get(club.name) || 0), 0)
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
            memberCount: memberCountMap.get(c.name) || 0,
            contactPhone: c.phone,
            address: c.address,
            status: c.status
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return { error: 'No organization found' }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const testDate = formData.get('testDate') as string
    const registrationDeadline = formData.get('registrationDeadline') as string
    const venue = formData.get('venue') as string
    const visibility = (formData.get('visibility') as string) || 'PRIVATE'

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
            visibility
        }
    })

    return { success: true, promotionTest }
}

export async function updatePromotionTest(formData: FormData) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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

        }
    })

    revalidatePath('/organization')
    return { success: true, seminar }
}

export async function updateSeminarStatus(seminarId: string, status: string) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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

    let bannerUrl = seminar.bannerUrl
    if (bannerFile && bannerFile.size > 0) {
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized', registrations: [], total: 0, totalPages: 0 }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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

        if (!organizationId) return { error: 'Organization ID is required' }
        if (!name) return { error: 'Organization Name is required' }

        const user = await currentUser()
        if (!user) return { error: 'Unauthorized' }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    const dbUser = user ? await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return []

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
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

    return {
        owner: org?.owner,
        coOrganizers: org?.coOrganizers || [],
        pendingInvites: org?.coOrganizerInvites || [],
        isOwner: access.isOwner
    }
}

// Invite a co-organizer (owner only)
export async function inviteCoOrganizer(orgId: string, email: string) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
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

    await prisma.coOrganizerInvite.create({
        data: {
            email: normalizedEmail,
            organizationId: orgId
        }
    })

    revalidatePath('/organization')
    return { success: true, message: `Invite created for ${normalizedEmail}. Share the sign-up link with them.` }
}

// Remove a co-organizer (owner only)
export async function removeCoOrganizer(orgId: string, coOrganizerUserId: string) {
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
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
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
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
    const user = await currentUser()
    if (!user) throw new Error('Unauthorized')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
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
    const user = await currentUser()
    if (!user) return { tournaments: [], promotionTests: [] }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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

    await prisma.promotionTestRegistration.create({
        data: {
            promotionTestId,
            playerId: dbUser.id, // Linking to User ID (acts as Player ID if we treat them same, wait. User has ID "00123". Player has ID "00123"? Usually disjoint tables).
            // Schema has `playerId String?` which usually refers to `Player.id`.
            // But `User` often IS the player or manages players. 
            // In KTM context, we have `User` and `Player` tables.
            // If User is ATHLETE, they might be a Player?
            // Actually, `User` (clerk) -> `Player`? No.
            // `User` has `players Player[]`.
            // So we need to find the "Main Player" associated with this User?
            // Or just use the User's name/profile?
            // "we will only get the name, age, belt" -> from User profile.
            // I will use `dbUser.id` for `playerId` if it matches format? User ID is 5-digit. Player ID is 5-digit.
            // Actually `on click register` implies the logged in user is registering THEMSELVES.
            // So `playerName` = `dbUser.name`.

            playerName: dbUser.name || 'Unknown',
            clubName: dbUser.clubName || dbUser.club?.name,
            currentBelt: dbUser.belt || 'White',
            targetBelt: getNextBelt(dbUser.belt || 'White'), // Calculated automatically
            age: age,
            status: 'PENDING',
            paymentStatus: 'UNPAID'
        }
    })

    revalidatePath(`/promotions/${promotionTestId}`)
    return { success: true }
}

export async function registerForSeminar(seminarId: string) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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

    await prisma.seminarRegistration.create({
        data: {
            seminarId,
            playerId: dbUser.id,
            playerName: dbUser.name || 'Unknown',
            clubName: dbUser.clubName || dbUser.club?.name,
            belt: dbUser.belt || 'White',
            age: age,
            status: 'PENDING'
        }
    })

    revalidatePath(`/seminars/${seminarId}`)
    return { success: true }
}

// ============================================
// CLUB MEMBER MANAGEMENT (FOR ORGANIZATION)
// ============================================

export async function getClubMembersForOrg(clubId: string) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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

export async function updateClubMemberAsOrg(userId: string, data: {
    name?: string,
    belt?: string,
    gender?: string,
    weight?: number,
    height?: number
}) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    // 1. Verify Requestor is Org Admin/Owner
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
            name: data.name || undefined,
            belt: data.belt || undefined,
            gender: data.gender || undefined,
            weight: data.weight || undefined,
            height: data.height || undefined
        }
    })

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

    return `${prefix}${String(nextNumber).padStart(5, '0')}`
}

export async function getOrganizationAthletes() {
    const user = await currentUser()
    if (!user) return []

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
        },
        orderBy: { name: 'asc' }
    })

    return athletes
}

export async function toggleAthleteCardStatus(athleteId: string) {
    const user = await currentUser()
    if (!user) return { error: 'Unauthorized' }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
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
        // Activate: generate athlete number
        const athleteNumber = targetUser.athleteNumber || await generateAthleteNumber(targetUser.country)
        await prisma.user.update({
            where: { id: athleteId },
            data: {
                isVerified: true,
                athleteNumber,
                createdAt: new Date(),
            }
        })
    } else {
        // Deactivate: clear athlete number
        await prisma.user.update({
            where: { id: athleteId },
            data: {
                isVerified: false,
                athleteNumber: null,
                createdAt: null,
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
    const user = await currentUser()
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: { organization: true }
    })

    if (!dbUser?.organization) return null
    if (!['ORGANIZER', 'MANAGER', 'ADMIN'].includes(dbUser.role)) return null

    const orgId = dbUser.organization.id

    const [promotionTests, seminars] = await Promise.all([
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
        })
    ])

    // Build per-event financial breakdown
    const promotionBreakdown = promotionTests.map(pt => {
        const fee = pt.fee || 0
        const totalRegs = pt.registrations.length
        const paidCount = pt.registrations.filter(r => r.paymentStatus === 'PAID').length
        const unpaidCount = pt.registrations.filter(r => r.paymentStatus === 'UNPAID').length
        return {
            id: pt.id,
            type: 'promotion' as const,
            name: pt.name,
            date: pt.testDate.toISOString(),
            status: pt.status,
            fee,
            totalRegistrations: totalRegs,
            paidCount,
            unpaidCount,
            totalCollected: paidCount * fee,
            totalExpected: totalRegs * fee,
        }
    })

    const seminarBreakdown = seminars.map(s => {
        const fee = s.fee || 0
        const approvedRegs = s.registrations.filter(r => r.status === 'APPROVED')
        const totalRegs = s.registrations.length
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
        }
    })

    const allEvents = [...promotionBreakdown, ...seminarBreakdown]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Aggregated totals
    const totalRevenue = allEvents.reduce((sum, e) => sum + e.totalExpected, 0)
    const totalCollected = allEvents.reduce((sum, e) => sum + e.totalCollected, 0)
    const totalPending = totalRevenue - totalCollected
    const totalRegistrations = allEvents.reduce((sum, e) => sum + e.totalRegistrations, 0)

    // Monthly revenue data for bar chart (last 12 months)
    const monthlyData: { month: string; promotions: number; seminars: number }[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        const year = d.getFullYear()
        const month = d.getMonth()

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

        monthlyData.push({ month: monthKey, promotions: promoRevenue, seminars: semRevenue })
    }

    return {
        summary: { totalRevenue, totalCollected, totalPending, totalRegistrations },
        events: allEvents,
        monthlyData,
    }
}
