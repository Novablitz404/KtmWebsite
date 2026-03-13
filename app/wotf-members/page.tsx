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
    }

    return <GlobalMembersPage clubs={clubs} />
}
