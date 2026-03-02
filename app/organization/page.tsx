import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import OrganizationDashboard from './OrganizationDashboard'
import OrganizationSettingsView from '@/app/settings/OrganizationSettingsView'
import { getOrganizationDashboardData } from '@/app/organization/actions'

export default async function OrganizationPage() {
    const user = await currentUser()

    if (!user) {
        redirect('/sign-in')
    }

    // Role verification and Data Fetching
    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: {
            id: true,
            role: true,
            name: true,
            email: true,
            clubName: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            birthDate: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    emailBannerUrl: true,
                    address: true,
                    contactPhone: true,
                    contactEmail: true,
                    website: true,
                    chairman: true,
                    viceChairman: true,
                    defaultBeltFees: true
                }
            }
        }
    })

    if (!dbUser || (dbUser.role !== 'ORGANIZER' && dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN')) {
        redirect('/')
    }

    // Prefetch dashboard data to avoid client-side loading flicker
    const dashboardData = await getOrganizationDashboardData()

    return (
        <OrganizationDashboard
            initialData={dashboardData}
            userRole={dbUser?.role}
            userData={{
                name: dbUser.name,
                email: dbUser.email
            }}
            clerkImageUrl={user.imageUrl}
            settingsContent={
                dbUser.organization ? (
                    <OrganizationSettingsView
                        dbUser={dbUser}
                        organization={dbUser.organization}
                        clerkImageUrl={user.imageUrl}
                    />
                ) : undefined
            }
        />
    )
}

