'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bell, Home, Settings, Calendar } from 'lucide-react'
import AthleteHomeView from './AthleteHomeView'
import TournamentsListView from './TournamentsListView'
import MyEventsView from './MyEventsView'
import NotificationList from '@/app/notifications/NotificationList'
import SettingsView from '@/components/pwa/SettingsView'
import { getUnreadCount } from '@/app/actions/notifications'
import PullToRefresh from '@/components/ui/PullToRefresh'

interface Tournament {
    id: string
    name: string
    startDate: Date | null
    venue: string | null
    status: string
    _count: {
        categories: number
    }
}

interface PwaDashboardProps {
    dbUser: any
    clerkUser: any
    tournamentsJoined: number
    clubLogoUrl?: string
    tournaments?: Tournament[]
    registeredTournamentIds?: Set<string>
    homeContent?: React.ReactNode
    eventsContent?: React.ReactNode
    registerContent?: React.ReactNode
    initialTab?: string
    unreadCount?: number
}

type Tab = 'home' | 'register' | 'events' | 'alerts' | 'settings'

export default function PwaDashboard({
    dbUser,
    clerkUser,
    tournamentsJoined,
    clubLogoUrl,
    tournaments = [],
    registeredTournamentIds = new Set(),
    homeContent,
    eventsContent,
    registerContent,
    initialTab: propInitialTab,
    unreadCount: initialUnreadCount = 0
}: PwaDashboardProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Initialize tab from prop OR query param OR default to home
    const initialTab = (propInitialTab as Tab) || (searchParams.get('tab') as Tab) || 'home'
    const [activeTab, setActiveTab] = useState<Tab>(initialTab)
    const [unreadCount, setUnreadCount] = useState(initialUnreadCount)

    // Sync URL when tab changes (shallowly)
    useEffect(() => {
        const url = new URL(window.location.href)
        if (activeTab === 'home') {
            url.searchParams.delete('tab')
        } else {
            url.searchParams.set('tab', activeTab)
        }
        window.history.replaceState({}, '', url.toString())
    }, [activeTab])

    // Poll for unread notifications
    useEffect(() => {
        if (!dbUser?.id) return

        const fetchUnread = async () => {
            try {
                const count = await getUnreadCount(dbUser.id)
                setUnreadCount(count)
            } catch (error) {
                console.error('Failed to fetch unread count:', error)
            }
        }

        fetchUnread()
        const interval = setInterval(fetchUnread, 30000) // Poll every 30s
        return () => clearInterval(interval)
    }, [dbUser?.id])

    // Reset unread count when viewing alerts
    useEffect(() => {
        if (activeTab === 'alerts') {
            // Optimistically clear badge? Or wait for read?
            // Usually we clear badge when specific items are read.
            // But if we want to clear "new" indicator, we could do it here. 
            // For now, let the actual read status drive the badge via polling.
        }
    }, [activeTab])

    return (
        <div className="min-h-screen bg-white flex flex-col">

            {/* Main Content Area */}
            <div className="flex-1">
                {activeTab === 'home' && (
                    <PullToRefresh className="min-h-[85vh]" mode="overlay">
                        {homeContent ? homeContent : (
                            <AthleteHomeView
                                dbUser={dbUser}
                                clerkUser={clerkUser}
                                tournamentsJoined={tournamentsJoined}
                            />
                        )}
                    </PullToRefresh>
                )}

                {activeTab === 'register' && (
                    <div className="pb-24">
                        <PullToRefresh className="min-h-[85vh]" mode="overlay">
                            {registerContent ? registerContent : (
                                <TournamentsListView
                                    tournaments={tournaments}
                                    registeredTournamentIds={registeredTournamentIds}
                                />
                            )}
                        </PullToRefresh>
                    </div>
                )}

                {activeTab === 'events' && (
                    <div className="pb-24">
                        <PullToRefresh className="min-h-[85vh]" mode="overlay">
                            {eventsContent ? eventsContent : (
                                <MyEventsView players={dbUser.players || []} />
                            )}
                        </PullToRefresh>
                    </div>
                )}

                {activeTab === 'alerts' && (
                    <div className="pb-24">
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
                            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Stay updated on your events</p>
                        </div>
                        <NotificationList userId={dbUser.id} />
                    </div>
                )}

                {activeTab === 'settings' && (
                    <SettingsView
                        dbUser={dbUser}
                        clerkImageUrl={clerkUser.imageUrl}
                    />
                )}
            </div>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 sm:hidden">
                <nav className="flex items-center justify-around h-16 relative">
                    {/* Register tab */}
                    <button
                        onClick={() => setActiveTab('register')}
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${activeTab === 'register' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'register' ? 2.5 : 2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span className="text-[10px] font-medium">Register</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('events')}
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${activeTab === 'events' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Calendar size={22} strokeWidth={activeTab === 'events' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Events</span>
                    </button>

                    {/* Center Home Button - Floating Circle */}
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex items-center justify-center w-14 h-14 rounded-full -mt-6 shadow-lg transition-all active:scale-95 ${activeTab === 'home'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <Home size={26} strokeWidth={2.5} />
                    </button>

                    {/* Right side tabs */}
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 relative ${activeTab === 'alerts' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <div className="relative">
                            <Bell size={22} strokeWidth={activeTab === 'alerts' ? 2.5 : 2} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-[16px] px-1 bg-red-500 text-white text-[9px] font-bold rounded-full border-2 border-white">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">Alerts</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 ${activeTab === 'settings' ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <Settings size={22} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Settings</span>
                    </button>
                </nav>
            </div>
        </div >
    )
}
