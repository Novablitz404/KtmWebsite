'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Search, ChevronLeft, ChevronRight, Trophy, X } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import GlobalDropdown from '@/components/GlobalDropdown'
import type { DashboardRankingsParams, DashboardRankingsResult } from '@/lib/dashboard-rankings'

// Same division names the public Rankings page and the category templates use.
const DIVISIONS = ['Supertoddler', 'Toddler', 'Grade School', 'Cadet', 'Junior', 'Senior']

interface Props {
    /** Server action that returns one page of the public ranking for this dashboard's organization. */
    fetchPage: (params: DashboardRankingsParams) => Promise<DashboardRankingsResult>
    /** Query-cache namespace so the org and club tabs never share cached pages. */
    cacheKey: string
    /** Club dashboards: mark the club's own athletes and offer a "My club only" filter. */
    highlightOwnClub?: boolean
}

export default function DashboardRankingsView({ fetchPage, cacheKey, highlightOwnClub = false }: Props) {
    const [type, setType] = useState<'KYORUGI' | 'POOMSAE'>('KYORUGI')
    const [division, setDivision] = useState('')
    const [gender, setGender] = useState('')
    const [weightCategory, setWeightCategory] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [search, setSearch] = useState('')
    const [myClubOnly, setMyClubOnly] = useState(false)
    const [page, setPage] = useState(1)

    // Wait for a pause in typing so we don't query on every keystroke.
    useEffect(() => {
        const t = setTimeout(() => {
            if (searchInput !== search) {
                setSearch(searchInput)
                setPage(1)
            }
        }, 300)
        return () => clearTimeout(t)
    }, [searchInput, search])

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['dashboard-rankings', cacheKey, type, division, gender, weightCategory, search, myClubOnly, page],
        queryFn: () => fetchPage({ type, division, gender, weightCategory, search, page, myClubOnly }),
        placeholderData: keepPreviousData,
        staleTime: 1000 * 60,
    })

    const rows = data?.rows ?? []
    const total = data?.total ?? 0
    const pageSize = data?.pageSize ?? 25
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const ownClub = data?.clubName ?? null
    const hasFilters = !!(division || gender || weightCategory || searchInput || myClubOnly)

    // Any filter change returns to page 1.
    const onFilter = (apply: () => void) => { apply(); setPage(1) }
    const reset = () => { setDivision(''); setGender(''); setWeightCategory(''); setSearchInput(''); setSearch(''); setMyClubOnly(false); setPage(1) }

    if (data?.notAffiliated) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center px-6">
                <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-900">Your club isn&apos;t affiliated with an organization yet</p>
                <p className="text-xs text-gray-400 mt-1">Rankings are published per organization. Once your club is affiliated, its ranking appears here.</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <GlobalDropdown
                    value={type}
                    onChange={v => onFilter(() => { setType(v as 'KYORUGI' | 'POOMSAE'); setWeightCategory('') })}
                    options={[{ value: 'KYORUGI', label: 'Kyorugi' }, { value: 'POOMSAE', label: 'Poomsae' }]}
                    width="w-36"
                />
                <GlobalDropdown
                    value={division}
                    onChange={v => onFilter(() => { setDivision(v); setWeightCategory('') })}
                    options={[{ value: '', label: 'All divisions' }, ...DIVISIONS.map(d => ({ value: d, label: d }))]}
                    width="w-44"
                />
                <GlobalDropdown
                    value={gender}
                    onChange={v => onFilter(() => { setGender(v); setWeightCategory('') })}
                    options={[{ value: '', label: 'All genders' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
                    width="w-40"
                />
                <GlobalDropdown
                    value={weightCategory}
                    onChange={v => onFilter(() => setWeightCategory(v))}
                    options={[{ value: '', label: 'All weight classes' }, ...(data?.weightClasses ?? []).map(w => ({ value: w, label: w }))]}
                    searchable
                    width="w-52"
                />
                {highlightOwnClub && ownClub && (
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={myClubOnly}
                            onChange={e => onFilter(() => setMyClubOnly(e.target.checked))}
                            className="w-4 h-4 accent-red-600"
                        />
                        My club only
                    </label>
                )}
                <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Search athlete name"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>
                {hasFilters && (
                    <button onClick={reset} className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1">
                        <X className="w-3 h-3" /> Reset
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="py-20 text-center text-sm text-gray-400">Loading rankings…</div>
            ) : rows.length === 0 ? (
                <div className="py-20 text-center">
                    <Trophy className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-900">No ranked athletes</p>
                    <p className="text-xs text-gray-400">Try a different discipline or filter.</p>
                </div>
            ) : (
                <div className={`overflow-x-auto ${isFetching ? 'opacity-60' : ''}`}>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                {['Rank', 'Athlete', 'Club', 'Division', 'Weight class', 'GS Score', 'Status'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {rows.map(r => {
                                const mine = highlightOwnClub && !!ownClub && r.clubName === ownClub
                                return (
                                    <tr key={`${r.userId}-${r.rank}`} className={mine ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50/60'}>
                                        <td className="px-4 py-3 text-sm font-black text-gray-900">#{r.rank}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar src={r.profileImage} name={r.name} size={32} className="!bg-gray-100 border border-gray-200" textClassName="!text-gray-400" />
                                                <div className="min-w-0">
                                                    <Link href={`/athlete/${r.userId}`} className="text-sm font-bold text-gray-900 hover:text-red-600 truncate block">
                                                        {r.name}
                                                    </Link>
                                                    {mine && (
                                                        <span className="mt-0.5 inline-block px-1.5 py-px rounded-full bg-red-100 text-red-700 text-[10px] font-black">Your club</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{r.clubName || 'Independent'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{r.division || '—'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{r.weightCategory || '—'}</td>
                                        <td className="px-4 py-3 text-sm font-mono font-bold text-gray-900">{Math.round(r.totalPoints)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${r.isActive === false ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                {r.isActive === false ? 'Inactive' : 'Active'}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>{total} ranked athlete{total === 1 ? '' : 's'}{data?.organizationName ? ` · ${data.organizationName}` : ''}</span>
                <div className="flex items-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                    <span>Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    )
}
