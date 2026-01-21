'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Search, Filter, MoreHorizontal, Mail, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchClubMembers } from '@/app/actions'
import { toast } from 'sonner'

interface Member {
    id: string
    name: string | null
    email: string
    clerkId: string
    gender: string | null
    weight: number | null
    belt: string | null
    birthDate: Date | null
    imageUrl?: string | null
}

interface MembersGridProps {
    members?: Member[]
    avatars?: Record<string, string>
    currentPage?: number
    totalPages?: number
    isClubMaster: boolean
    baseUrl?: string
    clubName: string
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
    onEdit,
    onDelete
}: MembersGridProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

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

    // LOADING STATE NOT HANDLED VIA EARLY RETURN ANYMORE
    // We now handle it inside the main return

    const members = data?.members || initialMembers
    const totalPages = data?.totalPages || initialTotalPages

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage)

            // Update URL
            const params = new URLSearchParams(searchParams.toString())
            params.set('page', newPage.toString())
            router.push(`${pathname}?${params.toString()}`, { scroll: false })
        }
    }

    return (
        <div className="h-full flex flex-col min-h-0">
            {/* Mobile List View */}
            <div className="sm:hidden divide-y divide-gray-200 overflow-y-auto flex-1">
                {isLoading && !data ? (
                    // Mobile Skeleton
                    [...Array(10)].map((_, i) => (
                        <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                            <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-gray-200 w-32 rounded"></div>
                                <div className="h-3 bg-gray-200 w-24 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : (
                    members.map(member => {
                        const avatar = member.imageUrl || avatars[member.clerkId]
                        const age = member.birthDate
                            ? new Date().getFullYear() - new Date(member.birthDate).getFullYear()
                            : null

                        return (
                            <div key={member.id} className="px-4 py-3 flex items-center gap-3">
                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt={member.name || 'Member'}
                                            className="w-10 h-10 rounded-full object-cover bg-gray-100"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                                            {(member.name || '?').charAt(0)}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                                            {member.name || 'Unnamed Athlete'}
                                        </h3>
                                        {member.belt && (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shadow-sm ${member.belt === 'Black' ? 'bg-gray-900 text-white' :
                                                member.belt === 'Red' ? 'bg-red-500 text-white' :
                                                    member.belt === 'Blue' ? 'bg-blue-500 text-white' :
                                                        member.belt === 'Yellow' ? 'bg-yellow-400 text-gray-900' :
                                                            member.belt === 'Green' ? 'bg-green-500 text-white' :
                                                                member.belt === 'Brown' ? 'bg-amber-700 text-white' :
                                                                    member.belt === 'Orange' ? 'bg-orange-500 text-white' :
                                                                        member.belt === 'White' ? 'bg-white text-gray-700 border border-gray-300' :
                                                                            member.belt === 'Purple' ? 'bg-purple-500 text-white' :
                                                                                'bg-gray-300 text-gray-700'
                                                }`}>
                                                {member.belt}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {age ? `${age} yrs` : '-'} • {member.gender === 'Male' ? 'Male' : member.gender === 'Female' ? 'Female' : '-'}
                                    </p>
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
                                    const avatar = member.imageUrl || avatars[member.clerkId]
                                    const age = member.birthDate
                                        ? new Date().getFullYear() - new Date(member.birthDate).getFullYear()
                                        : null

                                    return (
                                        <tr key={member.id} className="hover:bg-gray-100 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {avatar ? (
                                                            <img className="h-10 w-10 rounded-full object-cover bg-gray-100" src={avatar} alt="" />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                                                                {(member.name || '?').charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="text-sm font-bold text-gray-900">{member.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {member.belt ? (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm ${member.belt === 'Black' ? 'bg-gray-900 text-white border-gray-800' :
                                                        member.belt === 'Red' ? 'bg-red-50 text-red-700 border-red-100' :
                                                            member.belt === 'Blue' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                member.belt === 'Yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                                    member.belt === 'Green' ? 'bg-green-50 text-green-700 border-green-100' :
                                                                        'bg-gray-50 text-gray-600 border-gray-200'
                                                        }`}>
                                                        {member.belt}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
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
                                                        <span className="font-semibold text-gray-900">{member.weight || '-'}</span>
                                                        <span className="text-[10px] uppercase">Kg</span>
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
                                                <div className="flex justify-end gap-2">
                                                    {onEdit && (
                                                        <button
                                                            onClick={() => onEdit(member)}
                                                            className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                                                            title="Edit Member"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>
                                                    )}
                                                    {onDelete && (
                                                        <button
                                                            onClick={() => onDelete(member.id)}
                                                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                            title="Remove Member"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
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
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white flex items-center justify-end">
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

        </div >
    )
}
