'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { currentUser } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export async function getOrganizationDashboardData() {
    const user = await currentUser()
    console.log("Server Action: getOrganizationDashboardData - Clerk User:", user?.id)
    if (!user) return null

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: {
            organization: {
                include: {
                    affiliatedOrganizations: true
                }
            }
        }
    })
    console.log("Server Action: dbUser found:", dbUser?.id)
    console.log("Server Action: Org found:", dbUser?.organization?.name)

    if (!dbUser || !dbUser.organization) {
        console.log("Server Action: returning NULL because user or org is missing")
        return null
    }
    const orgId = dbUser.organization.id

    // Fetch Affiliated Clubs with Master details
    const affiliatedClubs = await prisma.club.findMany({
        where: { organizationId: orgId },
        include: {
            students: true,
            master: true // Include the User who is the master
        }
    })

    // Fetch Affiliated Organizations (already fetched but let's be safe if we need more depth)
    const affiliatedOrgs = dbUser.organization.affiliatedOrganizations

    // Fetch All Members (Students) across direct clubs
    const clubIds = affiliatedClubs.map(c => c.id)
    const recentMembers = await prisma.player.findMany({
        where: { clubId: { in: clubIds } },
        // orderBy: { createdAt: 'desc' }, // Temporarily disabled to resolve schema sync issue
        take: 5,
        include: {
            club: true,
            user: { select: { email: true, name: true, belt: true } },
            category: { select: { name: true, tournament: { select: { name: true } } } }
        }
    })

    // Calculate Top Performing Clubs (by member count)
    const topClubs = affiliatedClubs
        .map(club => ({
            id: club.id,
            name: club.name,
            logoUrl: club.logoUrl,
            memberCount: club.students.length,
            masterName: club.master?.name || "Unknown",
            masterEmail: club.master?.email
        }))
        .sort((a, b) => b.memberCount - a.memberCount)
        .slice(0, 5)


    // Calculate Stats
    const totalDirectMembers = affiliatedClubs.reduce((acc, club) => acc + club.students.length, 0)

    // For affiliated orgs member count, allow a separate query to be precise
    // Since we didn't deep fetch aligned organizations' clubs in the initial query for performance
    const affiliatedOrgsMemberCounts = await Promise.all(
        affiliatedOrgs.map(async (org) => {
            const orgClubs = await prisma.club.findMany({
                where: { organizationId: org.id },
                include: { students: true }
            })
            const count = orgClubs.reduce((acc, c) => acc + c.students.length, 0)
            return { orgId: org.id, count, clubsCount: orgClubs.length }
        })
    )

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
            memberCount: c.students.length,
            contactPhone: c.phone,
            address: c.address,
            status: c.status
        })),
        affiliatedOrgs: affiliatedOrgsWithStats,
        recentMembers,
        announcements: await getOrganizationAnnouncements(orgId, 5),
        promotionTests: await getOrganizationPromotionTests(orgId, 5)
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
    const feeStr = formData.get('fee') as string
    const visibility = (formData.get('visibility') as string) || 'PRIVATE'
    const bannerFile = formData.get('banner') as File | null

    if (!name || !testDate) return { error: 'Name and test date are required' }

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
            const filename = `promo-banner-${timestamp}-${safeName}`

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

    const promotionTest = await prisma.promotionTest.create({
        data: {
            organizationId: dbUser.organization.id,
            name,
            description: description || null,
            testDate: new Date(testDate),
            registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
            venue: venue || null,
            fee: feeStr ? parseFloat(feeStr) : null,
            status: 'UPCOMING',
            visibility,
            bannerUrl
        }
    })

    return { success: true, promotionTest }
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

    if (!dbUser?.organization) return { error: 'No organization found' }

    const promotionTest = await prisma.promotionTest.findUnique({
        where: { id: promotionTestId }
    })

    if (!promotionTest || promotionTest.organizationId !== dbUser.organization.id) {
        return { error: 'Promotion test not found or unauthorized' }
    }

    await prisma.promotionTest.delete({ where: { id: promotionTestId } })

    return { success: true }
}

// ============================================
// ORGANIZATION SETTINGS ACTIONS
// ============================================

export async function updateOrganizationSettings(formData: FormData) {
    try {
        const organizationId = formData.get('organizationId') as string
        const logoFile = formData.get('logo') as File | null
        const address = formData.get('address') as string | null
        const phone = formData.get('phone') as string | null

        if (!organizationId) return { error: 'Organization ID is required' }

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

        const updateData: any = {}
        if (address !== null) updateData.address = address
        if (phone !== null) updateData.contactPhone = phone // Mapping 'phone' form field to 'contactPhone' schema field

        // Handle File Upload
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

        await prisma.organization.update({
            where: { id: organizationId },
            data: updateData
        })

        // Revalidate relevant paths
        // revalidatePath('/organization') // Depending on where this is used
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
