'use client'

import React, { useState } from 'react'
import GlobalDropdown from '@/components/GlobalDropdown'
import { ArrowUpDown, Users, ListFilter } from 'lucide-react'

import { toast } from 'sonner'
import { approveClub, rejectClub } from '@/app/organization/actions'
import { Check, X } from 'lucide-react'

interface ClubData {
    id: string
    name: string
    logoUrl: string | null
    masterName: string
    memberCount: number
    contactPhone: string | null
    address: string | null
    status: string
}

export default function AffiliatedClubsTable({
    clubs: initialClubs,
    embedded = false
}: {
    clubs: ClubData[],
    embedded?: boolean
}) {
    const [sortKey, setSortKey] = useState<'name' | 'members'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const pendingClubs = initialClubs.filter(c => c.status === 'PENDING')
    const approvedClubs = initialClubs.filter(c => c.status === 'APPROVED')

    // Sort logic
    const sortedApprovedClubs = [...approvedClubs].sort((a, b) => {
        if (sortKey === 'name') {
            return sortOrder === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name)
        } else {
            return sortOrder === 'asc'
                ? a.memberCount - b.memberCount
                : b.memberCount - a.memberCount
        }
    })

    const handleApprove = async (clubId: string) => {
        setActionLoading(clubId)
        try {
            await approveClub(clubId)
            toast.success('Club approved successfully')
        } catch (error) {
            toast.error('Failed to approve club')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (clubId: string) => {
        if (!confirm('Are you sure you want to reject this club?')) return
        setActionLoading(clubId)
        try {
            await rejectClub(clubId)
            toast.success('Club rejected')
        } catch (error) {
            toast.error('Failed to reject club')
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="space-y-8">
            {/* Approved Clubs Section */}
            <div className={`${embedded ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Club</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Master Name</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Members</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {sortedApprovedClubs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                        No active affiliated clubs.
                                    </td>
                                </tr>
                            ) : (
                                sortedApprovedClubs.map((club) => (
                                    <tr key={club.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                {club.logoUrl ? (
                                                    <img src={club.logoUrl} alt={club.name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                                        {club.name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className="font-semibold text-gray-900">{club.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-600 font-medium">{club.masterName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{club.address || 'No location'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                {club.memberCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                            {club.contactPhone || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
