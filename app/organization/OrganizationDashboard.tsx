'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { getOrganizationDashboardData } from './actions'

import PlatformGrowthCard from '@/components/organization/PlatformGrowthCard'
import AffiliatedClubsTable from '@/components/organization/AffiliatedClubsTable'
import AffiliatedOrgsTable from '@/components/organization/AffiliatedOrgsTable'

import AnnouncementsWidget from '@/components/organization/AnnouncementsWidget'
import PendingApprovalsWidget from '@/components/organization/PendingApprovalsWidget'
import OrganizationSkeleton from '@/components/skeletons/OrganizationSkeleton'
import OrganizationSidebar from '@/components/organization/OrganizationSidebar'
import SmartAlertsWidget from '@/components/organization/SmartAlertsWidget'
import OrganizationEventsView from '@/components/organization/OrganizationEventsView'
import OrganizationClubsView from '@/components/organization/OrganizationClubsView'
import OrganizationTopBar from '@/components/organization/OrganizationTopBar'
import OrganizationCoOrganizers from '@/components/OrganizationCoOrganizers'
import OrganizationAthletesView from '@/components/organization/OrganizationAthletesView'
import OrganizationFinancialsView from '@/components/organization/OrganizationFinancialsView'
import SupportPanel from '@/components/support/SupportPanel'
import { LayoutDashboard, Building2, Calendar, Settings, Users, IdCard, DollarSign } from 'lucide-react'

interface OrganizationDashboardProps {
    initialData: any | null
    tenantSlug: string
    userRole: string | undefined
    userData: {
        name: string | null
        email: string
    }
    clerkImageUrl: string
    settingsContent?: React.ReactNode
}

type ViewType = 'home' | 'clubs' | 'events' | 'athletes' | 'financials' | 'team' | 'settings' | 'support'

export default function OrganizationDashboard({
    initialData,
    tenantSlug,
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
        if (tenantSlug !== 'ktm') url.searchParams.set('tenant', tenantSlug)
        window.history.replaceState({}, '', url.toString())
    }, [activeView, tenantSlug])

    const { data: dashboardData, isLoading } = useQuery({
        queryKey: ['organization-dashboard'],
        queryFn: () => getOrganizationDashboardData(),
        initialData: initialData || undefined,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })



    const mobileNavItems = [
        { id: 'home', label: 'Home', icon: LayoutDashboard },
        { id: 'clubs', label: 'Affiliates', icon: Building2 },
        { id: 'events', label: 'Events', icon: Calendar },
        // { id: 'financials', label: 'Financials', icon: DollarSign },  // Hidden for now
        { id: 'settings', label: 'Settings', icon: Settings },
    ] as const

    const handleSearchChange = (query: string) => {
        setSearchQuery(query)
        // Add search logic mainly for Clubs/Members lists if applicable later
    }

    return (
        <div className="min-h-screen bg-[#f7f8fa]">
            {/* Desktop Sidebar */}
            <OrganizationSidebar
                activeView={activeView}
                onNavigate={setActiveView}
                orgName={dashboardData?.organization?.name}
            />

            {/* Main Content Area */}
            <main className="md:ml-60 min-h-screen">
                <OrganizationTopBar
                    userName={userData.name || 'User'}
                    userImageUrl={clerkImageUrl}
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
                    ) : activeView === 'team' ? (
                        <div className="h-[calc(100vh-9rem)] md:h-[calc(100vh-7rem)] px-4 pt-4 pb-0 sm:px-6 sm:pt-6 sm:pb-0 lg:px-8 lg:pt-8 lg:pb-0 overflow-hidden">
                            <OrganizationCoOrganizers
                                organizationId=""
                                isOwner={userRole === 'ORGANIZER'}
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
                            <div className="p-6 md:p-8 space-y-5">

                                {/* Row 1: Growth chart — full width */}
                                <PlatformGrowthCard
                                    clubs={dashboardData.allClubs || []}
                                    totalMembers={dashboardData.stats.totalMembers}
                                    directClubs={dashboardData.stats.directClubsCount}
                                    affiliatedOrgs={dashboardData.stats.affiliatedOrgsCount}
                                />

                                {/* Row 2: Pending Approvals — full width */}
                                <PendingApprovalsWidget
                                    pendingClubs={(dashboardData.allClubs || []).filter((c: any) => c?.status === 'PENDING')}
                                    pendingAffiliations={(dashboardData.allClubs || []).filter((c: any) => c?.affiliationStatus === 'PENDING_REVIEW')}
                                />

                                {/* Row 3: Smart Alerts | Announcements */}
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                    <SmartAlertsWidget />
                                    <AnnouncementsWidget announcements={dashboardData.announcements || []} />
                                </div>
                            </div>
                        )}

                        {/* Clubs View */}
                        {activeView === 'clubs' && (
                            <div className="p-6 md:p-8">
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
                            <div className="p-6 md:p-8">
                                <OrganizationEventsView
                                    searchQuery={searchQuery}
                                    templates={dashboardData.guidelineTemplates || []}
                                />
                            </div>
                        )}

                        {/* Athletes View */}
                        {activeView === 'athletes' && (
                            <div className="p-6 md:p-8">
                                <OrganizationAthletesView />
                            </div>
                        )}

                        {/* Financials View */}
                        {activeView === 'financials' && (
                            <div className="p-6 md:p-8">
                                <OrganizationFinancialsView />
                            </div>
                        )}

                        {/* Settings View */}
                        {activeView === 'settings' && (
                            <div className="p-6 md:p-8">
                                {settingsContent ? (
                                    settingsContent
                                ) : (
                                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                            <Settings className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <h2 className="text-lg font-bold text-gray-900 mb-1">Organization Settings</h2>
                                        <p className="text-sm text-gray-400">Settings management coming soon.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Support View */}
                        {activeView === 'support' && (
                            <div className="p-6 md:p-8">
                                <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                    <SupportPanel userName={userData.name} userEmail={userData.email} />
                                </div>
                            </div>
                        )}

                        {/* Team / Co-Organizers View */}
                        {activeView === 'team' && dashboardData?.organization && (
                            <div className="p-6 md:p-8">
                                <OrganizationCoOrganizers
                                    organizationId={dashboardData.organization.id}
                                    isOwner={userRole === 'ORGANIZER'}
                                />
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
