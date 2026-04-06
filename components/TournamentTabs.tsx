'use client'

import { useState, useEffect } from 'react'
import { Category, Match, Player, Tournament, GuidelineTemplate, User, TournamentManagerInvite } from '@prisma/client'
import CategoryManager from './CategoryManager'
import BracketList from './BracketList'
import PlayerRegistration from './PlayerRegistration'
import TournamentManagers from './TournamentManagers'
import TournamentOverview from './TournamentOverview'
import { getTournamentPlayers, updateTournamentGuidelines, getTournamentAlerts } from '@/app/actions'
import DashboardDataExport from './DashboardDataExport'
import TournamentSettings from './TournamentSettings'
import TournamentStatusActions from './TournamentStatusActions'
import DeleteTournamentButton from './DeleteTournamentButton'
import EventCheckIn from './EventCheckIn'
import { tournamentCheckIn, searchPlayersForCheckIn, getTournamentCheckInStats, getCheckedInPlayers, saveWaiverSignature } from '@/app/actions'
import { useQuery } from '@tanstack/react-query'
import {
    LayoutDashboard,
    ClipboardList,
    Trophy,
    Users,
    UserCog,
    Settings,
    ArrowLeft,
    Menu,
    X,
    Calendar,
    MapPin,
    Loader2,
    Save,
    ScanLine
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type TournamentWithData = Tournament & {
    categories: (Category & { matches: Match[], poomsaeMatches: any[], _count?: { players: number } })[]
    guidelineTemplate: GuidelineTemplate | null
    managers: User[]
    currentUserId?: string
}

type PlayerWithCategory = Player & {
    category: Category
    club: { name: string } | null
}

interface TournamentTabsProps {
    tournament: TournamentWithData
    players: PlayerWithCategory[]
    pendingManagerInvites?: TournamentManagerInvite[]
    publicView?: boolean
    totalPlayersCount?: number
    userRole?: string
    tournamentStats?: {
        total: number
        approved: number
        pending: number
        rejected: number
        kyorugi: number
        poomsae: number
        kyukpa: number
        clubs: { name: string; logoUrl: string | null; count: number; approved: number; pending: number }[]
    }
}

export default function TournamentTabs({ tournament, players, pendingManagerInvites = [], publicView = false, totalPlayersCount = 0, userRole, tournamentStats }: TournamentTabsProps) {
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'brackets' | 'athletes' | 'checkin' | 'managers' | 'settings'>(
        publicView ? 'athletes' : 'overview'
    )
    const [playersList, setPlayersList] = useState<PlayerWithCategory[]>(players)
    const [isSidebarOpen, setSidebarOpen] = useState(false)

    // Handle ?tab= query param for deep linking from org dashboard
    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam && ['overview', 'categories', 'brackets', 'athletes', 'checkin', 'managers', 'settings'].includes(tabParam)) {
            setActiveTab(tabParam as any)
        }
    }, [searchParams])

    // Guidelines State
    const [guidelinesText, setGuidelinesText] = useState(tournament.guidelinesText || tournament.guidelineTemplate?.content || '')
    const [isSavingGuidelines, setIsSavingGuidelines] = useState(false)

    // Fetch alert count for Matches tab badge
    const { data: alertData } = useQuery({
        queryKey: ['tournament-smart-alerts', tournament.id],
        queryFn: () => getTournamentAlerts(tournament.id),
        enabled: !publicView,
        staleTime: 1000 * 30
    })
    const alertCount = alertData?.alerts?.length || 0

    const handleSaveGuidelines = async () => {
        setIsSavingGuidelines(true)
        try {
            await updateTournamentGuidelines(tournament.id, guidelinesText)
            alert('Guidelines saved successfully!')
        } catch (error) {
            console.error(error)
            alert('Failed to save guidelines.')
        } finally {
            setIsSavingGuidelines(false)
        }
    }

    // Supabase Realtime removed — caused duplicate rendering and unnecessary refetches.

    let tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'categories', label: 'Categories', icon: ClipboardList },
        { id: 'brackets', label: 'Matches', icon: Trophy },
        { id: 'athletes', label: 'Athletes', icon: Users },
        { id: 'checkin', label: 'Check-in', icon: ScanLine },
        { id: 'managers', label: 'Managers', icon: UserCog },
        { id: 'settings', label: 'Settings', icon: Settings },
    ] as const

    if (publicView) {
        tabs = [
            // Public can view categories but arguably read-only? For now keeping it simple.
            // Actually CategoryManager is heavy edit. Let's hide it for public or make it read-only if requested.
            // User asked for "Details", likely Brackets & Athletes are key.
            // Let's keep Brackets and Athletes.
            { id: 'brackets', label: 'Matches', icon: Trophy },
            { id: 'athletes', label: 'Athletes', icon: Users },
        ] as any
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <Link
                            href={userRole === 'ADMIN' ? `/admin${searchParams.get('tenant') ? `?tenant=${searchParams.get('tenant')}` : ''}` : `/organization?tab=events${searchParams.get('tenant') ? `&tenant=${searchParams.get('tenant')}` : ''}`}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4 group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            {userRole === 'ADMIN' ? 'Back to Admin' : 'Back to Events'}
                        </Link>

                        <div>
                            <h2 className="font-bold text-gray-900 truncate" title={tournament.name}>{tournament.name}</h2>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(tournament.startDate).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id as any)
                                        setSidebarOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? 'bg-red-50 text-red-700 shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'text-gray-400'}`} />
                                    {tab.label}
                                    {tab.id === 'brackets' && alertCount > 0 && !publicView && (
                                        <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                            {alertCount}
                                        </span>
                                    )}
                                </button>
                            )
                        })}
                    </nav>

                    {/* Footer Info */}
                    <div className="p-4 border-t border-gray-100 text-xs text-gray-400">
                        <p>KTM System v1.0</p>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 min-w-0 flex flex-col min-h-screen">
                {/* Mobile Header Trigger */}
                <div className="md:hidden flex items-center p-4 bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-semibold ml-2 text-gray-900 truncate">{tournament.name}</span>
                </div>

                <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {activeTab === 'overview' && !publicView && (
                        <div className="w-full">
                            <TournamentOverview
                                tournament={tournament}
                                players={playersList as any}
                                totalPlayersCount={totalPlayersCount || playersList.length}
                                stats={tournamentStats}
                            />
                        </div>
                    )}

                    {activeTab === 'categories' && !publicView && (
                        <div className="w-full animate-in fade-in duration-300">
                            <CategoryManager
                                tournamentId={tournament.id}
                                categories={tournament.categories}
                            />
                        </div>
                    )}

                    {activeTab === 'brackets' && (
                        <div className="w-full animate-in fade-in duration-300">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900">Matches</h1>
                                <p className="text-gray-500">View and manage tournament brackets and matches.</p>
                            </div>
                            <BracketList
                                categories={tournament.categories.filter(c => (c._count?.players ?? 0) > 0)}
                                tournamentName={tournament.name}
                                publicView={publicView}
                            />
                        </div>
                    )}

                    {activeTab === 'athletes' && (
                        <div className="w-full animate-in fade-in duration-300">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900">Athletes</h1>
                                <p className="text-gray-500">Manage registered athletes.</p>
                            </div>
                            <PlayerRegistration
                                tournamentId={tournament.id}
                                categories={tournament.categories}
                                players={playersList}
                                totalCount={totalPlayersCount || playersList.length}
                                readOnly={publicView}
                            />
                        </div>
                    )}

                    {activeTab === 'checkin' && !publicView && (
                        <div className="w-full animate-in fade-in duration-300">
                            <EventCheckIn
                                eventId={tournament.id}
                                eventName={tournament.name}
                                eventType="tournament"
                                onCheckIn={tournamentCheckIn}
                                onSearch={searchPlayersForCheckIn}
                                onGetStats={getTournamentCheckInStats}
                                onGetCheckedIn={getCheckedInPlayers}
                                onSaveWaiver={saveWaiverSignature}
                            />
                        </div>
                    )}

                    {activeTab === 'managers' && !publicView && (
                        <div className="w-full animate-in fade-in duration-300">
                            <div className="mb-6">
                                <h1 className="text-2xl font-bold text-gray-900">Managers</h1>
                                <p className="text-gray-500">Invite and manage tournament administrators.</p>
                            </div>
                            <TournamentManagers
                                tournamentId={tournament.id}
                                managers={tournament.managers}
                                pendingInvites={pendingManagerInvites}
                                organizerId={tournament.organizerId}
                                currentUserId={tournament.currentUserId}
                            />
                        </div>
                    )}

                    {activeTab === 'settings' && !publicView && (
                        <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-300">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                                <p className="text-gray-500">Configure tournament details, banner, and status.</p>
                            </div>

                            {/* Banner & Details */}
                            <TournamentSettings tournament={tournament} />

                            {/* Status Section */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-indigo-500" />
                                    Tournament Status
                                </h3>
                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                ${tournament.status === 'ONGOING' ? 'bg-green-100 text-green-800' :
                                                    tournament.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                                                        tournament.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                            'bg-blue-100 text-blue-800'}`}>
                                                {tournament.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Controls public visibility and actions.</p>
                                    </div>
                                    <TournamentStatusActions
                                        tournamentId={tournament.id}
                                        currentStatus={tournament.status}
                                    />
                                </div>
                            </div>

                            {/* Data Export Section */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-indigo-500" />
                                    Data Management
                                </h3>
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">Export tournament data for offline use or backups.</p>
                                    <DashboardDataExport
                                        tournamentId={tournament.id}
                                        tournamentName={tournament.name}
                                        className="flex-wrap"
                                    />
                                </div>
                            </div>

                            {/* Guidelines Section */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-indigo-500" />
                                    Tournament Guidelines
                                </h3>
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Customize the guidelines for this specific tournament. If left empty, it will default to the selected template.
                                    </p>
                                    <div>
                                        <textarea
                                            value={guidelinesText}
                                            onChange={(e) => setGuidelinesText(e.target.value)}
                                            rows={12}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 font-mono text-sm"
                                            placeholder="# Tournament Guidelines..."
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            onClick={handleSaveGuidelines}
                                            disabled={isSavingGuidelines}
                                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                        >
                                            {isSavingGuidelines ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Save Guidelines
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
                                <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
                                    Danger Zone
                                </h3>
                                <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-red-900">Delete Tournament</h4>
                                        <p className="text-xs text-red-600 mt-1">Permanently remove this tournament and all its data.</p>
                                    </div>
                                    <DeleteTournamentButton
                                        tournamentId={tournament.id}
                                        tournamentName={tournament.name}
                                        redirectPath="/organization?tab=events"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
