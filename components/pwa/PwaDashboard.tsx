'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Bell, Home, User, Calendar } from 'lucide-react'
import AthleteHomeView from './AthleteHomeView'
import NotificationList from '@/app/notifications/NotificationList'
import AthleteProfileView from '@/app/profile/AthleteProfileView'
import { getUnreadCount } from '@/app/actions/notifications'

interface PwaDashboardProps {
    dbUser: any
    clerkUser: any
    tournamentsJoined: number
    clubLogoUrl?: string
}

type Tab = 'home' | 'events' | 'alerts' | 'profile'

export default function PwaDashboard({ dbUser, clerkUser, tournamentsJoined, clubLogoUrl }: PwaDashboardProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Initialize tab from query param or default to home
    const initialTab = (searchParams.get('tab') as Tab) || 'home'
    const [activeTab, setActiveTab] = useState<Tab>(initialTab)
    const [unreadCount, setUnreadCount] = useState(0)

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
        <div className="min-h-screen bg-gray-50 flex flex-col">

            {/* Main Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto pb-20">
                {activeTab === 'home' && (
                    <AthleteHomeView
                        dbUser={dbUser}
                        clerkUser={clerkUser}
                        tournamentsJoined={tournamentsJoined}
                    />
                )}

                {activeTab === 'events' && (
                    <div className="p-4 flex flex-col items-center justify-center min-h-[50vh] text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-3xl">
                            📋
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">My Events</h2>
                        <p className="text-gray-500 mt-2 text-sm max-w-xs">
                            You'll be able to see your registered events here.
                            <br />(Coming soon to this view)
                        </p>
                        <button
                            onClick={() => router.push('/athlete/events')}
                            className="mt-6 text-indigo-600 font-medium text-sm"
                        >
                            Go to Full Events Page →
                        </button>
                    </div>
                )}

                {activeTab === 'alerts' && (
                    <div className="pb-24">
                        <div className="bg-white sticky top-0 z-20 border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                            <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
                        </div>
                        <NotificationList userId={dbUser.id} />
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="pt-4 px-4 pb-24">
                        <AthleteProfileView
                            dbUser={dbUser}
                            clerkImageUrl={clerkUser.imageUrl}
                            clubLogoUrl={clubLogoUrl}
                        />
                    </div>
                )}
            </div>

            {/* Bottom Navigation Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50 sm:hidden">
                <nav className="flex items-center justify-around h-16">
                    <button
                        onClick={() => setActiveTab('home')}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'home' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Home</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('events')}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'events' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <Calendar size={24} strokeWidth={activeTab === 'events' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Events</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${activeTab === 'alerts' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <div className="relative">
                            <Bell size={24} strokeWidth={activeTab === 'alerts' ? 2.5 : 2} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">Alerts</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'profile' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <User size={24} strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Profile</span>
                    </button>
                </nav>
            </div>
        </div>
    )
}
