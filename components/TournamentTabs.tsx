'use client'

import { useState, useEffect } from 'react'
import { Category, Match, Player, Tournament, GuidelineTemplate, User, TournamentManagerInvite } from '@prisma/client'
import CategoryManager from './CategoryManager'
import BracketList from './BracketList'
import PlayerRegistration from './PlayerRegistration'
import TournamentManagers from './TournamentManagers'
import { getTournamentPlayers } from '@/app/actions'
import DashboardDataExport from './DashboardDataExport'
import TournamentStatusActions from './TournamentStatusActions'

type TournamentWithData = Tournament & {
    categories: (Category & { matches: Match[], _count?: { players: number } })[]
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
}

export default function TournamentTabs({ tournament, players, pendingManagerInvites = [], publicView = false, totalPlayersCount = 0 }: TournamentTabsProps) {
    const [activeTab, setActiveTab] = useState<'categories' | 'brackets' | 'athletes' | 'managers' | 'settings'>(
        publicView ? 'athletes' : 'categories'
    )
    const [playersList, setPlayersList] = useState<PlayerWithCategory[]>(players)

    // Initialize Supabase client for Realtime
    // Note: This requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    useEffect(() => {
        // Only run realtime if keys are present and we are on the athletes tab
        if (activeTab !== 'athletes' || !supabaseUrl || !supabaseKey) return

        const { createClient } = require('@supabase/supabase-js')
        const supabase = createClient(supabaseUrl, supabaseKey)

        console.log('Subscribe to Supabase Realtime: Player')

        const channel = supabase
            .channel('table-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'Player'
                    // Removing unsupported relation filter. 
                    // We will listen to all Player changes and let getTournamentPlayers filter relevant data.
                },
                async (payload: any) => {
                    console.log('Realtime Change:', payload)
                    // On any change, simpler to just re-fetch the full list to ensure consistency (especially with relations like club/category)
                    // efficiently than trying to patch the complex object locally.
                    const updatedPlayers = await getTournamentPlayers(tournament.id)
                    setPlayersList(updatedPlayers as unknown as PlayerWithCategory[])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [activeTab, tournament.id, supabaseUrl, supabaseKey])

    let tabs = [
        { id: 'categories', label: 'Categories', icon: '📋' },

        { id: 'brackets', label: 'Brackets', icon: '🏆' },
        { id: 'athletes', label: 'Athletes', icon: '👥' },
        { id: 'managers', label: 'Managers', icon: '🔑' },
        { id: 'settings', label: 'Settings', icon: '⚙️' },
    ] as const

    if (publicView) {
        tabs = [
            // Public can view categories but arguably read-only? For now keeping it simple.
            // Actually CategoryManager is heavy edit. Let's hide it for public or make it read-only if requested.
            // User asked for "Details", likely Brackets & Athletes are key.
            // Let's keep Brackets and Athletes.
            { id: 'brackets', label: 'Brackets', icon: '🏆' },
            { id: 'athletes', label: 'Athletes', icon: '👥' },
        ] as any
    }

    return (
        <div className="flex flex-col min-h-[600px]">
            {/* Tab Header */}
            <div className="border-b border-gray-200 mb-8 overflow-x-auto">
                <nav className="flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                                ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            <span className="text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1">
                {activeTab === 'categories' && !publicView && (
                    <div className="w-full">
                        <CategoryManager
                            tournamentId={tournament.id}
                            categories={tournament.categories}
                        />
                    </div>
                )}



                {activeTab === 'brackets' && (
                    <div className="w-full">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Brackets</h2>
                            <p className="text-gray-500 text-sm">View and manage match brackets.</p>
                        </div>
                        <BracketList categories={tournament.categories.filter(c => (c._count?.players ?? 0) > 0)} />
                    </div>
                )}

                {activeTab === 'athletes' && (
                    <div className="w-full">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Athletes</h2>
                            <p className="text-gray-500 text-sm">View registered athletes for this tournament.</p>
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

                {activeTab === 'managers' && !publicView && (
                    <div className="w-full">
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
                    <div className="w-full max-w-4xl space-y-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Tournament Settings</h2>
                            <p className="text-gray-500 text-sm">Manage tournament status and data.</p>
                        </div>

                        {/* Status Section */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-base font-semibold text-gray-900 mb-4">Tournament Status</h3>
                            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-500">Current Status</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                            ${tournament.status === 'ONGOING' ? 'bg-green-100 text-green-800' :
                                                tournament.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                                                    tournament.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                        'bg-blue-100 text-blue-800'}`}>
                                            {tournament.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-500">Change Status:</span>
                                    <TournamentStatusActions
                                        tournamentId={tournament.id}
                                        currentStatus={tournament.status}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Data Export Section */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-base font-semibold text-gray-900 mb-4">Data Management</h3>
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">Export tournament data for backup or external use.</p>
                                <DashboardDataExport
                                    tournamentId={tournament.id}
                                    tournamentName={tournament.name}
                                    className="flex-wrap"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
