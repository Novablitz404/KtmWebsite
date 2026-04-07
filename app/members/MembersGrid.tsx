'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
    Search, MoreHorizontal, Mail, ChevronLeft, ChevronRight,
    Pencil, Trash2, Shield, ShieldOff, Eye, Users, CheckCircle2
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchClubMembers } from '@/app/actions'
import { calculateAge } from '@/lib/placement'
import { promoteToAssistant, demoteToAthlete } from '@/app/club/actions'
import { toast } from 'sonner'
import AthleteDetailsModal from '@/components/club/AthleteDetailsModal'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Member {
    id: string
    name: string | null
    email: string
    clerkId: string | null
    gender: string | null
    weight: number | null
    belt: string | null
    birthDate: Date | null
    imageUrl?: string | null
    role: string
    clubName?: string | null
    height?: number | null
    isVerified?: boolean
}

interface MembersGridProps {
    members?: Member[]
    avatars?: Record<string, string>
    currentPage?: number
    totalPages?: number
    isClubMaster: boolean
    baseUrl?: string
    clubName: string
    searchQuery?: string
    onEdit?: (member: Member) => void
    onDelete?: (memberId: string) => void
}

const BELT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    White:  { bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400' },
    Yellow: { bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-400' },
    Orange: { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-400' },
    Green:  { bg: 'bg-green-50',   text: 'text-green-700',  dot: 'bg-green-500' },
    Purple: { bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500' },
    Blue:   { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
    Red:    { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500' },
    Maroon: { bg: 'bg-rose-100',   text: 'text-rose-800',   dot: 'bg-rose-700' },
    Brown:  { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-700' },
    Black:  { bg: 'bg-gray-900',   text: 'text-white',      dot: 'bg-white' },
}

function BeltBadge({ belt }: { belt: string | null }) {
    if (!belt) return <span className="text-gray-300 text-xs">—</span>
    const style = BELT_COLORS[belt] || { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {belt}
        </span>
    )
}

export default function MembersGrid({
    members: initialMembers = [],
    avatars = {},
    currentPage: initialPage = 1,
    totalPages: initialTotalPages = 1,
    isClubMaster,
    baseUrl = '/members',
    clubName,
    searchQuery = '',
    onEdit,
    onDelete
}: MembersGridProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [viewingMember, setViewingMember] = useState<{ id: string; name: string; avatar?: string | null } | null>(null)
    const [openDropdown, setOpenDropdown] = useState<string | null>(null)

    const pageParam = Number(searchParams.get('page'))
    const initialPageState = !isNaN(pageParam) && pageParam > 0 ? pageParam : initialPage
    const [page, setPage] = useState(initialPageState)
    const queryClient = useQueryClient()

    useEffect(() => {
        const p = Number(searchParams.get('page'))
        if (!isNaN(p) && p > 0 && p !== page) setPage(p)
    }, [searchParams])

    useEffect(() => { setPage(1) }, [searchQuery])

    const { data, isLoading } = useQuery({
        queryKey: ['club-members', clubName, page, searchQuery],
        queryFn: () => fetchClubMembers(clubName, page, 10, searchQuery || undefined),
        initialData: initialMembers.length > 0 && page === initialPageState && !searchQuery
            ? { members: initialMembers, totalPages: initialTotalPages }
            : undefined,
        placeholderData: (prev) => prev,
        staleTime: 1000 * 60,
    })

    // Realtime Updates
    useEffect(() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!supabaseUrl || !supabaseKey || !clubName) return
        const { createClient } = require('@supabase/supabase-js')
        const supabase = createClient(supabaseUrl, supabaseKey)
        const channel = supabase
            .channel(`members-updates-${clubName}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'User', filter: `clubName=eq.${clubName}` },
                (payload: any) => {
                    queryClient.invalidateQueries({ queryKey: ['club-members', clubName] })
                    if (payload.eventType === 'INSERT') toast.info('New member joined!')
                })
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [clubName, queryClient])

    const handlePromote = async (memberId: string) => {
        setActionLoading(memberId)
        try {
            const result = await promoteToAssistant(memberId)
            if (result.error) toast.error(result.error)
            else { toast.success('Promoted to Assistant Club Master'); queryClient.invalidateQueries({ queryKey: ['club-members', clubName] }) }
        } catch { toast.error('Failed to promote member') }
        finally { setActionLoading(null) }
    }

    const handleDemote = async (memberId: string) => {
        setActionLoading(memberId)
        try {
            const result = await demoteToAthlete(memberId)
            if (result.error) toast.error(result.error)
            else { toast.success('Demoted to Athlete'); queryClient.invalidateQueries({ queryKey: ['club-members', clubName] }) }
        } catch { toast.error('Failed to demote member') }
        finally { setActionLoading(null) }
    }

    const members = data?.members || initialMembers
    const totalPages = data?.totalPages || initialTotalPages

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage)
            const params = new URLSearchParams(searchParams.toString())
            params.set('page', newPage.toString())
            router.push(`${pathname}?${params.toString()}`, { scroll: false })
        }
    }

    const skeletonRows = [...Array(8)]

    return (
        <div className="h-full flex flex-col min-h-0">

            {/* ─── Mobile Card List ──────────────────────────────────────── */}
            <div className="sm:hidden flex-1 overflow-y-auto p-4 pb-24 space-y-3 bg-gray-50">
                {isLoading && !data ? (
                    skeletonRows.map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-11 w-11 rounded-full bg-gray-200 flex-shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-gray-200 w-36 rounded-md" />
                                    <div className="h-3 bg-gray-100 w-24 rounded-md" />
                                </div>
                            </div>
                            <div className="h-7 w-full bg-gray-100 rounded-xl" />
                        </div>
                    ))
                ) : members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                            <Users className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 mb-1">No members found</p>
                        <p className="text-xs text-gray-400">Members will appear here once added to the club</p>
                    </div>
                ) : (
                    members.map(member => {
                        const age = member.birthDate ? calculateAge(member.birthDate) : null
                        const isAssistant = member.role === 'ASSISTANT_CLUB_MASTER'
                        return (
                            <div key={member.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="p-4">
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-gray-900 text-sm truncate">{member.name || 'Unnamed Athlete'}</h3>
                                                    {isAssistant && (
                                                        <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider flex-shrink-0">Asst.</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{member.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <button
                                                onClick={() => setViewingMember({ id: member.id, name: member.name || 'Unnamed', avatar: null })}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {isClubMaster && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                                                            <MoreHorizontal size={16} />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {isAssistant ? (
                                                            <DropdownMenuItem onClick={() => handleDemote(member.id)} disabled={!!actionLoading} className="text-orange-600">
                                                                <ShieldOff className="mr-2 h-4 w-4" /> Demote to Athlete
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem onClick={() => handlePromote(member.id)} disabled={!!actionLoading} className="text-indigo-600">
                                                                <Shield className="mr-2 h-4 w-4" /> Promote to Assistant
                                                            </DropdownMenuItem>
                                                        )}
                                                        {onEdit && <DropdownMenuItem onClick={() => onEdit(member)}><Pencil className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>}
                                                        {onDelete && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={() => onDelete(member.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Remove Member</DropdownMenuItem></>)}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>

                                    {/* Belt + Stats */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <BeltBadge belt={member.belt} />
                                        <div className="flex items-center gap-2 text-xs text-gray-500 ml-auto">
                                            {age && <span className="font-semibold text-gray-700">{age} yrs</span>}
                                            {age && member.gender && <span className="text-gray-300">·</span>}
                                            {member.gender && <span>{member.gender === 'Male' ? 'M' : 'F'}</span>}
                                            {member.weight && <><span className="text-gray-300">·</span><span>{member.weight} kg</span></>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* ─── Desktop Table ─────────────────────────────────────────── */}
            <div className="hidden sm:flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Member</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Belt</th>
                                <th className="px-4 py-3.5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Age</th>
                                <th className="px-4 py-3.5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Sex</th>
                                <th className="px-4 py-3.5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Weight</th>
                                <th className="px-4 py-3.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                                <th className="px-4 py-3.5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-4 py-3.5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading && !data ? (
                                skeletonRows.map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="h-4 bg-gray-100 rounded-md w-32" />
                                        </td>
                                        <td className="px-4 py-4"><div className="h-6 w-16 bg-gray-100 rounded-lg" /></td>
                                        <td className="px-4 py-4 text-center"><div className="h-4 w-8 bg-gray-100 rounded mx-auto" /></td>
                                        <td className="px-4 py-4 text-center"><div className="h-4 w-6 bg-gray-100 rounded mx-auto" /></td>
                                        <td className="px-4 py-4 text-center"><div className="h-4 w-12 bg-gray-100 rounded mx-auto" /></td>
                                        <td className="px-4 py-4"><div className="h-4 w-40 bg-gray-100 rounded-md" /></td>
                                        <td className="px-4 py-4 text-center"><div className="h-5 w-14 bg-gray-100 rounded-full mx-auto" /></td>
                                        <td className="px-4 py-4 text-right"><div className="h-7 w-7 bg-gray-100 rounded-lg ml-auto" /></td>
                                    </tr>
                                ))
                            ) : members.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                                <Users className="w-6 h-6 text-gray-300" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">No members found</p>
                                                <p className="text-xs text-gray-400 mt-1">Members will appear here once added</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                members.map(member => {
                                    const age = member.birthDate ? calculateAge(member.birthDate) : null
                                    const isAssistant = member.role === 'ASSISTANT_CLUB_MASTER'
                                    const showHeight = age !== null && age >= 5 && age <= 11

                                    return (
                                        <tr
                                            key={member.id}
                                            className="hover:bg-gray-50/70 transition-colors group"
                                        >
                                            {/* Member */}
                                            <td className="px-6 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900">{member.name || '—'}</span>
                                                        {isAssistant && (
                                                            <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider">Asst.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Belt */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <BeltBadge belt={member.belt} />
                                            </td>

                                            {/* Age */}
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                <span className="text-sm font-semibold text-gray-800">{age ?? '—'}</span>
                                            </td>

                                            {/* Sex */}
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${member.gender === 'Male' ? 'bg-sky-50 text-sky-600' : member.gender === 'Female' ? 'bg-pink-50 text-pink-600' : 'text-gray-300'}`}>
                                                    {member.gender === 'Male' ? 'M' : member.gender === 'Female' ? 'F' : '—'}
                                                </span>
                                            </td>

                                            {/* Weight / Height */}
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                {showHeight
                                                    ? <span className="text-sm font-semibold text-gray-800">{member.height ? `${member.height} cm` : '—'}</span>
                                                    : <span className="text-sm font-semibold text-gray-800">{member.weight ? `${member.weight} kg` : '—'}</span>
                                                }
                                            </td>

                                            {/* Email */}
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-500 max-w-[200px]">
                                                    <Mail size={12} className="text-gray-300 flex-shrink-0" />
                                                    <span className="truncate" title={member.email}>{member.email}</span>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                    <CheckCircle2 size={10} />
                                                    Active
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Eye button — standalone, always visible */}
                                                    <button
                                                        onClick={() => setViewingMember({ id: member.id, name: member.name || 'Unnamed', avatar: null })}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={15} />
                                                    </button>

                                                    {/* Three-dot dropdown */}
                                                    {isClubMaster && (
                                                        <DropdownMenu
                                                            open={openDropdown === member.id}
                                                            onOpenChange={(o) => setOpenDropdown(o ? member.id : null)}
                                                        >
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                                                    <MoreHorizontal size={15} />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent
                                                                align="end"
                                                                sideOffset={6}
                                                                className="w-56 p-0 rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                                                            >
                                                                {/* Action items */}
                                                                <div className="p-1.5 space-y-0.5">
                                                                    {/* Edit */}
                                                                    {onEdit && (
                                                                        <DropdownMenuItem asChild>
                                                                            <button
                                                                                onClick={() => { setOpenDropdown(null); onEdit(member) }}
                                                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group text-left cursor-pointer"
                                                                            >
                                                                                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                                                                                    <Pencil size={13} className="text-gray-600" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-xs font-bold text-gray-800">Edit Details</p>
                                                                                    <p className="text-[10px] text-gray-400">Update member info</p>
                                                                                </div>
                                                                            </button>
                                                                        </DropdownMenuItem>
                                                                    )}

                                                                    {/* Promote / Demote */}
                                                                    {isAssistant ? (
                                                                        <DropdownMenuItem asChild>
                                                                            <button
                                                                                onClick={() => { setOpenDropdown(null); handleDemote(member.id) }}
                                                                                disabled={actionLoading === member.id}
                                                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 transition-colors group text-left cursor-pointer disabled:opacity-50"
                                                                            >
                                                                                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                                                                                    {actionLoading === member.id
                                                                                        ? <span className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                                                                        : <ShieldOff size={13} className="text-orange-600" />
                                                                                    }
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-xs font-bold text-orange-700">Demote to Athlete</p>
                                                                                    <p className="text-[10px] text-orange-400">Remove assistant role</p>
                                                                                </div>
                                                                            </button>
                                                                        </DropdownMenuItem>
                                                                    ) : (
                                                                        <DropdownMenuItem asChild>
                                                                            <button
                                                                                onClick={() => { setOpenDropdown(null); handlePromote(member.id) }}
                                                                                disabled={actionLoading === member.id}
                                                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 transition-colors group text-left cursor-pointer disabled:opacity-50"
                                                                            >
                                                                                <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-200 transition-colors">
                                                                                    {actionLoading === member.id
                                                                                        ? <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                                                                        : <Shield size={13} className="text-indigo-600" />
                                                                                    }
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-xs font-bold text-indigo-700">Promote to Assistant</p>
                                                                                    <p className="text-[10px] text-indigo-400">Grant club management access</p>
                                                                                </div>
                                                                            </button>
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </div>

                                                                {/* Destructive zone */}
                                                                {onDelete && (
                                                                    <div className="p-1.5 border-t border-gray-100">
                                                                        <DropdownMenuItem asChild>
                                                                            <button
                                                                                onClick={() => { setOpenDropdown(null); onDelete(member.id) }}
                                                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 transition-colors group text-left cursor-pointer"
                                                                            >
                                                                                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
                                                                                    <Trash2 size={13} className="text-red-600" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-xs font-bold text-red-600">Remove Member</p>
                                                                                    <p className="text-[10px] text-red-400">Permanently remove from club</p>
                                                                                </div>
                                                                            </button>
                                                                        </DropdownMenuItem>
                                                                    </div>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─── Pagination ────────────────────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex-shrink-0 px-6 py-3.5 border-t border-gray-100 bg-white flex items-center justify-between fixed bottom-0 left-0 w-full z-30 md:static md:shadow-none shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
                    <p className="text-xs text-gray-400 font-medium hidden sm:block">
                        Page <span className="font-bold text-gray-700">{page}</span> of <span className="font-bold text-gray-700">{totalPages}</span>
                    </p>
                    <div className="flex items-center gap-1 mx-auto sm:mx-0">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const p = i + Math.max(1, page - 2)
                                if (p > totalPages) return null
                                return (
                                    <button
                                        key={p}
                                        onClick={() => handlePageChange(p)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === page ? 'bg-red-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        {p}
                                    </button>
                                )
                            })}
                        </div>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Athlete Details Modal ─────────────────────────────────── */}
            {viewingMember && (
                <AthleteDetailsModal
                    isOpen={!!viewingMember}
                    onClose={() => setViewingMember(null)}
                    memberId={viewingMember.id}
                    memberName={viewingMember.name}
                    memberAvatar={viewingMember.avatar}
                />
            )}
        </div>
    )
}
