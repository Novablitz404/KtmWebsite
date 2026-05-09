'use server'

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { countryToCode } from '@/lib/countries'

export async function promoteToOrganizer(formData: FormData) {
    const user = await getAuthUser()

    // Verify Admin
    if (!user) {
        throw new Error('Not authenticated')
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id }
    })

    if (dbUser?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    const targetUserId = formData.get('userId') as string
    if (!targetUserId) throw new Error('User ID required')

    await prisma.user.update({
        where: { id: targetUserId },
        data: { role: 'ORGANIZER' }
    })

    revalidatePath('/admin')
}

export async function updateAdminProfile(fullName: string) {
    const user = await getAuthUser();
    if (!user) throw new Error('Not authenticated');

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized');

    await prisma.user.update({
        where: { id: dbUser.id },
        data: { name: fullName }
    });

    // Cascade all profile changes (name) to related records
    const { cascadeUserProfile } = await import('@/lib/cascadeUserProfile')
    cascadeUserProfile(dbUser.id).catch(console.error)

    revalidatePath('/admin/profile');
    revalidatePath('/admin'); // Update sidebar name too
}

// ============================================
// ORGANIZATION APPROVAL (Admin approves pending organizations)
// ============================================

export async function getPendingOrganizations() {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const pendingOrgs = await prisma.organization.findMany({
        where: { status: 'PENDING' },
        include: {
            owner: {
                select: { name: true, email: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return pendingOrgs
}

export async function approveOrganization(orgId: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    await prisma.organization.update({
        where: { id: orgId },
        data: { status: 'APPROVED' }
    })

    revalidatePath('/')
    revalidatePath('/admin')
}

export async function rejectOrganization(orgId: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    await prisma.organization.update({
        where: { id: orgId },
        data: { status: 'REJECTED' }
    })

    revalidatePath('/')
    revalidatePath('/admin')
}



export async function promoteToClubMaster(formData: FormData) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const targetUserId = formData.get('userId') as string
    const clubName = formData.get('clubName') as string

    if (!targetUserId) throw new Error('User ID required')
    if (!clubName) throw new Error('Club name required')

    await prisma.user.update({
        where: { id: targetUserId },
        data: {
            role: 'CLUB_MASTER',
            clubName
        }
    })

    revalidatePath('/admin/users')
}



async function generateAthleteNumber(country: string | null | undefined): Promise<string> {
    const code = countryToCode(country)
    const year = new Date().getFullYear()
    const prefix = `${code}-${year}-`

    // Find the highest existing athlete number with this prefix
    const existing = await prisma.user.findMany({
        where: {
            athleteNumber: { startsWith: prefix }
        },
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

export async function toggleAthleteVerification(formData: FormData) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const targetUserId = formData.get('userId') as string
    if (!targetUserId) throw new Error('User ID required')

    // Get current status + country for athlete number generation
    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { isVerified: true, athleteNumber: true, country: true }
    })

    if (!targetUser) throw new Error('User not found')

    if (!targetUser.isVerified) {
        // Verifying: generate or renew athlete number
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
            where: { id: targetUserId },
            data: {
                isVerified: true,
                athleteNumber,
                createdAt: new Date(),
            }
        })
    } else {
        // Un-verifying: preserve athleteNumber for future renewal
        await prisma.user.update({
            where: { id: targetUserId },
            data: {
                isVerified: false,
                // athleteNumber is preserved for renewal
            }
        })
    }

    revalidatePath('/admin/users')
}

// ============= Delete User Action =============

export async function deleteUser(formData: FormData) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const targetUserId = formData.get('userId') as string
    if (!targetUserId) throw new Error('User ID required')

    // Find the target user to get their clerkId
    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, clerkId: true, role: true }
    })

    if (!targetUser) throw new Error('User not found')

    // Prevent deleting admins
    if (targetUser.role === 'ADMIN') {
        throw new Error('Cannot delete admin users')
    }

    // Prevent self-deletion
    if (targetUser.id === dbUser.id) {
        throw new Error('Cannot delete yourself')
    }

    // 1. Delete from Supabase Auth (if they have a clerkId / auth UUID)
    if (targetUser.clerkId) {
        try {
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!,
                { auth: { autoRefreshToken: false, persistSession: false } }
            )
            await supabaseAdmin.auth.admin.deleteUser(targetUser.clerkId)
        } catch (error) {
            console.error('Failed to delete user from Supabase Auth:', error)
        }
    }

    // 2. Delete related records that don't have CASCADE
    // Delete API keys (has cascade in schema, but let's be explicit)
    await prisma.apiKey.deleteMany({ where: { ownerId: targetUserId } })

    // Update players to remove user association (orphan them instead of delete)
    await prisma.player.updateMany({
        where: { userId: targetUserId },
        data: { userId: null }
    })

    // If user is a club master, delete their club
    await prisma.club.deleteMany({ where: { masterId: targetUserId } })

    // If user is an organizer, delete their organization
    await prisma.organization.deleteMany({ where: { ownerId: targetUserId } })

    // 3. Delete the user from database
    await prisma.user.delete({ where: { id: targetUserId } })

    revalidatePath('/admin/users')
}

export async function getSidebarStats() {
    const [userCount, tournamentCount, apiKeyCount] = await Promise.all([
        prisma.user.count(),
        prisma.tournament.count(),
        prisma.apiKey.count()
    ])

    return {
        users: userCount,
        tournaments: tournamentCount,
        apiKeys: apiKeyCount
    }
}

// ============================================
// PLATFORM CONFIG ACTIONS
// ============================================

export async function getPlatformConfig() {
    const config = await prisma.platformConfig.upsert({
        where: { id: 'platform' },
        create: { id: 'platform', platformFee: 0 },
        update: {},
    })
    return config
}

export async function updatePlatformBankDetails(data: { bankName: string, accountName: string, accountNumber: string }) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    await prisma.platformConfig.upsert({
        where: { id: 'platform' },
        create: {
            id: 'platform',
            platformFee: 0,
            ...data
        },
        update: {
            ...data
        }
    })
}

export async function updatePlatformCompanyDetails(data: { companyName: string, companyAddress: string }) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    await prisma.platformConfig.upsert({
        where: { id: 'platform' },
        create: {
            id: 'platform',
            platformFee: 0,
            ...data
        },
        update: {
            ...data
        }
    })
}

// ============================================
// ADMIN PLATFORM GROWTH (For Bar Charts)
// ============================================

export async function getPlatformGrowth() {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    // Generate last 6 months
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        d.setDate(1)
        d.setHours(0, 0, 0, 0)
        return {
            date: d,
            label: d.toLocaleDateString('en-US', { month: 'short' })
        }
    }).reverse()

    // Query data in parallel
    const [authUsers, tournaments, seminars, promotions] = await Promise.all([
        prisma.$queryRaw<{ created_at: Date }[]>`
            SELECT au.created_at
            FROM "User" u
            JOIN auth.users au ON u."clerkId" = au.id::text
            WHERE au.created_at >= ${months[0].date}
        `,
        prisma.player.findMany({ select: { createdAt: true }, where: { createdAt: { gte: months[0].date } } }),
        prisma.seminarRegistration.findMany({ select: { createdAt: true }, where: { createdAt: { gte: months[0].date } } }),
        prisma.promotionTestRegistration.findMany({ select: { createdAt: true }, where: { createdAt: { gte: months[0].date } } })
    ])

    // Grouping helper
    const groupByMonth = (items: { createdAt?: Date | null, created_at?: Date | null }[]) => {
        const counts = new Map(months.map(m => [m.label, 0]))
        items.forEach(item => {
            const date = item.createdAt || item.created_at
            if (!date) return
            const label = new Date(date).toLocaleDateString('en-US', { month: 'short' })
            if (counts.has(label)) {
                counts.set(label, counts.get(label)! + 1)
            }
        })
        return counts
    }

    const userCounts = groupByMonth(authUsers)
    const tCounts = groupByMonth(tournaments)
    const sCounts = groupByMonth(seminars)
    const pCounts = groupByMonth(promotions)

    return months.map(m => ({
        month: m.label,
        users: userCounts.get(m.label) || 0,
        registrations: (tCounts.get(m.label) || 0) + (sCounts.get(m.label) || 0) + (pCounts.get(m.label) || 0)
    }))
}

export async function updatePlatformFee(fee: number) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    await prisma.platformConfig.upsert({
        where: { id: 'platform' },
        create: { id: 'platform', platformFee: fee },
        update: { platformFee: fee },
    })

    revalidatePath('/admin')
    return { success: true }
}

// ============================================
// ADMIN FINANCIALS (Platform-Wide Revenue)
// ============================================

export async function getAdminFinancials() {
    const user = await getAuthUser()
    if (!user) return null
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser || dbUser.role !== 'ADMIN') return null

    // Get platform fee
    const config = await prisma.platformConfig.upsert({
        where: { id: 'platform' },
        create: { id: 'platform', platformFee: 0 },
        update: {},
    })
    const platformFee = config.platformFee || 0

    // Fetch ALL events across ALL organizations
    const [tournaments, seminars, promotionTests, affiliations] = await Promise.all([
        prisma.tournament.findMany({
            select: {
                id: true,
                name: true,
                startDate: true,
                status: true,
                organizer: { select: { name: true, organization: { select: { name: true } } } },
                categories: {
                    select: {
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
        }),
        prisma.seminar.findMany({
            include: {
                organization: { select: { name: true } },
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
        prisma.promotionTest.findMany({
            include: {
                organization: { select: { name: true } },
                registrations: {
                    select: {
                        id: true,
                        paymentStatus: true,
                        playerName: true,
                        clubName: true,
                        createdAt: true,
                    }
                }
            },
            orderBy: { testDate: 'desc' }
        }),
        prisma.clubAffiliation.findMany({
            where: { paymentStatus: 'PAID' },
            include: {
                club: { select: { name: true } },
                organization: { select: { name: true } },
            },
            orderBy: { paidAt: 'desc' }
        }),
    ])

    // --- Tournaments ---
    const tournamentBreakdown = tournaments.map(t => {
        let totalRegs = 0
        let paidCount = 0
        const mappedRegistrations: any[] = []

        for (const category of t.categories) {
            for (const player of category.players) {
                totalRegs++
                const isPaid = player.registrationStatus === 'APPROVED'
                if (isPaid) paidCount++

                mappedRegistrations.push({
                    id: player.id,
                    playerName: player.name || 'Player',
                    clubName: player.club?.name || 'Independent',
                    status: isPaid ? 'PAID' : 'UNPAID',
                    amountPaid: isPaid ? platformFee : 0,
                })
            }
        }

        const orgName = t.organizer?.organization?.name || 'Unknown'
        return {
            id: t.id,
            type: 'tournament' as const,
            name: t.name,
            organization: orgName,
            date: t.startDate.toISOString(),
            totalRegistrations: totalRegs,
            paidCount,
            totalCollected: paidCount * platformFee,
            registrations: mappedRegistrations,
        }
    })

    // --- Seminars ---
    const seminarBreakdown = seminars.map(s => {
        const approvedRegs = s.registrations.filter(r => r.status === 'APPROVED')
        const totalRegs = s.registrations.length

        const mappedRegistrations = s.registrations.map(r => {
            const isPaid = r.status === 'APPROVED'
            return {
                id: r.id,
                playerName: r.playerName,
                clubName: r.clubName || 'Independent',
                status: isPaid ? 'PAID' : 'UNPAID',
                amountPaid: isPaid ? platformFee : 0,
            }
        })

        return {
            id: s.id,
            type: 'seminar' as const,
            name: s.name,
            organization: s.organization?.name || 'Unknown',
            date: s.startDate.toISOString(),
            totalRegistrations: totalRegs,
            paidCount: approvedRegs.length,
            totalCollected: approvedRegs.length * platformFee,
            registrations: mappedRegistrations,
        }
    })

    // --- Promotion Tests ---
    const promotionBreakdown = promotionTests.map(pt => {
        const paidRegs = pt.registrations.filter(r => r.paymentStatus === 'PAID')
        const totalRegs = pt.registrations.length

        const mappedRegistrations = pt.registrations.map(r => {
            const isPaid = r.paymentStatus === 'PAID'
            return {
                id: r.id,
                playerName: r.playerName,
                clubName: r.clubName || 'Independent',
                status: isPaid ? 'PAID' : 'UNPAID',
                amountPaid: isPaid ? platformFee : 0,
            }
        })

        return {
            id: pt.id,
            type: 'promotion' as const,
            name: pt.name,
            organization: pt.organization?.name || 'Unknown',
            date: pt.testDate.toISOString(),
            totalRegistrations: totalRegs,
            paidCount: paidRegs.length,
            totalCollected: paidRegs.length * platformFee,
            registrations: mappedRegistrations,
        }
    })

    // --- Affiliations ---
    const affiliationBreakdown = affiliations.map(a => ({
        id: a.id,
        type: 'affiliation' as const,
        name: `${a.club.name} — Affiliation`,
        organization: a.organization?.name || 'Unknown',
        date: (a.paidAt || a.createdAt).toISOString(),
        totalRegistrations: 1,
        paidCount: 1,
        totalCollected: platformFee,
        registrations: [{
            id: a.id,
            playerName: a.club.name,
            clubName: a.club.name,
            status: 'PAID',
            amountPaid: platformFee,
        }],
    }))

    // Combine all
    const allItems = [...tournamentBreakdown, ...seminarBreakdown, ...promotionBreakdown, ...affiliationBreakdown]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const totalPaidRegistrations = allItems.reduce((s, e) => s + e.paidCount, 0)
    const totalCollected = totalPaidRegistrations * platformFee
    const totalRegistrations = allItems.reduce((s, e) => s + e.totalRegistrations, 0)

    // Revenue by type
    const revenueByType = {
        tournaments: tournamentBreakdown.reduce((s, e) => s + e.totalCollected, 0),
        promotions: promotionBreakdown.reduce((s, e) => s + e.totalCollected, 0),
        seminars: seminarBreakdown.reduce((s, e) => s + e.totalCollected, 0),
        affiliations: affiliationBreakdown.reduce((s, e) => s + e.totalCollected, 0),
    }

    // YoY comparison
    const now = new Date()
    const currentYear = now.getFullYear()
    const thisYearItems = allItems.filter(e => new Date(e.date).getFullYear() === currentYear)
    const lastYearItems = allItems.filter(e => new Date(e.date).getFullYear() === currentYear - 1)
    const thisYearCollected = thisYearItems.reduce((s, e) => s + e.totalCollected, 0)
    const lastYearCollected = lastYearItems.reduce((s, e) => s + e.totalCollected, 0)
    const yoyChange = lastYearCollected > 0 ? Math.round(((thisYearCollected - lastYearCollected) / lastYearCollected) * 100) : (thisYearCollected > 0 ? 100 : 0)

    // Monthly data (last 12 months)
    const monthlyData: { month: string; tournaments: number; promotions: number; seminars: number; affiliations: number }[] = []
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthKey = d.toLocaleDateString('en-US', { month: 'short' })
        const year = d.getFullYear()
        const month = d.getMonth()

        const inMonth = (dateStr: string) => {
            const ed = new Date(dateStr)
            return ed.getFullYear() === year && ed.getMonth() === month
        }

        monthlyData.push({
            month: monthKey,
            tournaments: tournamentBreakdown.filter(e => inMonth(e.date)).reduce((s, e) => s + e.totalCollected, 0),
            promotions: promotionBreakdown.filter(e => inMonth(e.date)).reduce((s, e) => s + e.totalCollected, 0),
            seminars: seminarBreakdown.filter(e => inMonth(e.date)).reduce((s, e) => s + e.totalCollected, 0),
            affiliations: affiliationBreakdown.filter(e => inMonth(e.date)).reduce((s, e) => s + e.totalCollected, 0),
        })
    }

    return {
        platformFee,
        summary: {
            totalCollected,
            totalPaidRegistrations,
            totalRegistrations,
        },
        events: allItems,
        monthlyData,
        revenueByType,
        yoy: {
            thisYear: thisYearCollected,
            lastYear: lastYearCollected,
            changePercent: yoyChange,
            currentYear,
        },
    }
}


// ============================================
// ADMIN INVOICING ACTIONS
// ============================================

export async function getBillingOrgsForMonth(year: number, month: number) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const config = await prisma.platformConfig.findUnique({ where: { id: 'platform' } })
    const platformFee = config?.platformFee || 0

    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 1)

    const [tournaments, seminars, promotionTests, affiliations] = await Promise.all([
        prisma.tournament.findMany({
            where: { startDate: { gte: startDate, lt: endDate } },
            select: {
                id: true, name: true, startDate: true,
                organizer: { select: { organization: { select: { id: true, name: true, address: true, contactPhone: true, owner: { select: { email: true, name: true } } } } } },
                categories: { select: { players: { select: { registrationStatus: true, name: true, club: { select: { name: true } } } } } }
            }
        }),
        prisma.seminar.findMany({
            where: {
                registrations: {
                    some: {
                        status: 'APPROVED',
                        createdAt: { gte: startDate, lt: endDate }
                    }
                }
            },
            select: {
                id: true, name: true, startDate: true,
                organization: { select: { id: true, name: true, address: true, contactPhone: true, owner: { select: { email: true, name: true } } } },
                registrations: {
                    where: { status: 'APPROVED', createdAt: { gte: startDate, lt: endDate } },
                    select: { status: true, playerName: true, clubName: true }
                }
            }
        }),
        prisma.promotionTest.findMany({
            where: {
                registrations: {
                    some: {
                        paymentStatus: 'PAID',
                        createdAt: { gte: startDate, lt: endDate }
                    }
                }
            },
            select: {
                id: true, name: true, testDate: true,
                organization: { select: { id: true, name: true, address: true, contactPhone: true, owner: { select: { email: true, name: true } } } },
                registrations: {
                    where: { paymentStatus: 'PAID', createdAt: { gte: startDate, lt: endDate } },
                    select: { paymentStatus: true, playerName: true, clubName: true }
                }
            }
        }),
        prisma.clubAffiliation.findMany({
            where: { paymentStatus: 'PAID', createdAt: { gte: startDate, lt: endDate } },
            select: {
                id: true, createdAt: true, club: { select: { name: true } },
                organization: { select: { id: true, name: true, address: true, contactPhone: true, owner: { select: { email: true, name: true } } } }
            }
        })
    ])

    type OrgData = {
        id: string
        name: string
        address: string | null
        contactPhone: string | null
        contactEmail: string | null
        events: Array<{
            id: string
            name: string
            type: string
            date: string
            paidRegistrations: number
            totalPlatformFee: number
            registrations: Array<{ playerName: string, clubName: string, amount: number }>
        }>
        totalAmountDue: number
    }
    const orgsMap = new Map<string, OrgData>()

    function getOrInitOrg(orgObj: any) {
        if (!orgObj || !orgObj.id) return null
        if (!orgsMap.has(orgObj.id)) {
            orgsMap.set(orgObj.id, {
                id: orgObj.id,
                name: orgObj.name,
                address: orgObj.address,
                contactPhone: orgObj.contactPhone,
                contactEmail: orgObj.owner?.email || null,
                events: [],
                totalAmountDue: 0
            })
        }
        return orgsMap.get(orgObj.id)!
    }

    for (const t of tournaments) {
        const orgInfo = t.organizer?.organization
        const org = getOrInitOrg(orgInfo)
        if (!org) continue

        let paidCount = 0
        const eventRegs: Array<{ playerName: string, clubName: string, amount: number }> = []

        t.categories.forEach((c: any) => c.players.forEach((p: any) => {
            if (p.registrationStatus === 'APPROVED') {
                paidCount++
                eventRegs.push({
                    playerName: p.name.trim(),
                    clubName: p.club?.name || 'Independent',
                    amount: platformFee
                })
            }
        }))

        if (paidCount > 0) {
            const fee = paidCount * platformFee
            org.events.push({
                id: t.id, name: t.name, type: 'tournament',
                date: t.startDate.toISOString(), paidRegistrations: paidCount, totalPlatformFee: fee,
                registrations: eventRegs
            })
            org.totalAmountDue += fee
        }
    }

    for (const s of seminars) {
        const org = getOrInitOrg(s.organization)
        if (!org) continue

        let paidCount = 0
        const eventRegs: Array<{ playerName: string, clubName: string, amount: number }> = []

        s.registrations.forEach(r => {
            if (r.status === 'APPROVED') {
                paidCount++
                eventRegs.push({
                    playerName: r.playerName,
                    clubName: r.clubName || 'Unknown',
                    amount: platformFee
                })
            }
        })

        if (paidCount > 0) {
            const fee = paidCount * platformFee
            org.events.push({
                id: s.id, name: s.name, type: 'seminar',
                date: s.startDate.toISOString(), paidRegistrations: paidCount, totalPlatformFee: fee,
                registrations: eventRegs
            })
            org.totalAmountDue += fee
        }
    }

    for (const p of promotionTests) {
        const org = getOrInitOrg(p.organization)
        if (!org) continue

        let paidCount = 0
        const eventRegs: Array<{ playerName: string, clubName: string, amount: number }> = []

        p.registrations.forEach(r => {
            if (r.paymentStatus === 'PAID') {
                paidCount++
                eventRegs.push({
                    playerName: r.playerName,
                    clubName: r.clubName || 'Unknown',
                    amount: platformFee
                })
            }
        })

        if (paidCount > 0) {
            const fee = paidCount * platformFee
            org.events.push({
                id: p.id, name: p.name, type: 'promotion',
                date: p.testDate.toISOString(), paidRegistrations: paidCount, totalPlatformFee: fee,
                registrations: eventRegs
            })
            org.totalAmountDue += fee
        }
    }

    for (const a of affiliations) {
        const org = getOrInitOrg(a.organization)
        if (!org) continue

        org.events.push({
            id: a.id, name: `${a.club.name} Affiliation`, type: 'affiliation',
            date: a.createdAt.toISOString(), paidRegistrations: 1, totalPlatformFee: platformFee,
            registrations: [{ playerName: a.club.name, clubName: 'Affiliation Fee', amount: platformFee }]
        })
        org.totalAmountDue += platformFee
    }

    return Array.from(orgsMap.values())
        .filter(org => org.totalAmountDue > 0)
        .sort((a, b) => b.totalAmountDue - a.totalAmountDue)
}

export async function sendInvoiceEmail(orgId: string, email: string, orgName: string, monthStr: string, amountDue: number, pdfBase64: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    if (!process.env.RESEND_API_KEY) {
        return { success: true, message: "Skipped email sending (no API Key)" }
    }

    try {
        const { Resend } = await import('resend')
        const { InvoiceEmail } = await import('../../emails/InvoiceEmail')
        const resend = new Resend(process.env.RESEND_API_KEY)

        // Upsert the invoice record in the database
        await prisma.platformInvoice.upsert({
            where: {
                organizationId_billingMonth: {
                    organizationId: orgId,
                    billingMonth: monthStr
                }
            },
            create: {
                organizationId: orgId,
                billingMonth: monthStr,
                amountDue: amountDue,
                status: 'UNPAID',
            },
            update: {
                amountDue: amountDue,
                sentAt: new Date(),
            }
        })

        // Resend API allows base64 content in attachments
        await resend.emails.send({
                from: 'KTM Platform <noreply@wo-tf.com>',
            to: [email],
            subject: `KTM Monthly Billing Invoice - ${monthStr}`,
            react: InvoiceEmail({ orgName, monthStr }),
            attachments: [
                {
                    filename: `${orgName.replace(/\s+/g, '-')}-Invoice-${monthStr.replace(/\s+/g, '-')}.pdf`,
                    content: pdfBase64.split(',')[1] || pdfBase64,
                }
            ]
        })

        return { success: true }
    } catch (e: any) {
        console.error('Invoice Email Error:', e)
        throw new Error('Failed to send invoice email')
    }
}

export async function getPlatformInvoices() {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    return await prisma.platformInvoice.findMany({
        include: {
            organization: { select: { name: true, contactEmail: true } }
        },
        orderBy: { sentAt: 'desc' }
    })
}

export async function markInvoiceAsPaid(invoiceId: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')
    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    await prisma.platformInvoice.update({
        where: { id: invoiceId },
        data: {
            status: 'PAID',
            paidAt: new Date()
        }
    })

    return { success: true }
}

export async function updateAdminUserDetails(userId: string, data: any) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
    })

    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    await prisma.user.update({
        where: { id: userId },
        data: {
            birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
            weight: data.weight ? parseFloat(data.weight) : undefined,
            height: data.height ? parseFloat(data.height) : undefined,
            belt: data.belt,
            gender: data.gender,
            clubName: data.clubName,
            athleteNumber: data.athleteNumber,
            country: data.country
        }
    })

    revalidatePath('/admin/users')
}

export async function adminResetPassword(targetUserId: string) {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const adminUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } })
    if (adminUser?.role !== 'ADMIN') throw new Error('Unauthorized')

    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, clerkId: true, email: true, name: true }
    })

    if (!targetUser) throw new Error('User not found')

    // Generate a random 8-character password
    const crypto = await import('crypto')
    const newPassword = crypto.randomBytes(4).toString('hex') // e.g. "a3f8b2c1"

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const isSupabaseUUID = targetUser.clerkId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUser.clerkId)

    if (isSupabaseUUID) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUser.clerkId!, { password: newPassword })
        if (error) {
            console.error('[admin-reset-password] Update error:', error.message)
            throw new Error('Failed to reset password.')
        }
    } else {
        // User has no Supabase Auth account yet — create one
        const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: targetUser.email,
            password: newPassword,
            email_confirm: true,
        })

        if (createError) {
            if (createError.message.includes('already been registered') || createError.message.includes('already exists')) {
                const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
                const existingAuthUser = listData?.users?.find(
                    u => u.email?.toLowerCase() === targetUser.email.toLowerCase()
                )
                if (existingAuthUser) {
                    await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, { password: newPassword })
                    await prisma.user.update({ where: { id: targetUser.id }, data: { clerkId: existingAuthUser.id } })
                }
            } else {
                console.error('[admin-reset-password] Create error:', createError.message)
                throw new Error('Failed to create auth account.')
            }
        } else {
            await prisma.user.update({
                where: { id: targetUser.id },
                data: { clerkId: newAuthUser.user.id }
            })
        }
    }

    // Set the mustChangePassword flag
    await prisma.user.update({
        where: { id: targetUser.id },
        data: { mustChangePassword: true }
    })

    // Send email with temporary password
    if (process.env.RESEND_API_KEY) {
        try {
            const { Resend } = await import('resend')
            const { PasswordResetEmail } = await import('../../emails/PasswordResetEmail')
            const resend = new Resend(process.env.RESEND_API_KEY)

            await resend.emails.send({
                from: 'KTM Platform <noreply@wo-tf.com>',
                to: [targetUser.email],
                subject: 'Your password has been reset',
                react: PasswordResetEmail({
                    userName: targetUser.name || 'User',
                    temporaryPassword: newPassword,
                }),
            })
            console.log(`[admin-reset-password] Email sent to ${targetUser.email}`)
        } catch (emailError) {
            console.error('[admin-reset-password] Email send failed:', emailError)
            // Don't throw — password was already reset successfully
        }
    }

    return { success: true }
}


