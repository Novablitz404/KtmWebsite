'use client'

import { use } from 'react'
import MembersGrid from './MembersGrid'
import type { MembersPageData } from './data'

interface MembersTableContentProps {
    dataPromise: Promise<MembersPageData>
    currentPage: number
    pageSize: number
    isClubMaster: boolean
    baseUrl: string
}

export default function MembersTableContent({
    dataPromise,
    currentPage,
    pageSize,
    isClubMaster,
    baseUrl
}: MembersTableContentProps) {
    const data = use(dataPromise)

    const { paginatedMembers, totalMembers, avatars } = data
    const totalPages = Math.ceil(totalMembers / pageSize)
    const skip = (currentPage - 1) * pageSize

    if (paginatedMembers.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-10 sm:p-16 text-center shadow-sm border border-gray-200">
                <div className="text-5xl sm:text-6xl mb-4">👥</div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No members found</h3>
                <p className="text-gray-500 text-sm">
                    Try adjusting your search terms or invite athletes to join!
                </p>
            </div>
        )
    }

    return (
        <>
            {/* Update member count in header via portal or just show in content */}
            <div className="hidden sm:block absolute right-6 lg:right-8 top-[88px] text-sm text-gray-500">
                {totalMembers} Members
            </div>

            {/* Mobile pagination info */}
            <div className="sm:hidden text-xs text-gray-500 mb-3 text-center">
                Showing {skip + 1}-{Math.min(skip + pageSize, totalMembers)} of {totalMembers} members
            </div>

            <MembersGrid
                members={paginatedMembers}
                avatars={avatars}
                currentPage={currentPage}
                totalPages={totalPages}
                isClubMaster={isClubMaster}
                baseUrl={baseUrl}
            />
        </>
    )
}
