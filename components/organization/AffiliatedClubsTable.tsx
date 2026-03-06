'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { approveAffiliationProof, rejectAffiliationProof, manuallyActivateAffiliation } from '@/app/organization/actions'
import {
    Check, X, Building2, Users, Phone, Mail, MapPin,
    Calendar, Shield, ShieldCheck, ShieldAlert, ShieldX,
    Clock, Eye, CheckCircle, XCircle, ChevronRight, Globe, Award
} from 'lucide-react'

interface ClubData {
    id: string
    name: string
    logoUrl: string | null
    masterName: string
    masterEmail?: string | null
    masterImageUrl?: string | null
    masterBelt?: string | null
    masterGender?: string | null
    masterCountry?: string | null
    memberCount: number
    contactPhone: string | null
    address: string | null
    status: string
    affiliationStatus?: string
    affiliationExpiresAt?: string | null
    affiliationPaidAt?: string | null
    affiliationProofImageUrl?: string | null
    affiliationId?: string | null
}

const affiliationBadge = (status: string) => {
    switch (status) {
        case 'ACTIVE': return { bg: 'bg-green-100 text-green-700', label: 'Active', icon: ShieldCheck }
        case 'PENDING_REVIEW': return { bg: 'bg-blue-100 text-blue-700', label: 'Pending', icon: Clock }
        case 'EXPIRED': return { bg: 'bg-amber-100 text-amber-700', label: 'Expired', icon: ShieldAlert }
        default: return { bg: 'bg-red-100 text-red-700', label: 'Unpaid', icon: ShieldX }
    }
}

export default function AffiliatedClubsTable({
    clubs: initialClubs,
    embedded = false,
    isLoading = false
}: {
    clubs: ClubData[],
    embedded?: boolean,
    isLoading?: boolean
}) {
    const [selectedClub, setSelectedClub] = useState<ClubData | null>(null)
    const [viewingProof, setViewingProof] = useState<string | null>(null)

    const approvedClubs = initialClubs.filter(c => c.status === 'APPROVED')

    const handleApproveAffiliation = async (affiliationId: string) => {
        const res = await approveAffiliationProof(affiliationId)
        if ('error' in res) toast.error(res.error)
        else {
            toast.success('Affiliation approved — club is now active for 1 year')
            window.location.reload()
        }
    }

    const handleRejectAffiliation = async (affiliationId: string) => {
        if (!confirm('Reject this proof? The club will need to resubmit.')) return
        const res = await rejectAffiliationProof(affiliationId)
        if ('error' in res) toast.error(res.error)
        else {
            toast.success('Proof rejected')
            window.location.reload()
        }
    }

    const handleMarkAsPaid = async (clubId: string) => {
        if (!confirm('Mark this club as paid? Their affiliation will be activated for 1 year.')) return
        const res = await manuallyActivateAffiliation(clubId)
        if ('error' in res) toast.error(res.error)
        else {
            toast.success('Club affiliation activated for 1 year')
            window.location.reload()
        }
    }

    return (
        <div className="space-y-4">

            {/* Clubs Table */}
            <div className={`${embedded ? '' : 'bg-white rounded-xl shadow-sm border border-gray-200'} overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Club</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Master</th>
                                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Affiliation</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-gray-100" /><div className="h-4 w-32 bg-gray-100 rounded" /></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 w-24 bg-gray-100 rounded" /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center"><div className="mx-auto h-5 w-16 bg-gray-100 rounded-full" /></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="ml-auto h-5 w-5 bg-gray-100 rounded" /></td>
                                    </tr>
                                ))
                            ) : approvedClubs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                                        No affiliated clubs.
                                    </td>
                                </tr>
                            ) : (
                                approvedClubs.map((club) => {
                                    const affBadge = affiliationBadge(club.affiliationStatus || 'UNPAID')
                                    const AffIcon = affBadge.icon
                                    return (
                                        <tr
                                            key={club.id}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedClub(club)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    {club.logoUrl ? (
                                                        <img src={club.logoUrl} alt={club.name} className="w-10 h-10 rounded-lg object-contain bg-gray-50 border border-gray-100" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 font-bold border border-red-100">
                                                            {club.name.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="font-semibold text-gray-900 text-sm">{club.name}</span>
                                                        <p className="text-xs text-gray-400">{club.memberCount} members</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-700 font-medium">{club.masterName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${affBadge.bg}`}>
                                                    <AffIcon className="w-3 h-3" />
                                                    {affBadge.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Club Details Modal */}
            {selectedClub && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedClub(null)}>
                    <div
                        className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                                    {selectedClub.logoUrl ? (
                                        <Image src={selectedClub.logoUrl} alt={selectedClub.name} width={56} height={56} className="object-cover" unoptimized />
                                    ) : (
                                        <Building2 className="w-7 h-7 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-bold text-gray-900 truncate">{selectedClub.name}</h2>
                                    <p className="text-sm text-gray-500">{selectedClub.memberCount} members</p>
                                </div>
                                <button onClick={() => setSelectedClub(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Body — 2 columns */}
                        <div className="p-5 overflow-y-auto max-h-[calc(85vh-140px)]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Left Column */}
                                <div className="space-y-5">
                                    {/* Affiliation Status Card */}
                                    {(() => {
                                        const affBadge = affiliationBadge(selectedClub.affiliationStatus || 'UNPAID')
                                        const AffIcon = affBadge.icon
                                        const affStatus = selectedClub.affiliationStatus || 'UNPAID'
                                        return (
                                            <div className={`p-4 rounded-xl border ${affStatus === 'ACTIVE' ? 'bg-green-50 border-green-200' :
                                                affStatus === 'PENDING_REVIEW' ? 'bg-blue-50 border-blue-200' :
                                                    affStatus === 'EXPIRED' ? 'bg-amber-50 border-amber-200' :
                                                        'bg-red-50 border-red-200'
                                                }`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <AffIcon className={`w-5 h-5 ${affStatus === 'ACTIVE' ? 'text-green-600' :
                                                            affStatus === 'PENDING_REVIEW' ? 'text-blue-600' :
                                                                affStatus === 'EXPIRED' ? 'text-amber-600' : 'text-red-600'
                                                            }`} />
                                                        <span className="text-sm font-semibold text-gray-900">Affiliation</span>
                                                    </div>
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${affBadge.bg}`}>
                                                        {affBadge.label}
                                                    </span>
                                                </div>
                                                {selectedClub.affiliationExpiresAt && affStatus === 'ACTIVE' && (
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        Expires: {new Date(selectedClub.affiliationExpiresAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                                {selectedClub.affiliationPaidAt && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Last paid: {new Date(selectedClub.affiliationPaidAt).toLocaleDateString()}
                                                    </p>
                                                )}

                                                {affStatus === 'PENDING_REVIEW' && selectedClub.affiliationId && (
                                                    <div className="mt-3 flex items-center gap-2">
                                                        {selectedClub.affiliationProofImageUrl && (
                                                            <button
                                                                onClick={() => setViewingProof(selectedClub.affiliationProofImageUrl!)}
                                                                className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
                                                            >
                                                                <Eye className="w-3 h-3" /> View Proof
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleApproveAffiliation(selectedClub.affiliationId!)}
                                                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                                                        >
                                                            <CheckCircle className="w-3 h-3" /> Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectAffiliation(selectedClub.affiliationId!)}
                                                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                                                        >
                                                            <XCircle className="w-3 h-3" /> Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })()}

                                    {/* Mark as Paid button — for clubs without active affiliation */}
                                    {selectedClub.affiliationStatus !== 'ACTIVE' && selectedClub.affiliationStatus !== 'PENDING_REVIEW' && (
                                        <button
                                            onClick={() => handleMarkAsPaid(selectedClub.id)}
                                            className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" /> Mark as Paid
                                        </button>
                                    )}

                                    {/* Club Contact Details */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Club Details</h4>
                                        <div className="space-y-2.5">
                                            {selectedClub.address && (
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                    <span className="text-sm text-gray-700">{selectedClub.address}</span>
                                                </div>
                                            )}
                                            {selectedClub.contactPhone && (
                                                <div className="flex items-center gap-3">
                                                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                    <span className="text-sm text-gray-700">{selectedClub.contactPhone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Members Stat */}
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                                        <p className="text-2xl font-bold text-gray-900">{selectedClub.memberCount}</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">Members</p>
                                    </div>
                                </div>

                                {/* Right Column — Master Details */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Club Master</h4>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                                        {/* Avatar + Name */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                                                {selectedClub.masterImageUrl ? (
                                                    <Image src={selectedClub.masterImageUrl} alt={selectedClub.masterName} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                                                ) : (
                                                    <Users className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{selectedClub.masterName}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Club Master</p>
                                            </div>
                                        </div>

                                        {/* Master Info */}
                                        <div className="space-y-2.5 pt-1 border-t border-gray-200/60">
                                            {selectedClub.masterEmail && (
                                                <div className="flex items-center gap-2.5 pt-2.5">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs text-gray-600 truncate">{selectedClub.masterEmail}</span>
                                                </div>
                                            )}
                                            {selectedClub.masterBelt && (
                                                <div className="flex items-center gap-2.5">
                                                    <Award className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs text-gray-600 capitalize">{selectedClub.masterBelt} Belt</span>
                                                </div>
                                            )}
                                            {selectedClub.masterGender && (
                                                <div className="flex items-center gap-2.5">
                                                    <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs text-gray-600 capitalize">{selectedClub.masterGender}</span>
                                                </div>
                                            )}
                                            {selectedClub.masterCountry && (
                                                <div className="flex items-center gap-2.5">
                                                    <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                                    <span className="text-xs text-gray-600">{selectedClub.masterCountry}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100">
                            <button
                                onClick={() => setSelectedClub(null)}
                                className="w-full px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Proof of Payment Lightbox */}
            {viewingProof && (
                <div
                    className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
                    onClick={() => setViewingProof(null)}
                >
                    <div className="relative max-w-lg w-full max-h-[80vh] bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">Proof of Payment</h3>
                            <button onClick={() => setViewingProof(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="relative w-full h-[60vh]">
                            <Image src={viewingProof} alt="Proof of payment" fill className="object-contain" unoptimized />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
