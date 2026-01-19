'use client'

import React, { useState } from 'react'
import GlobalDropdown from '@/components/GlobalDropdown'
import { ArrowUpDown, Users, ListFilter } from 'lucide-react'

interface ClubData {
    id: string
    name: string
    logoUrl: string | null
    masterName: string
    memberCount: number
    contactPhone: string | null
}

export default function AffiliatedClubsTable({ clubs: initialClubs }: { clubs: ClubData[] }) {
    const [sortKey, setSortKey] = useState<'name' | 'members'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    // Sort logic
    const sortedClubs = [...initialClubs].sort((a, b) => {
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

    const handleSort = (key: 'name' | 'members') => {
        if (sortKey === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortOrder('desc') // Default to desc for members usually, but let's stick to consistent or smart defaults
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-900">Affiliated Clubs</h3>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                        {initialClubs.length} Clubs
                    </span>
                </div>

                {/* Global Dropdown Usage */}
                <GlobalDropdown
                    label="Sort"
                    icon={<ListFilter className="w-4 h-4" />}
                    align="right"
                    items={[
                        {
                            label: 'Name (A-Z)',
                            icon: <ArrowUpDown className="w-4 h-4" />,
                            onClick: () => { setSortKey('name'); setSortOrder('asc'); }
                        },
                        {
                            label: 'Members (High-Low)',
                            icon: <Users className="w-4 h-4" />,
                            onClick: () => { setSortKey('members'); setSortOrder('desc'); }
                        }
                    ]}
                />
            </div>

            {sortedClubs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                    No affiliated clubs yet.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Club</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Master</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Members</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {sortedClubs.map((club) => (
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
                                        <div className="text-sm text-gray-600">{club.masterName}</div>
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
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
