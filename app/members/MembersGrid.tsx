'use client'

import { useState } from 'react'
import Link from 'next/link'
import FaceEnrollmentModal from '@/components/FaceEnrollmentModal'

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
    members: Member[]
    avatars: Record<string, string>
    currentPage: number
    totalPages: number
    isClubMaster: boolean
}

export default function MembersGrid({
    members,
    avatars,
    currentPage,
    totalPages,
    isClubMaster
}: MembersGridProps) {
    const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null)

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {members.map(member => {
                    const avatar = avatars[member.clerkId]
                    const age = member.birthDate
                        ? new Date().getFullYear() - new Date(member.birthDate).getFullYear()
                        : null

                    const isEnrolled = !!member.faceDescriptor

                    return (
                        <div key={member.id} className="group bg-white rounded-xl p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 flex flex-col items-center text-center relative overflow-hidden">

                            {/* Top Background Decoration */}
                            <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-gray-50 to-white z-0" />

                            {/* Enrolled Badge */}
                            {isEnrolled && (
                                <div className="absolute top-2 right-2 z-20" title="Face Enrolled">
                                    <span className="text-green-500 text-lg">✓</span>
                                </div>
                            )}

                            {/* Avatar */}
                            <div className="relative z-10 mb-2">
                                <div className="p-0.5 bg-white rounded-full shadow-sm">
                                    {avatar ? (
                                        <img
                                            src={avatar}
                                            alt={member.name || 'Member'}
                                            className="w-14 h-14 rounded-full object-cover bg-gray-100"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center text-lg font-bold">
                                            {(member.name || '?').charAt(0)}
                                        </div>
                                    )}
                                </div>
                                {/* Belt Indicator */}
                                {member.belt && (
                                    <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border shadow-sm ${member.belt === 'Black' ? 'bg-black text-white border-gray-800' :
                                            member.belt === 'Red' ? 'bg-red-600 text-white border-red-700' :
                                                'bg-white text-gray-700 border-gray-200'
                                            }`}>
                                            {member.belt}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="relative z-10 w-full">
                                <h3 className="font-bold text-gray-900 text-sm truncate px-1" title={member.name || ''}>
                                    {member.name || 'Unnamed Athlete'}
                                </h3>

                                <div className="grid grid-cols-3 gap-1 border-t border-gray-100 pt-2 mt-1 mb-2">
                                    <div>
                                        <p className="text-[8px] uppercase text-gray-400 font-semibold">Age</p>
                                        <p className="font-medium text-xs text-gray-900">{age || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] uppercase text-gray-400 font-semibold">Sex</p>
                                        <p className="font-medium text-xs text-gray-900">{member.gender === 'Male' ? 'M' : member.gender === 'Female' ? 'F' : '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] uppercase text-gray-400 font-semibold">Kg</p>
                                        <p className="font-medium text-xs text-gray-900">{member.weight ? member.weight : '-'}</p>
                                    </div>
                                </div>

                                {/* Enrollment Button */}
                                {isClubMaster && (
                                    <button
                                        onClick={() => setSelectedMember({ id: member.id, name: member.name || 'Member' })}
                                        className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${isEnrolled
                                            ? 'bg-white text-green-600 border-green-200 hover:bg-green-50'
                                            : 'bg-gray-900 text-white border-transparent hover:bg-gray-800'
                                            }`}
                                    >
                                        {isEnrolled ? 'Update Face' : 'Enroll Face'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-10 flex justify-center items-center gap-2">
                    <Link
                        href={`/members?page=${currentPage - 1}`}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage <= 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-red-600 hover:text-red-600'
                            }`}
                    >
                        Previous
                    </Link>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Link
                            key={page}
                            href={`/members?page=${page}`}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                ? 'bg-red-600 text-white shadow-md shadow-red-200'
                                : 'bg-white text-gray-700 border border-gray-200 hover:border-red-600 hover:text-red-600'
                                }`}
                        >
                            {page}
                        </Link>
                    ))}

                    <Link
                        href={`/members?page=${currentPage + 1}`}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${currentPage >= totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                            : 'bg-white text-gray-700 border border-gray-200 hover:border-red-600 hover:text-red-600'
                            }`}
                    >
                        Next
                    </Link>
                </div>
            )}

            {/* Modal */}
            {selectedMember && (
                <FaceEnrollmentModal
                    memberId={selectedMember.id}
                    memberName={selectedMember.name}
                    isOpen={true}
                    onClose={() => setSelectedMember(null)}
                    onSuccess={() => setSelectedMember(null)} // Will trigger revalidate via server action
                />
            )}
        </>
    )
}
