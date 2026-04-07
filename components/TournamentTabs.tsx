'use client'

import { useState, useEffect } from 'react'
import { Category, Match, Player, Tournament, GuidelineTemplate, User, TournamentManagerInvite } from '@prisma/client'
import CategoryManager from './CategoryManager'
import BracketList from './BracketList'
import PlayerRegistration from './PlayerRegistration'
import TournamentManagers from './TournamentManagers'
import TournamentOverview from './TournamentOverview'
import ResolutionHistory from './ResolutionHistory'
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
    Loader2,
    Save,
    ScanLine,
    ShieldCheck,
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
        uniqueAthletes?: number
        uniqueApproved?: number
        kyorugi: number
        poomsae: number
        kyukpa: number
        clubs: { name: string; logoUrl: string | null; count: number; approved: number; pending: number }[]
    }
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
    UPCOMING:    { label: 'Upcoming',    dot: 'bg-blue-400',   text: 'text-blue-700',  bg: 'bg-blue-50'  },
    ONGOING:     { label: 'Ongoing',     dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    COMPLETED:   { label: 'Completed',   dot: 'bg-gray-400',   text: 'text-gray-600',  bg: 'bg-gray-100' },
    CANCELLED:   { label: 'Cancelled',   dot: 'bg-red-400',    text: 'text-red-700',   bg: 'bg-red-50'   },
    RESCHEDULED: { label: 'Rescheduled', dot: 'bg-amber-400',  text: 'text-amber-700', bg: 'bg-amber-50' },
}

// Nav groups
const NAV_SECTIONS = [
    {
        label: 'Event',
        items: [
            { id: 'overview',    label: 'Overview',    icon: LayoutDashboard },
            { id: 'categories',  label: 'Categories',  icon: ClipboardList   },
            { id: 'brackets',    label: 'Matches',     icon: Trophy          },
            { id: 'athletes',    label: 'Athletes',    icon: Users           },
        ],
    },
    {
        label: 'Operations',
        items: [
            { id: 'checkin',  label: 'Check-in', icon: ScanLine   },
            { id: 'managers', label: 'Managers', icon: UserCog    },
            { id: 'history',  label: 'History',  icon: ShieldCheck },
        ],
    },
    {
        label: 'Admin',
        items: [
            { id: 'settings', label: 'Settings', icon: Settings },
        ],
    },
]

// Tab page headers
const PAGE_HEADERS: Record<string, { title: string; description: string } | null> = {
    overview:   null, // has its own header
    categories: null, // CategoryManager has its own
    brackets:   { title: 'Matches', description: 'View and manage tournament brackets.' },
    athletes:   null, // PlayerRegistration renders its own header
    checkin:    null,
    managers:   { title: 'Managers', description: 'Invite and manage tournament administrators.' },
    history:    null,
    settings:   null, // TournamentSettings renders its own header
}

export default function TournamentTabs({
    tournament, players, pendingManagerInvites = [], publicView = false,
    totalPlayersCount = 0, userRole, tournamentStats
}: TournamentTabsProps) {
    const searchParams = useSearchParams()
    const [activeTab, setActiveTab] = useState<
        'overview' | 'categories' | 'brackets' | 'athletes' | 'checkin' | 'managers' | 'history' | 'settings'
    >(publicView ? 'athletes' : 'overview')
    const [playersList, setPlayersList] = useState<PlayerWithCategory[]>(players)
    const [isSidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam && [
            'overview', 'categories', 'brackets', 'athletes',
            'checkin', 'managers', 'history', 'settings'
        ].includes(tabParam)) {
            setActiveTab(tabParam as any)
        }
    }, [searchParams])

    const [guidelinesText, setGuidelinesText] = useState(
        tournament.guidelinesText || tournament.guidelineTemplate?.content || ''
    )
    const [isSavingGuidelines, setIsSavingGuidelines] = useState(false)

    const { data: alertData } = useQuery({
        queryKey: ['tournament-smart-alerts', tournament.id],
        queryFn: () => getTournamentAlerts(tournament.id),
        enabled: !publicView,
        staleTime: 1000 * 30,
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

    const publicTabs = [
        { id: 'brackets', label: 'Matches',  icon: Trophy },
        { id: 'athletes', label: 'Athletes', icon: Users  },
    ]

    const statusCfg = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.UPCOMING
    const backHref = userRole === 'ADMIN'
        ? `/admin${searchParams.get('tenant') ? `?tenant=${searchParams.get('tenant')}` : ''}`
        : `/organization?tab=events${searchParams.get('tenant') ? `&tenant=${searchParams.get('tenant')}` : ''}`

    const resolveTab = (id: string) => setActiveTab(id as any)

    return (
        <div className="flex min-h-screen bg-[#f7f8fa]">

            {/* ── Mobile overlay ─────────────────────── */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ────────────────────────────── */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-60 flex flex-col
                bg-white border-r border-gray-200/80
                transform transition-transform duration-200 ease-in-out md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Back link */}
                <div className="px-4 pt-5 pb-4 border-b border-gray-100">
                    <Link
                        href={backHref}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors group mb-5"
                    >
                        <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                        {userRole === 'ADMIN' ? 'Back to Admin' : 'Back to Events'}
                    </Link>

                    {/* Tournament identity */}
                    <div className="min-w-0">
                        <h2
                            className="text-sm font-bold text-gray-900 leading-tight truncate"
                            title={tournament.name}
                        >
                            {tournament.name}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1.5">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${tournament.status === 'ONGOING' ? 'animate-pulse' : ''}`} />
                                {statusCfg.label}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
                    {publicView ? (
                        <div className="space-y-0.5">
                            {publicTabs.map(({ id, label, icon: Icon }) => {
                                const isActive = activeTab === id
                                return (
                                    <NavButton
                                        key={id}
                                        id={id}
                                        label={label}
                                        icon={Icon}
                                        isActive={isActive}
                                        onClick={() => { resolveTab(id); setSidebarOpen(false) }}
                                    />
                                )
                            })}
                        </div>
                    ) : (
                        NAV_SECTIONS.map(section => (
                            <div key={section.label}>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-3 mb-1">
                                    {section.label}
                                </p>
                                <div className="space-y-0.5">
                                    {section.items.map(({ id, label, icon: Icon }) => {
                                        const isActive = activeTab === id
                                        return (
                                            <NavButton
                                                key={id}
                                                id={id}
                                                label={label}
                                                icon={Icon}
                                                isActive={isActive}
                                                badge={id === 'brackets' && alertCount > 0 ? alertCount : undefined}
                                                onClick={() => { resolveTab(id); setSidebarOpen(false) }}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </nav>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-medium">KTM System v1.0</p>
                    {(tournament as any).tier && (
                        <p className="text-[10px] text-gray-400">Tier {(tournament as any).tier}</p>
                    )}
                </div>
            </aside>

            {/* ── Main content ───────────────────────── */}
            <div className="flex-1 md:ml-60 min-w-0 flex flex-col min-h-screen">

                {/* Mobile top bar */}
                <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{tournament.name}</p>
                        <span className={`text-[10px] font-bold ${statusCfg.text}`}>{statusCfg.label}</span>
                    </div>
                </div>

                {/* Page content */}
                <div className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full">

                    {/* Optional page header */}
                    {(() => {
                        const hdr = PAGE_HEADERS[activeTab]
                        return hdr ? (
                            <div className="mb-7">
                                <h1 className="text-2xl font-black text-gray-900 tracking-tight">{hdr.title}</h1>
                                <p className="text-sm text-gray-500 mt-1">{hdr.description}</p>
                            </div>
                        ) : null
                    })()}

                    {/* ─ Overview ─ */}
                    {activeTab === 'overview' && !publicView && (
                        <div className="w-full animate-in fade-in duration-300">
                            <TournamentOverview
                                tournament={tournament}
                                players={playersList as any}
                                totalPlayersCount={totalPlayersCount || playersList.length}
                                stats={tournamentStats}
                            />
                        </div>
                    )}

                    {/* ─ Categories ─ */}
                    {activeTab === 'categories' && !publicView && (
                        <div className="w-full animate-in fade-in duration-300">
                            <CategoryManager
                                tournamentId={tournament.id}
                                categories={tournament.categories}
                            />
                        </div>
                    )}

                    {/* ─ Matches ─ */}
                    {activeTab === 'brackets' && (
                        <div className="w-full animate-in fade-in duration-300">
                            <BracketList
                                categories={tournament.categories.filter(c => (c._count?.players ?? 0) > 0)}
                                tournamentName={tournament.name}
                                publicView={publicView}
                            />
                        </div>
                    )}

                    {/* ─ Athletes ─ */}
                    {activeTab === 'athletes' && (
                        <div className="w-full animate-in fade-in duration-300">
                            <PlayerRegistration
                                tournamentId={tournament.id}
                                categories={tournament.categories}
                                players={playersList}
                                totalCount={totalPlayersCount || playersList.length}
                                readOnly={publicView}
                            />
                        </div>
                    )}

                    {/* ─ Check-in ─ */}
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

                    {/* ─ Managers ─ */}
                    {activeTab === 'managers' && !publicView && (
                        <div className="w-full animate-in fade-in duration-300">
                            <TournamentManagers
                                tournamentId={tournament.id}
                                managers={tournament.managers}
                                pendingInvites={pendingManagerInvites}
                                organizerId={tournament.organizerId}
                                currentUserId={tournament.currentUserId}
                            />
                        </div>
                    )}

                    {/* ─ Resolution History ─ */}
                    {activeTab === 'history' && !publicView && (
                        <div className="w-full animate-in fade-in duration-300">
                            <ResolutionHistory tournamentId={tournament.id} />
                        </div>
                    )}

                    {/* ─ Settings ─ */}
                    {activeTab === 'settings' && !publicView && (
                        <div className="w-full animate-in fade-in duration-300">
                            <TournamentSettings tournament={tournament} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Shared sub-components ──────────────────────────────────

function NavButton({
    id, label, icon: Icon, isActive, badge, onClick
}: {
    id: string
    label: string
    icon: React.ElementType
    isActive: boolean
    badge?: number
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all group
                ${isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
            `}
        >
            <Icon
                size={15}
                className={isActive ? 'text-white/90' : 'text-gray-400 group-hover:text-gray-600 transition-colors'}
            />
            <span className="flex-1 text-left">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}>
                    {badge}
                </span>
            )}
        </button>
    )
}

function SettingsCard({
    title, description, icon: Icon, children
}: {
    title: string
    description: string
    icon: React.ElementType
    children: React.ReactNode
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-gray-500" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>
                </div>
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    )
}
