'use client'

import React from 'react'

interface OrgData {
    id: string
    name: string
    logoUrl: string | null
    memberCount: number
    clubCount: number
    contactEmail: string | null
}

export default function AffiliatedOrgsTable({
    orgs,
    embedded = false,
    isLoading = false
}: {
    orgs: OrgData[],
    embedded?: boolean,
    isLoading?: boolean
}) {
    return (
        <div className={`${embedded ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
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
                        {isLoading ? (
                            // Skeleton Rows
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-gray-100" />
                                            <div className="h-4 w-32 bg-gray-100 rounded" />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="mx-auto h-4 w-12 bg-gray-100 rounded" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <div className="mx-auto h-5 w-8 bg-gray-100 rounded-full" />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="ml-auto h-4 w-32 bg-gray-100 rounded" />
                                    </td>
                                </tr>
                            ))
                        ) : orgs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                                    No affiliated organizations linked yet.
                                </td>
                            </tr>
                        ) : (
                            orgs.map((org) => (
                                <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            {org.logoUrl ? (
                                                <img src={org.logoUrl} alt={org.name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 font-bold border border-red-100">
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
