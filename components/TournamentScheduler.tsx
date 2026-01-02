'use client'

import { useState, useEffect, useMemo } from 'react'
import { scheduleTournament } from '@/app/actions'
import { Category, Player } from '@prisma/client'

interface TournamentSchedulerProps {
    tournamentId: string
    categories: Category[]
    players: (Player & { category: Category })[]
}

interface CourtConfig {
    name: string
    categoryIds: string[]
}

export default function TournamentScheduler({ tournamentId, categories, players }: TournamentSchedulerProps) {
    // Filter to only categories that have at least one player
    const categoriesWithPlayers = useMemo(() => {
        const categoryIdsWithPlayers = new Set(players.map(p => p.categoryId))
        return categories.filter(c => categoryIdsWithPlayers.has(c.id))
    }, [categories, players])

    const [courtCount, setCourtCount] = useState(2)
    const [courts, setCourts] = useState<CourtConfig[]>([])
    const [isGenerating, setIsGenerating] = useState(false)
    const [message, setMessage] = useState('')

    // Initialize courts from existing matches (persistence)
    useEffect(() => {
        // Collect existing assignments
        const assignments = new Map<string, string[]>(); // CourtName -> CategoryIDs

        categoriesWithPlayers.forEach(cat => {
            // Check matches for this category to find its court
            const courtName = ('matches' in cat && Array.isArray(cat.matches) && cat.matches.length > 0)
                ? cat.matches[0].court
                : null;

            if (courtName && courtName !== 'Unassigned') {
                if (!assignments.has(courtName)) {
                    assignments.set(courtName, []);
                }
                assignments.get(courtName)!.push(cat.id);
            }
        });

        const maxCourtNum = Array.from(assignments.keys())
            .map(name => parseInt(name.replace('Court ', '')))
            .filter(n => !isNaN(n))
            .reduce((max, curr) => Math.max(max, curr), 0) || 2;

        setCourtCount(Math.max(courtCount, maxCourtNum));

        setCourts(prev => {
            const countToUse = Math.max(courtCount, maxCourtNum);
            return Array.from({ length: countToUse }).map((_, i) => {
                const name = `Court ${i + 1}`;
                return {
                    name,
                    categoryIds: assignments.get(name) || []
                };
            });
        })
    }, [categoriesWithPlayers]);

    const getUnassignedCategories = () => {
        const assignedIds = new Set(courts.flatMap(c => c.categoryIds));
        return categoriesWithPlayers.filter(c => !assignedIds.has(c.id));
    }

    const addCategoryToCourt = (courtIndex: number, categoryId: string) => {
        setCourts(prev => {
            const next = [...prev];
            next[courtIndex] = {
                ...next[courtIndex],
                categoryIds: [...next[courtIndex].categoryIds, categoryId]
            };
            return next;
        })
    }

    const removeCategoryFromCourt = (courtIndex: number, categoryId: string) => {
        setCourts(prev => {
            const next = [...prev];
            next[courtIndex] = {
                ...next[courtIndex],
                categoryIds: next[courtIndex].categoryIds.filter(id => id !== categoryId)
            };
            return next;
        })
    }

    const handleGenerate = async () => {
        if (!confirm("This will regenerate ALL brackets. Existing matches will be lost. Continue?")) return;

        setIsGenerating(true)
        setMessage('Generating schedule...')
        try {
            const result = await scheduleTournament(tournamentId, courts)
            if (result.error) {
                setMessage(`Error: ${result.error}`)
            } else {
                setMessage(`Success! Generated ${result.count} matches.`)
            }
        } catch (e) {
            setMessage('Failed to generate.')
            console.error(e)
        } finally {
            setIsGenerating(false)
        }
    }

    const unassigned = getUnassignedCategories();

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Tournament Scheduler</h2>
                    <p className="text-gray-500 text-sm">Assign courts and generate the master schedule.</p>
                </div>
                <div className="flex items-center gap-4">
                    {message && (
                        <span className={`text-sm font-medium ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                            {message}
                        </span>
                    )}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {isGenerating ? 'Generating...' : 'Generate Schedule'}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Courts</label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={courtCount}
                        onChange={(e) => setCourtCount(parseInt(e.target.value) || 1)}
                        className="border border-gray-300 rounded px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {courts.map((court, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col h-full shadow-sm">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
                            <h4 className="font-bold text-gray-800">{court.name}</h4>
                            <span className="text-xs text-gray-400 font-mono">{court.categoryIds.length} Divs</span>
                        </div>

                        <div className="flex-1 space-y-2 mb-4">
                            {court.categoryIds.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-4 italic">No categories assigned</p>
                            )}
                            {court.categoryIds.map(catId => {
                                const cat = categories.find(c => c.id === catId);
                                if (!cat) return null;
                                return (
                                    <div key={cat.id} className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm flex justify-between items-center group">
                                        <span className="truncate flex-1 mr-2" title={cat.name}>{cat.name}</span>
                                        <button
                                            onClick={() => removeCategoryFromCourt(idx, cat.id)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )
                            })}
                        </div>

                        <div>
                            <select
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white text-gray-600 focus:ring-1 focus:ring-indigo-500"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        addCategoryToCourt(idx, e.target.value);
                                        e.target.value = "";
                                    }
                                }}
                            >
                                <option value="">+ Add Division...</option>
                                {unassigned.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            {unassigned.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    <strong>Unassigned Divisions:</strong> {unassigned.map(c => c.name).join(', ')}
                </div>
            )}
        </div>
    )
}
