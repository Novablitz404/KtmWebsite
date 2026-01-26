'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { getOrganizationDashboardData } from './actions'
import { getOrganizerTournaments } from '@/app/organization/actions'
import DashboardStats from '@/components/DashboardStats'
import AffiliatedClubsTable from '@/components/organization/AffiliatedClubsTable'
import AffiliatedOrgsTable from '@/components/organization/AffiliatedOrgsTable'
import ClubScheduleWidget from '@/components/club/ClubScheduleWidget'
import AnnouncementsWidget from '@/components/organization/AnnouncementsWidget'
import OrganizationSkeleton from '@/components/skeletons/OrganizationSkeleton'
import OrganizationSidebar from '@/components/organization/OrganizationSidebar'
import SmartAlertsWidget from '@/components/organization/SmartAlertsWidget'
import OrganizationEventsView from '@/components/organization/OrganizationEventsView'
import OrganizationClubsView from '@/components/organization/OrganizationClubsView'
import OrganizationTopBar from '@/components/organization/OrganizationTopBar'
import { LayoutDashboard, Building2, Calendar, Settings } from 'lucide-react'

interface OrganizationDashboardProps {
    initialData: any | null
    userRole: string | undefined
    userData: {
        name: string | null
        email: string
    }
    clerkImageUrl: string
    settingsContent?: React.ReactNode
}

type ViewType = 'home' | 'clubs' | 'events' | 'settings'

export default function OrganizationDashboard({
    initialData,
    userRole,
    userData,
    clerkImageUrl,
    settingsContent
}: OrganizationDashboardProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialView = (searchParams.get('tab') as ViewType) || 'home'
    const [activeView, setActiveView] = useState<ViewType>(initialView)
    const [searchQuery, setSearchQuery] = useState('')

    // Sync URL with active view
    useEffect(() => {
        const url = new URL(window.location.href)
        if (activeView === 'home') url.searchParams.delete('tab')
        else url.searchParams.set('tab', activeView)
        window.history.replaceState({}, '', url.toString())
    }, [activeView])

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['organization-dashboard'],
        queryFn: () => getOrganizationDashboardData(),
        initialData: initialData || undefined,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    // Fetch tournaments for the calendar
    const { data: tournaments, isLoading: tournamentsLoading } = useQuery({
        queryKey: ['organizer-tournaments'],
        queryFn: () => getOrganizerTournaments(),
        staleTime: 1000 * 60 * 5
    })

    const mobileNavItems = [
        { id: 'home', label: 'Home', icon: LayoutDashboard },
        { id: 'clubs', label: 'Clubs', icon: Building2 },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'settings', label: 'Settings', icon: Settings },
    ] as const

    const handleSearchChange = (query: string) => {
        setSearchQuery(query)
        // Add search logic mainly for Clubs/Members lists if applicable later
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <OrganizationSidebar
                activeView={activeView}
                onNavigate={setActiveView}
                orgLogo={dashboardData?.organization?.logoUrl}
                orgName={dashboardData?.organization?.name}
            />

            {/* Main Content Area */}
            <main className="md:ml-60 min-h-screen">
                <OrganizationTopBar
                    userName={userData.name || 'User'}
                    userImageUrl={clerkImageUrl}
                    title={activeView === 'settings' ? 'Settings' : undefined}
                    searchQuery={searchQuery}
                    onSearchChange={activeView === 'clubs' || activeView === 'events' ? handleSearchChange : undefined}
                    searchPlaceholder={activeView === 'clubs' ? 'Search clubs, masters...' : activeView === 'events' ? 'Search events...' : 'Search...'}
                    onSettingsClick={() => setActiveView('settings')}
                />

                {isLoading ? (
                    // View-Specific Loading States
                    activeView === 'clubs' ? (
                        <div className="h-[calc(100vh-9rem)] md:h-[calc(100vh-7rem)] px-4 pt-4 pb-0 sm:px-6 sm:pt-6 sm:pb-0 lg:px-8 lg:pt-8 lg:pb-0 overflow-hidden">
                            <OrganizationClubsView
                                clubs={[]}
                                organizations={[]}
                                isLoading={true}
                            />
                        </div>
                    ) : activeView === 'events' ? (
                        <div className="h-[calc(100vh-9rem)] md:h-[calc(100vh-7rem)] px-4 pt-4 pb-0 sm:px-6 sm:pt-6 sm:pb-0 lg:px-8 lg:pt-8 lg:pb-0 overflow-hidden">
                            <OrganizationEventsView
                                templates={[]}
                            />
                        </div>
                    ) : (
                        <OrganizationSkeleton activeView={activeView} />
                    )
                ) : !dashboardData ? (
                    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                        <p className="text-gray-500">No organization data found. Please contact support.</p>
                    </div>
                ) : (
                    <>
                        {/* Home View */}
                        {activeView === 'home' && (
                            <div className="p-6 h-[calc(100vh-80px)] overflow-hidden">
                                {/* Main 2-Column Layout */}
                                <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 h-full">
                                    {/* Left Column - Main Content */}
                                    <div className="flex flex-col gap-6 h-full overflow-hidden">
                                        {/* Stats Row */}
                                        <div className="flex-shrink-0">
                                            <DashboardStats stats={{
                                                totalMembers: dashboardData.stats.totalMembers,
                                                directMembers: dashboardData.stats.totalDirectMembers,
                                                directClubs: dashboardData.stats.directClubsCount,
                                                affiliatedOrgs: dashboardData.stats.affiliatedOrgsCount
                                            }} />
                                        </div>



                                        {/* Schedule Calendar Widget */}
                                        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                                            <ClubScheduleWidget
                                                tournaments={(tournaments || []).map(t => ({
                                                    id: t.id,
                                                    name: t.name,
                                                    startDate: new Date(t.startDate),
                                                    athleteCount: t.categories?.reduce((sum: number, cat: any) => sum + (cat._count?.players || 0), 0) || 0,
                                                    gold: 0,
                                                    silver: 0,
                                                    bronze: 0
                                                }))}
                                                isLoading={tournamentsLoading}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column (Sidebar/Quick Info) - Desktop Only */}
                                    <div className="hidden xl:flex flex-col gap-6 h-full overflow-hidden">
                                        {/* Smart Alerts Widget (Replaces Details) */}
                                        <div className="flex-shrink-0">
                                            <SmartAlertsWidget />
                                        </div>

                                        {/* Announcements Widget */}
                                        <div className="flex-1 min-h-0 overflow-y-auto">
                                            <AnnouncementsWidget announcements={dashboardData.announcements || []} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Clubs View */}
                        {activeView === 'clubs' && (
                            <div className="h-[calc(100vh-9rem)] md:h-[calc(100vh-7rem)] px-4 pt-4 pb-0 sm:px-6 sm:pt-6 sm:pb-0 lg:px-8 lg:pt-8 lg:pb-0 overflow-hidden">
                                <OrganizationClubsView
                                    clubs={dashboardData.allClubs || []}
                                    organizations={dashboardData.affiliatedOrgs || []}
                                    orgLogo={dashboardData.organization?.logoUrl}
                                    orgName={dashboardData.organization?.name}
                                    searchQuery={searchQuery}
                                />
                            </div>
                        )}

                        {/* Events View */}
                        {activeView === 'events' && (
                            <div className="h-[calc(100vh-9rem)] md:h-[calc(100vh-7rem)] px-4 pt-4 pb-0 sm:px-6 sm:pt-6 sm:pb-0 lg:px-8 lg:pt-8 lg:pb-0 overflow-hidden">
                                <OrganizationEventsView
                                    searchQuery={searchQuery}
                                    templates={dashboardData.guidelineTemplates || []}
                                />
                            </div>
                        )}

                        {/* Settings View */}
                        {activeView === 'settings' && (
                            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                                {settingsContent ? (
                                    settingsContent
                                ) : (
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                                        <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <h2 className="text-xl font-bold text-gray-900 mb-2">Organization Settings</h2>
                                        <p className="text-gray-500">Settings management coming soon.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
                <div className="flex justify-around items-center h-16">
                    {mobileNavItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeView === item.id

                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id as ViewType)}
                                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                    ? 'text-red-600'
                                    : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                <Icon size={20} />
                                <span className="text-xs mt-1 font-medium">{item.label}</span>
                            </button>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
