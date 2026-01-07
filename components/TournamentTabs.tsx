'use client'

import { useState } from 'react'
import { Category, Match, Player, Tournament, GuidelineTemplate, User, TournamentManagerInvite } from '@prisma/client'
import CategoryManager from './CategoryManager'
import TournamentScheduler from './TournamentScheduler'
import BracketList from './BracketList'
import PlayerRegistration from './PlayerRegistration'
import TournamentManagers from './TournamentManagers'

type TournamentWithData = Tournament & {
    categories: (Category & { matches: Match[] })[]
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
    availableTemplates: { id: string; name: string }[]
    pendingManagerInvites?: TournamentManagerInvite[]
}

export default function TournamentTabs({ tournament, players, availableTemplates, pendingManagerInvites = [] }: TournamentTabsProps) {
    const [activeTab, setActiveTab] = useState<'categories' | 'scheduler' | 'brackets' | 'athletes' | 'managers'>('categories')

    const tabs = [
        { id: 'categories', label: 'Categories', icon: '📋' },
        { id: 'scheduler', label: 'Scheduler', icon: '📅' },
        { id: 'brackets', label: 'Brackets', icon: '🏆' },
        { id: 'athletes', label: 'Athletes', icon: '👥' },
        { id: 'managers', label: 'Managers', icon: '🔑' },
    ] as const

    return (
        <div className="flex flex-col min-h-[600px]">
            {/* Tab Header */}
            <div className="border-b border-gray-200 mb-8 overflow-x-auto">
                <nav className="flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
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
                {activeTab === 'categories' && (
                    <div className="w-full">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Manage Categories</h2>
                            <p className="text-gray-500 text-sm">Select a guideline template to populate divisions and weight categories.</p>
                        </div>
                        <CategoryManager
                            tournamentId={tournament.id}
                            categories={tournament.categories}
                            currentTemplateId={tournament.guidelineTemplateId}
                            currentTemplateName={tournament.guidelineTemplate?.name || null}
                            availableTemplates={availableTemplates}
                        />
                    </div>
                )}

                {activeTab === 'scheduler' && (
                    <div className="w-full">
                        <TournamentScheduler
                            tournamentId={tournament.id}
                            categories={tournament.categories}
                            players={players}
                        />
                    </div>
                )}

                {activeTab === 'brackets' && (
                    <div className="w-full">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Brackets</h2>
                            <p className="text-gray-500 text-sm">View and manage match brackets.</p>
                        </div>
                        <BracketList categories={tournament.categories} />
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
                            players={players}
                        />
                    </div>
                )}

                {activeTab === 'managers' && (
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
            </div>
        </div>
    )
}
