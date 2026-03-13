import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import GlobalMembersPage from '@/components/landing/wotf-global/pages/MembersPage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function WOTFMembersPage() {
    const tenant = await getTenant()

    // Only WOTF Global uses this route
    if (tenant.slug !== 'wotf-global') {
        redirect('/')
    }

    const orgId = tenant.id
    let clubs: { id: string; name: string; city: string | null; province: string | null; country: string | null }[] = []
    let stats = { totalClubs: 0, totalAthletes: 0, totalCountries: 0 }

    if (orgId) {
        const rawClubs = await prisma.club.findMany({
            where: { organizationId: orgId, status: 'APPROVED' },
            select: { id: true, name: true, address: true },
            orderBy: { name: 'asc' },
        })
        clubs = rawClubs.map(c => ({
            id: c.id,
            name: c.name,
            city: c.address,
            province: null,
            country: null,
        }))

        // Fetch stats for the hero counters
        const [clubCount, athleteCount, countryCount] = await Promise.all([
            prisma.club.count({ where: { organizationId: orgId, status: 'APPROVED' } }),
            prisma.user.count({ where: { organizationMemberId: orgId, role: 'ATHLETE' } }),
            prisma.user.findMany({
                where: { organizationMemberId: orgId, country: { not: null } },
                select: { country: true },
                distinct: ['country'],
            }),
        ])
        stats = {
            totalClubs: clubCount,
            totalAthletes: athleteCount,
            totalCountries: Math.max(countryCount.length, 12), // At least 12 (our office countries)
        }
    }

    return <GlobalMembersPage clubs={clubs} stats={stats} />
}
