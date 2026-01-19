'use client'

import { Trophy, Medal } from 'lucide-react'

interface TopClub {
    id: string
    name: string
    logoUrl: string | null
    memberCount: number
}

interface RecentMember {
    id: string
    name: string
    club?: { name: string } | null
    belt?: string | null
    createdAt: Date
}

export default function TopPerformersWidget({ topClubs, recentMembers }: { topClubs: TopClub[], recentMembers: any[] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Clubs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-gray-900">Top Clubs</h3>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">By Size</span>
                </div>
                <div className="p-0">
                    {topClubs.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">No clubs found.</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {topClubs.map((club, index) => (
                                <div key={club.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold 
                                            ${index === 0 ? 'bg-amber-100 text-amber-700' :
                                                index === 1 ? 'bg-gray-100 text-gray-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-gray-50 text-gray-500'}`}>
                                            {index + 1}
                                        </div>
                                        <span className="text-sm font-medium text-gray-900 truncate max-w-[140px]">{club.name}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                        {club.memberCount} members
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Registrations */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-center gap-2">
                        <Medal className="w-5 h-5 text-blue-500" />
                        <h3 className="font-bold text-gray-900">Recent Members</h3>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">New</span>
                </div>
                <div className="p-0">
                    {recentMembers.length === 0 ? (
                        <p className="p-4 text-sm text-gray-500 text-center">No recent members.</p>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {recentMembers.map((member) => (
                                <div key={member.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-900">{member.name}</span>
                                        <span className="text-xs text-gray-500">{member.club?.name || 'Unknown Club'}</span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(member.createdAt).toLocaleDateString()}
                                        </span>
                                        {member.belt && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 border border-gray-200">
                                                {member.belt}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
