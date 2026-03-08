import { getTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import ClubLocatorPage from '@/components/landing/wotf/pages/ClubLocatorPage'

export default async function ClubsPage() {
    const tenant = await getTenant()

    // Tenant-aware club fetching. 
    // Fetch all APPROVED clubs for this tenant, and their affiliation status with this tenant
    const clubs = await prisma.club.findMany({
        where: {
            organizationId: tenant.id as string,
            status: 'APPROVED'
        },
        include: {
            master: {
                select: {
                    name: true,
                    email: true
                }
            },
            affiliations: {
                where: {
                    organizationId: tenant.id as string
                }
            }
        },
        orderBy: {
            name: 'asc'
        }
    })

    // Map data for the client component
    const mappedClubs = clubs.map(club => {
        const affiliation = club.affiliations[0]
        const isActiveAffiliate = affiliation?.status === 'ACTIVE'

        return {
            id: club.id,
            name: club.name,
            masterName: club.master?.name || 'Unknown Master',
            address: club.address || 'Address not provided',
            contactEmail: club.master?.email,
            phone: club.phone || 'Phone not provided',
            logoUrl: club.logoUrl,
            isActiveAffiliate,
        }
    })

    return <ClubLocatorPage clubs={mappedClubs} tenantName={tenant.name || 'Organization'} />
}
