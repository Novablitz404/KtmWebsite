'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminTopBar from '@/components/admin/AdminTopBar'
import AdminHomeView from '@/components/admin/AdminHomeView'
import AdminUsersView from '@/components/admin/AdminUsersView'
import AdminEventsView from '@/components/admin/AdminEventsView'
import AdminApiKeysView from '@/components/admin/AdminApiKeysView'
import AdminSettingsView from '@/components/admin/AdminSettingsView'
import AdminGuidelinesView from '@/components/admin/AdminGuidelinesView'

interface AdminDashboardProps {
    user: {
        id: string
        name: string | null
        email: string
        role: string
        imageUrl: string | null
    }
    stats: any
    pendingOrganizations: any[]
    usersForKeys: any[]
}

type ViewType = 'home' | 'users' | 'events' | 'api-keys' | 'guidelines' | 'settings'

export default function AdminDashboard({
    user,
    stats,
    pendingOrganizations,
    usersForKeys
}: AdminDashboardProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Initialize view from URL or default to 'home'
    const initialView = (searchParams.get('tab') as ViewType) || 'home'
    const [activeView, setActiveView] = useState<ViewType>(initialView)

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Sync URL with active view
    useEffect(() => {
        const url = new URL(window.location.href)
        if (activeView === 'home') url.searchParams.delete('tab')
        else url.searchParams.set('tab', activeView)
        window.history.replaceState({}, '', url.toString())
    }, [activeView])

    const getTitle = () => {
        switch (activeView) {
            case 'home': return 'Dashboard'
            case 'users': return 'User Management'
            case 'events': return 'Events'
            case 'api-keys': return 'API Keys'
            case 'guidelines': return 'Guideline Templates'
            case 'settings': return 'Settings'
            default: return 'Dashboard'
        }
    }

    const renderView = () => {
        switch (activeView) {
            case 'home':
                return <AdminHomeView stats={stats} pendingOrganizations={pendingOrganizations} />
            case 'users':
                return <AdminUsersView searchQuery={searchQuery} />
            case 'events':
                return <AdminEventsView />
            case 'api-keys':
                return <AdminApiKeysView users={usersForKeys} />
            case 'guidelines':
                return <AdminGuidelinesView />
            case 'settings':
                return <AdminSettingsView user={user} />
            default:
                return null
        }
    }

    return (
        <div className="flex bg-gray-50 h-screen overflow-hidden">
            {/* Sidebar */}
            <div className={`fixed inset-0 z-40 lg:static lg:z-auto lg:block ${isSidebarOpen ? 'block' : 'hidden'}`}>
                <div className="absolute inset-0 bg-gray-600 bg-opacity-75 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
                <AdminSidebar
                    activeView={activeView}
                    onNavigate={(view) => {
                        setActiveView(view)
                        setIsSidebarOpen(false)
                        setSearchQuery('')
                    }}
                    userName={user.name}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-0 lg:pl-60 transition-all duration-300">
                <AdminTopBar
                    userName={user.name || 'Admin'}
                    userImageUrl={user.imageUrl || undefined}
                    searchQuery={(activeView === 'users' || activeView === 'events') ? searchQuery : undefined}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder={activeView === 'users' ? "Search users..." : "Search events..."}
                    title={getTitle()}
                    onSettingsClick={() => setActiveView('settings')}
                    onMenuClick={() => setIsSidebarOpen(true)}
                />

                <main className={`flex-1 flex flex-col min-h-0 overflow-hidden ${['users', 'events', 'api-keys', 'guidelines'].includes(activeView) ? 'bg-gray-50' : 'p-4 md:p-6 lg:p-8 overflow-y-auto'
                    }`}>
                    {['users', 'events', 'api-keys', 'guidelines'].includes(activeView) ? (
                        <div className="h-full w-full">
                            {renderView()}
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto w-full">
                            {renderView()}
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
