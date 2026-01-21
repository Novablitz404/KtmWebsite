'use client'

import React, { useState } from 'react'
import { Globe, ArrowUpDown, Users, Building2, ListFilter } from 'lucide-react'
import GlobalDropdown from '@/components/GlobalDropdown'

interface OrgData {
    id: string
    name: string
    logoUrl: string | null
    memberCount: number
    clubCount: number
    contactEmail: string | null
}

export default function AffiliatedOrgsTable({
    orgs: initialOrgs,
    embedded = false
}: {
    orgs: OrgData[],
    embedded?: boolean
}) {
    const [sortKey, setSortKey] = useState<'name' | 'clubs' | 'members'>('name')
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    // Sort logic
    const sortedOrgs = [...initialOrgs].sort((a, b) => {
        if (sortKey === 'name') {
            return sortOrder === 'asc'
                ? a.name.localeCompare(b.name)
                : b.name.localeCompare(a.name)
        } else if (sortKey === 'clubs') {
            return sortOrder === 'asc'
                ? a.clubCount - b.clubCount
                : b.clubCount - a.clubCount
        } else {
            return sortOrder === 'asc'
                ? a.memberCount - b.memberCount
                : b.memberCount - a.memberCount
        }
    })

    return (
        <div className={`${embedded ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-white">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span>🌐</span> Affiliated Organizations
                    </h3>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {initialOrgs.length} Orgs
                    </span>
                </div>

                {!embedded && (
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
                                label: 'Clubs (High-Low)',
                                icon: <Building2 className="w-4 h-4" />,
                                onClick: () => { setSortKey('clubs'); setSortOrder('desc'); }
                            },
                            {
                                label: 'Members (High-Low)',
                                icon: <Users className="w-4 h-4" />,
                                onClick: () => { setSortKey('members'); setSortOrder('desc'); }
                            }
                        ]}
                    />
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Clubs</th>
                            <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Members</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {sortedOrgs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                                    No affiliated organizations linked yet.
                                </td>
                            </tr>
                        ) : (
                            sortedOrgs.map((org) => (
                                <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            {org.logoUrl ? (
                                                <img src={org.logoUrl} alt={org.name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                                    {org.name.charAt(0)}
                                                </div>
                                            )}
                                            <span className="font-semibold text-gray-900">{org.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="text-sm font-medium text-gray-700">{org.clubCount}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            {org.memberCount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                                        {org.contactEmail || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
