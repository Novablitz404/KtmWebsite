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

    // Parallel Data Fetching
    const [stats, pendingOrgs, potentialOwners, approvedTournamentRegistrations, approvedSeminarRegistrations] = await Promise.all([
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
        // 4. Count approved tournament registrations
        prisma.player.count({
            where: { registrationStatus: 'APPROVED' }
        }),
        // 5. Count approved seminar registrations
        prisma.seminarRegistration.count({
            where: { status: 'APPROVED' }
        })
    ])

    // Process Stats
    const countByRole = stats.reduce((acc, curr) => {
        acc[curr.role] = curr._count.role
        return acc
    }, {} as Record<string, number>)
    const totalUsers = Object.values(countByRole).reduce((a, b) => a + b, 0)

    // Calculate Revenue (100 pesos per approved registration)
    const FEE_PER_REGISTRATION = 100
    const totalRevenue = (approvedTournamentRegistrations + approvedSeminarRegistrations) * FEE_PER_REGISTRATION

    const processedStats = {
        totalUsers,
        countByRole,
        totalRevenue,
        approvedTournamentRegistrations,
        approvedSeminarRegistrations
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

