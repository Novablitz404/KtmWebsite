'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Mail } from 'lucide-react'
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
    faceDescriptor: string | null
}

interface MembersGridProps {
    members?: Member[]
    avatars?: Record<string, string>
    currentPage?: number
    totalPages?: number
    isClubMaster: boolean
    baseUrl?: string
    clubName: string
}

export default function MembersGrid({
    members: initialMembers = [],
    avatars = {},
    currentPage: initialPage = 1,
    totalPages: initialTotalPages = 1,
    isClubMaster,
    baseUrl = '/members',
    clubName
}: MembersGridProps) {

    const [page, setPage] = useState(initialPage)
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['club-members', clubName, page],
        queryFn: () => fetchClubMembers(clubName, page, 8),
        initialData: initialMembers.length > 0 ? { members: initialMembers, totalPages: initialTotalPages } : undefined,
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

    if (isLoading && !data) {
        return (
            <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-white border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Belt</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <tr key={i}>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }



    const members = data?.members || initialMembers
    const totalPages = data?.totalPages || initialTotalPages

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage)
        }
    }

    return (
        <>
            {/* Mobile List View */}
            {/* Mobile List View */}
            <div className="sm:hidden divide-y divide-gray-200 bg-white">
                {members.map(member => {
                    const avatar = avatars[member.clerkId]
                    const age = member.birthDate
                        ? new Date().getFullYear() - new Date(member.birthDate).getFullYear()
                        : null
                    const isEnrolled = !!member.faceDescriptor

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

                            {/* Action */}
                        </div>
                    )
                })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-white border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Belt</th>
                                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {members.map(member => {
                                const avatar = avatars[member.clerkId]
                                const age = member.birthDate
                                    ? new Date().getFullYear() - new Date(member.birthDate).getFullYear()
                                    : null

                                return (
                                    <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
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
                                            <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {
                totalPages > 1 && (
                    <div className="mt-10 flex justify-center items-center gap-2">
                        <button
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page <= 1}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${page <= 1
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                                : 'bg-white text-gray-700 border border-gray-200 hover:border-red-600 hover:text-red-600'
                                }`}
                        >
                            Previous
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                            <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${page === pageNum
                                    ? 'bg-red-600 text-white shadow-md shadow-red-200'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:border-red-600 hover:text-red-600'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        ))}

                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= totalPages}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${page >= totalPages
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                                : 'bg-white text-gray-700 border border-gray-200 hover:border-red-600 hover:text-red-600'
                                }`}
                        >
                            Next
                        </button>
                    </div>
                )
            }

        </>
    )
}
