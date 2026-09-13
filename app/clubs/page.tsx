import { getTenant } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import ClubLocatorPage from '@/components/landing/wotf/pages/ClubLocatorPage'

export default async function ClubsPage() {
    const tenant = await getTenant()

    // KTM's tenant id now resolves to a real Organization row (needed for GSS
    // tournament-host attribution), but this page's original KTM behavior was
    // "clubs with no organization assigned" (tenant.id used to always be null
    // here) — preserve that instead of narrowing to literally KTM-owned clubs.
    const clubOrgFilter = tenant.slug === 'ktm' ? null : (tenant.id as string)

    // Tenant-aware club fetching.
    // Fetch all APPROVED clubs for this tenant, and their affiliation status with this tenant
    const clubs = await prisma.club.findMany({
        where: {
            organizationId: clubOrgFilter,
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
                // ClubAffiliation.organizationId is non-nullable, so pass a
                // value that can never match instead of null when clubOrgFilter
                // is null (KTM) — preserves the old "no affiliations shown" behavior.
                where: {
                    organizationId: clubOrgFilter || '__none__'
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
            latitude: club.latitude,
            longitude: club.longitude,
        }
    })

    return <ClubLocatorPage clubs={mappedClubs} tenantName={tenant.name || 'Organization'} />
}
