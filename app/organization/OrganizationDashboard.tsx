'use client'

import { useQuery } from '@tanstack/react-query'
import { getOrganizationDashboardData } from './actions'
import DashboardStats from '@/components/DashboardStats'
import AffiliatedClubsTable from '@/components/organization/AffiliatedClubsTable'
import AffiliatedOrgsTable from '@/components/organization/AffiliatedOrgsTable'
import TopPerformersWidget from '@/components/organization/TopPerformersWidget'
import AnnouncementsWidget from '@/components/organization/AnnouncementsWidget'
import OrganizationSkeleton from '@/components/skeletons/OrganizationSkeleton'

interface OrganizationDashboardProps {
    initialData: any | null
    userRole: string | undefined
}

export default function OrganizationDashboard({ initialData, userRole }: OrganizationDashboardProps) {

    // Protect role on client side too if needed, though page.tsx handles redirect usually.
    if (userRole && userRole !== 'ORGANIZER' && userRole !== 'MANAGER' && userRole !== 'ADMIN') {
        // In a client component, we'd typically use router.push, but since this is initial render check
        // we can assume page.tsx handled it.
    }

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['organization-dashboard'],
        queryFn: () => getOrganizationDashboardData(),
        initialData: initialData || undefined,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    if (isLoading) return <OrganizationSkeleton />

    if (!dashboardData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500">No organization data found. Please contact support.</p>
            </div>
        )
    }

    return (
        <main className="min-h-screen bg-gray-50 pb-12">
            {/* Mobile Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-4 sm:hidden sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Organization</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{dashboardData.organization.name}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Left Column (Main Content) */}
                    <div className="xl:col-span-3 space-y-8">
                        {/* Stats Section */}
                        <section>
                            <DashboardStats stats={{
                                totalMembers: dashboardData.stats.totalMembers,
                                directMembers: dashboardData.stats.totalDirectMembers,
                                directClubs: dashboardData.stats.directClubsCount,
                                affiliatedOrgs: dashboardData.stats.affiliatedOrgsCount
                            }} />
                        </section>

                        {/* Top Performers & Recent */}
                        <section>
                            <TopPerformersWidget
                                topClubs={dashboardData.topClubs || []}
                                recentMembers={dashboardData.recentMembers || []}
                            />
                        </section>

                        {/* Affiliates Tables */}
                        <section className="space-y-8">
                            <AffiliatedClubsTable clubs={dashboardData.allClubs || []} />

                            {/* Only show Organization table if there are affiliates */}
                            {(dashboardData.affiliatedOrgs?.length || 0) > 0 && (
                                <AffiliatedOrgsTable orgs={dashboardData.affiliatedOrgs || []} />
                            )}
                        </section>
                    </div>

                    {/* Right Column (Sidebar/Quick Info) */}
                    <div className="hidden xl:block space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

                            {/* Org Profile Header in Sidebar */}
                            <div className="flex flex-col items-center text-center mb-6">
                                {dashboardData.organization.logoUrl ? (
                                    <div className="w-24 h-24 rounded-full border border-gray-200 p-1 bg-white shadow-sm mb-3">
                                        <img
                                            src={dashboardData.organization.logoUrl}
                                            alt="Logo"
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl mb-3">
                                        🏢
                                    </div>
                                )}
                                <h2 className="text-xl font-bold text-gray-900">{dashboardData.organization.name}</h2>
                                <p className="text-sm text-gray-500">Organization Dashboard</p>
                            </div>

                            <div className="border-t border-gray-100 my-4"></div>

                            <h3 className="font-bold text-gray-900 mb-4">Quick Details</h3>
                            <div className="space-y-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Chairman</p>
                                    <p className="font-medium text-gray-900">{dashboardData.organization.chairman || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Contact Email</p>
                                    <p className="font-medium text-gray-900">{dashboardData.organization.contactEmail || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Established</p>
                                    <p className="font-medium text-gray-900">
                                        {dashboardData.organization.establishedAt ? new Date(dashboardData.organization.establishedAt).getFullYear() : '-'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Announcements Widget */}
                        <AnnouncementsWidget announcements={dashboardData.announcements || []} />
                    </div>
                </div>
            </div>
        </main>
    )
}
