'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter, MoreHorizontal, Mail, ChevronLeft, ChevronRight, Pencil, Trash2, Shield, ShieldOff, Loader2, Eye } from 'lucide-react'
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
    clerkId: string | null // Can be null for ghost users
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

    // Initialize state from URL param if available, fallback to props
    const pageParam = Number(searchParams.get('page'))
    const initialPageState = !isNaN(pageParam) && pageParam > 0 ? pageParam : initialPage

    const [page, setPage] = useState(initialPageState)
    const queryClient = useQueryClient()

    // Sync state with URL params (handles back/forward navigation)
    useEffect(() => {
        const p = Number(searchParams.get('page'))
        if (!isNaN(p) && p > 0 && p !== page) {
            setPage(p)
        }
    }, [searchParams])

    const { data, isLoading } = useQuery({
        queryKey: ['club-members', clubName, page],
        queryFn: () => fetchClubMembers(clubName, page, 10),
        initialData: initialMembers.length > 0 && page === initialPageState ? { members: initialMembers, totalPages: initialTotalPages } : undefined,
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
        staleTime: 1000 * 60 // 1 minute
    })

    // Realtime Updates for Members
    useEffect(() => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!supabaseUrl || !supabaseKey || !clubName) return

        const { createClient } = require('@supabase/supabase-js')
        const supabase = createClient(supabaseUrl, supabaseKey)

        const channel = supabase
            .channel(`members-updates-${clubName}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'User',
                    filter: `clubName=eq.${clubName}`
                },
                (payload: any) => {
                    console.log('Realtime member update received:', payload)
                    // Invalidate all pages for this club
                    queryClient.invalidateQueries({ queryKey: ['club-members', clubName] })

                    if (payload.eventType === 'INSERT') {
                        toast.info('New member joined!')
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [clubName, queryClient])

    const handlePromote = async (memberId: string) => {
        setActionLoading(memberId)
        try {
            const result = await promoteToAssistant(memberId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Member promoted to Assistant Club Master')
                queryClient.invalidateQueries({ queryKey: ['club-members', clubName] })
            }
        } catch (error) {
            toast.error('Failed to promote member')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDemote = async (memberId: string) => {
        setActionLoading(memberId)
        try {
            const result = await demoteToAthlete(memberId)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('Member demoted to Athlete')
                queryClient.invalidateQueries({ queryKey: ['club-members', clubName] })
            }
        } catch (error) {
            toast.error('Failed to demote member')
        } finally {
            setActionLoading(null)
        }
    }

    const rawMembers = data?.members || initialMembers
    const totalPages = data?.totalPages || initialTotalPages

    // Client-side search filtering
    const members = searchQuery
        ? rawMembers.filter(m => {
            const q = searchQuery.toLowerCase()
            return (
                (m.name || '').toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q) ||
                (m.belt || '').toLowerCase().includes(q)
            )
        })
        : rawMembers

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage)

            // Update URL
            const params = new URLSearchParams(searchParams.toString())
            params.set('page', newPage.toString())
            router.push(`${pathname}?${params.toString()}`, { scroll: false })
        }
    }

    const getBeltDetails = (belt: string | null) => {
        if (!belt) return null

        let colorClass = 'bg-gray-50 text-gray-600 border-gray-200'
        let displayName = belt

        if (belt === 'Black') colorClass = 'bg-gray-900 text-white border-gray-800'
        else if (belt.includes('Red')) colorClass = 'bg-red-50 text-red-700 border-red-100'
        else if (belt.includes('Blue')) colorClass = 'bg-blue-50 text-blue-700 border-blue-100'
        else if (belt.includes('Yellow')) colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-100'
        else if (belt.includes('Brown')) colorClass = 'bg-amber-100 text-amber-800 border-amber-200' // Using amber for brown

        // Abbreviate Name for Low/High
        if (belt.includes('Low')) displayName = belt.replace('Low ', 'L-')
        if (belt.includes('High')) displayName = belt.replace('High ', 'H-')

        return { colorClass, displayName }
    }

    return (
        <div className="h-full flex flex-col min-h-0">
            {/* Mobile Card View */}
            <div className="sm:hidden flex-1 overflow-y-auto p-4 pb-24 space-y-3 bg-gray-50">
                {isLoading && !data ? (
                    // Mobile Skeleton
                    [...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 animate-pulse">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-gray-200 w-32 rounded"></div>
                                    <div className="h-3 bg-gray-200 w-24 rounded"></div>
                                </div>
                            </div>
                            <div className="h-8 w-full bg-gray-100 rounded"></div>
                        </div>
                    ))
                ) : (
                    members.map(member => {
                        const avatar = member.imageUrl || (member.clerkId ? avatars[member.clerkId] : null)
                        const age = member.birthDate
                            ? calculateAge(member.birthDate)
                            : null
                        const isAssistant = member.role === 'ASSISTANT_CLUB_MASTER'

                        return (
                            <div key={member.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col gap-3 relative overflow-hidden">
                                {/* Top Row: Avatar & Name */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="relative flex-shrink-0">
                                            {avatar ? (
                                                <img
                                                    src={avatar}
                                                    alt={member.name || 'Member'}
                                                    className="w-12 h-12 rounded-full object-cover bg-gray-50 border border-gray-100"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-lg font-bold border border-red-100">
                                                    {(member.name || '?').charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 text-base truncate flex items-center gap-2">
                                                {member.name || 'Unnamed Athlete'}
                                                {isAssistant && (
                                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                        Assistant
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">
                                                {member.email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions (Mobile) */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setViewingMember({ id: member.id, name: member.name || 'Unnamed', avatar })}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="View Details"
                                        >
                                            <Eye size={18} />
                                        </button>
                                        {isClubMaster && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                                        <MoreHorizontal size={18} />
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
                                                    {onEdit && (
                                                        <DropdownMenuItem onClick={() => onEdit(member)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                                        </DropdownMenuItem>
                                                    )}
                                                    {onDelete && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => onDelete(member.id)} className="text-red-600">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Remove Member
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>

                                {/* Belt Badge */}
                                <div className="flex gap-2">
                                    {(() => {
                                        const details = getBeltDetails(member.belt)
                                        if (!details) return null
                                        return (
                                            <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border shadow-sm ${details.colorClass}`}>
                                                {details.displayName}
                                            </span>
                                        )
                                    })()}
                                </div>


                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-gray-50">
                                    <div className="flex flex-col items-center justify-center p-1 bg-gray-50 rounded-lg">
                                        <span className="text-xs font-semibold text-gray-900">{age ? `${age} yrs` : '-'}</span>
                                        <span className="text-[9px] text-gray-400 uppercase tracking-wider">Age</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-1 bg-gray-50 rounded-lg">
                                        <span className="text-xs font-semibold text-gray-900">{member.gender === 'Male' ? 'Male' : member.gender === 'Female' ? 'Female' : '-'}</span>
                                        <span className="text-[9px] text-gray-400 uppercase tracking-wider">Sex</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-1 bg-gray-50 rounded-lg">
                                        {age && age >= 5 && age <= 11 ? (
                                            <>
                                                <span className="text-xs font-semibold text-gray-900">{member.height ? `${member.height}cm` : '-'}</span>
                                                <span className="text-[9px] text-gray-400 uppercase tracking-wider">Height</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xs font-semibold text-gray-900">{member.weight ? `${member.weight}kg` : '-'}</span>
                                                <span className="text-[9px] text-gray-400 uppercase tracking-wider">Weight</span>
                                            </>
                                        )}
                                    </div>
                                </div>


                            </div>
                        )
                    }))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:flex flex-col flex-1 min-h-0 bg-white shadow-sm overflow-hidden">
                <div className="flex-1 overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200 relative">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Belt</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading && !data ? (
                                // Desktop Skeleton Rows
                                [...Array(10)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                                                <div className="h-4 bg-gray-200 rounded w-32"></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-3">
                                                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                                                <div className="w-px h-6 bg-gray-200"></div>
                                                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                                                <div className="w-px h-6 bg-gray-200"></div>
                                                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-4 w-40 bg-gray-200 rounded"></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="ml-auto h-8 w-8 bg-gray-200 rounded-lg"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                members.map(member => {
                                    const avatar = member.imageUrl || (member.clerkId ? avatars[member.clerkId] : null)
                                    const age = member.birthDate
                                        ? calculateAge(member.birthDate)
                                        : null
                                    const isAssistant = member.role === 'ASSISTANT_CLUB_MASTER'

                                    return (
                                        <tr key={member.id} className="hover:bg-gray-100 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 h-10 w-10 relative">
                                                        {avatar ? (
                                                            <img className="h-10 w-10 rounded-full object-cover bg-gray-100" src={avatar} alt="" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                                                                {(member.name || '?').charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                            {member.name}
                                                            {isAssistant && (
                                                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                                    Assistant
                                                                </span>
                                                            )}
                                                        </div>
                                                        {isAssistant && <div className="text-[10px] text-indigo-500 font-medium">Full Access</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {(() => {
                                                    const details = getBeltDetails(member.belt)
                                                    if (details) {
                                                        return (
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm ${details.colorClass}`}>
                                                                {details.displayName}
                                                            </span>
                                                        )
                                                    } else {
                                                        return <span className="text-gray-400 text-xs">-</span>
                                                    }
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center gap-3 text-xs text-gray-500">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900">{age || '-'}</span>
                                                        <span className="text-[10px] uppercase">Age</span>
                                                    </div>
                                                    <div className="w-px h-6 bg-gray-200"></div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900">{member.gender === 'Male' ? 'M' : member.gender === 'Female' ? 'F' : '-'}</span>
                                                        <span className="text-[10px] uppercase">Sex</span>
                                                    </div>
                                                    <div className="w-px h-6 bg-gray-200"></div>
                                                    <div className="flex flex-col">
                                                        {age && age >= 5 && age <= 11 ? (
                                                            <>
                                                                <span className="font-semibold text-gray-900">{member.height || '-'}</span>
                                                                <span className="text-[10px] uppercase">Cm</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="font-semibold text-gray-900">{member.weight || '-'}</span>
                                                                <span className="text-[10px] uppercase">Kg</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <Mail size={14} className="text-gray-400" />
                                                    <span className="truncate max-w-[150px]" title={member.email}>{member.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                    Active
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() => setViewingMember({ id: member.id, name: member.name || 'Unnamed', avatar })}
                                                        className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    {isClubMaster && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button
                                                                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                                >
                                                                    <MoreHorizontal size={18} />
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
                                                                {onEdit && (
                                                                    <DropdownMenuItem onClick={() => onEdit(member)}>
                                                                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {onDelete && (
                                                                    <>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem onClick={() => onDelete(member.id)} className="text-red-600">
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Remove Member
                                                                        </DropdownMenuItem>
                                                                    </>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                }))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}

            {/* Pagination Controls - Footer */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex items-center justify-end fixed bottom-0 left-0 w-full z-30 md:static shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:shadow-none">
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                    <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page <= 1}
                        className={`p-2 rounded-lg transition-all ${page <= 1
                            ? 'text-gray-300 cursor-not-allowed hidden'
                            : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-gray-900 active:scale-95'
                            }`}
                        title="Previous Page"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1.5 px-3">
                        <span className="text-sm font-bold text-gray-900">Page {page}</span>
                        <span className="text-xs text-gray-400 font-medium">of {Math.max(totalPages, 1)}</span>
                    </div>

                    <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= totalPages}
                        className={`p-2 rounded-lg transition-all ${page >= totalPages
                            ? 'text-gray-300 cursor-not-allowed hidden'
                            : 'text-gray-700 hover:bg-white hover:shadow-sm hover:text-gray-900 active:scale-95'
                            }`}
                        title="Next Page"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {
                viewingMember && (
                    <AthleteDetailsModal
                        isOpen={!!viewingMember}
                        onClose={() => setViewingMember(null)}
                        memberId={viewingMember.id}
                        memberName={viewingMember.name}
                        memberAvatar={viewingMember.avatar}
                    />
                )
            }

        </div >
    )
}
