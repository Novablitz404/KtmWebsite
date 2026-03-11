import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
    const user = await getAuthUser()
    if (!user) return redirect('/sign-in')

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id }
    })

    if (!dbUser || dbUser.role !== 'ADMIN') {
        return redirect('/')
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parallel Data Fetching
    const [stats, pendingOrgs, potentialOwners, newUsersThisMonth, newTournamentRegs, newSeminarRegs, newPromotionRegs] = await Promise.all([
        // 1. Stats
        prisma.user.groupBy({
            by: ['role'],
            _count: { role: true }
        }),
        // 2. Pending Organizations
        prisma.organization.findMany({
            where: { status: 'PENDING' },
            include: {
                owner: { select: { name: true, email: true } }
            },
            orderBy: { createdAt: 'desc' }
        }),
        // 3. Potential API Key Owners (Organizers & Admins)
        prisma.user.findMany({
            where: {
                OR: [{ role: 'ORGANIZER' }, { role: 'ADMIN' }]
            },
            select: { id: true, name: true, email: true, role: true },
            orderBy: { name: 'asc' }
        }),
        // 4. New Users This Month (via Supabase auth.users since User.createdAt is only set on card generation)
        prisma.$queryRaw<[{ count: bigint }]>`
            SELECT COUNT(*)::bigint as count
            FROM "User" u
            JOIN auth.users au ON u."clerkId" = au.id::text
            WHERE au.created_at >= ${startOfMonth}
        `,
        // 5. New Tournament Registrations
        prisma.player.count({ where: { createdAt: { gte: startOfMonth } } }),
        // 6. New Seminar Registrations
        prisma.seminarRegistration.count({ where: { createdAt: { gte: startOfMonth } } }),
        // 7. New Promotion Test Registrations
        prisma.promotionTestRegistration.count({ where: { createdAt: { gte: startOfMonth } } })
    ])

    // Process Stats
    const countByRole = stats.reduce((acc, curr) => {
        acc[curr.role] = curr._count.role
        return acc
    }, {} as Record<string, number>)
    const totalUsers = Object.values(countByRole).reduce((a, b) => a + b, 0)

    const processedStats = {
        totalUsers,
        countByRole,
        newUsersThisMonth: Number(newUsersThisMonth[0]?.count ?? 0),
        newRegistrationsThisMonth: newTournamentRegs + newSeminarRegs + newPromotionRegs
    }

    // Format Data for Client
    const formattedPendingOrgs = pendingOrgs.map(org => ({
        ...org,
        createdAt: org.createdAt // Serialize if needed, but Server Components pass Dates fine to Client Components in recent Next.js
    }))

    const userData = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        imageUrl: user.imageUrl
    }

    return (
        <AdminDashboard
            user={userData}
            stats={processedStats}
            pendingOrganizations={formattedPendingOrgs}
            usersForKeys={potentialOwners}
        />
    )
}

