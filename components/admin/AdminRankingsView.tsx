'use client'

import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import { fetchAdminRankingScopes, fetchAdminRankings } from '@/app/admin/fetch'

const PAGE_SIZE = 25

export default function AdminRankingsView() {
    const [scope, setScope] = useState('')
    const [type, setType] = useState<'KYORUGI' | 'POOMSAE'>('KYORUGI')
    const [division, setDivision] = useState('')
    const [gender, setGender] = useState('')
    const [search, setSearch] = useState('')
    const [includeUnlicensed, setIncludeUnlicensed] = useState(true)
    const [page, setPage] = useState(1)

    const { data: scopes = [] } = useQuery({
        queryKey: ['admin-ranking-scopes'],
        queryFn: () => fetchAdminRankingScopes(),
        staleTime: 1000 * 60 * 5,
    })
    const activeScope = scope || scopes[0]?.scope || ''

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['admin-rankings', activeScope, type, includeUnlicensed, division, gender, search, page],
        queryFn: () => fetchAdminRankings({ scope: activeScope, type, includeUnlicensed, division, gender, search, page, pageSize: PAGE_SIZE }),
        enabled: !!activeScope,
        placeholderData: keepPreviousData,
    })

    const rows = data?.rows ?? []
    const total = data?.total ?? 0
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

    // Any filter change returns to page 1.
    const onFilter = (apply: () => void) => { apply(); setPage(1) }

    const selectCls = 'px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500'

    return (
        <div className="h-full flex flex-col p-4 md:p-6 lg:p-8 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
                    <select value={activeScope} onChange={e => onFilter(() => setScope(e.target.value))} className={selectCls}>
                        {scopes.map(s => <option key={s.scope} value={s.scope}>{s.name} ({s.count})</option>)}
                    </select>
                    <select value={type} onChange={e => onFilter(() => setType(e.target.value as 'KYORUGI' | 'POOMSAE'))} className={selectCls}>
                        <option value="KYORUGI">Kyorugi</option>
                        <option value="POOMSAE">Poomsae</option>
                    </select>
                    <select value={division} onChange={e => onFilter(() => setDivision(e.target.value))} className={selectCls}>
                        <option value="">All divisions</option>
                        {(data?.divisions ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={gender} onChange={e => onFilter(() => setGender(e.target.value))} className={selectCls}>
                        <option value="">All genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={includeUnlicensed}
                            onChange={e => onFilter(() => setIncludeUnlicensed(e.target.checked))}
                            className="w-4 h-4 accent-red-600"
                        />
                        Include unlicensed athletes
                    </label>
                    <div className="relative flex-1 min-w-[180px]">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            value={search}
                            onChange={e => onFilter(() => setSearch(e.target.value))}
                            placeholder="Search athlete name"
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-20 text-center text-sm text-gray-400">Loading rankings…</div>
                ) : rows.length === 0 ? (
                    <div className="py-20 text-center">
                        <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm font-bold text-gray-900">No ranked athletes</p>
                        <p className="text-xs text-gray-400">Try a different organization, discipline or filter.</p>
                    </div>
                ) : (
                    <div className={`overflow-x-auto ${isFetching ? 'opacity-60' : ''}`}>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    {['Rank', 'Public Rank', 'Athlete', 'Club', 'Division', 'Weight', 'Elo', 'Field Bonus', 'Points', 'Matches', 'Status'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {rows.map(r => (
                                    <tr key={`${r.userId}-${r.division}-${r.weightCategory}`} className="hover:bg-gray-50/60">
                                        <td className="px-4 py-3 text-sm font-black text-gray-900">#{r.rank}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{r.publicRank ? `#${r.publicRank}` : '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar src={r.imageUrl} name={r.name} size={32} className="!bg-gray-100 border border-gray-200" textClassName="!text-gray-400" />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{r.name}</p>
                                                    <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                                                        {r.athleteNumber && <span className="font-mono">{r.athleteNumber}</span>}
                                                        {!r.isVerified && <span className="px-1.5 py-px rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-black">Unlicensed</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{r.clubName || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{[r.division, r.gender].filter(Boolean).join(' · ') || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{r.weightCategory || '—'}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{r.eloRating}</td>
                                        <td className="px-4 py-3 text-sm font-mono text-gray-700">{r.fieldBonus}</td>
                                        <td className="px-4 py-3 text-sm font-mono font-bold text-gray-900">{r.totalPoints}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{r.matchCount}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${r.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                                {r.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>{total} ranked athlete{total === 1 ? '' : 's'}</span>
                    <div className="flex items-center gap-2">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                        <span>Page {page} of {totalPages}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        </div>
    )
}
