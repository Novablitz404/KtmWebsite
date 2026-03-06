'use client'

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import { toast } from 'sonner'
import {
    Shield, ShieldCheck, ShieldAlert, ShieldX, Clock,
    Settings, Upload, Loader2, CheckCircle, XCircle,
    Eye, ChevronDown, Building2, Users, DollarSign,
    Banknote, QrCode, CreditCard
} from 'lucide-react'
import { getClubAffiliations, updateAffiliationSettings, approveAffiliationProof, rejectAffiliationProof } from '@/app/organization/actions'
import { uploadLogo } from '@/lib/supabase-storage'

interface OrganizationAffiliationManagerProps {
    organizationId: string
}

export default function OrganizationAffiliationManager({ organizationId }: OrganizationAffiliationManagerProps) {
    const queryClient = useQueryClient()
    const qrInputRef = useRef<HTMLInputElement>(null)

    const [isSaving, setIsSaving] = useState(false)
    const [fee, setFee] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('manual')
    const [bankName, setBankName] = useState('')
    const [bankAccountNo, setBankAccountNo] = useState('')
    const [bankAccountName, setBankAccountName] = useState('')
    const [instructions, setInstructions] = useState('')
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const [isUploadingQr, setIsUploadingQr] = useState(false)
    const [viewingProof, setViewingProof] = useState<string | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING_REVIEW' | 'UNPAID' | 'EXPIRED'>('ALL')

    const { data, isLoading } = useQuery({
        queryKey: ['club-affiliations'],
        queryFn: () => getClubAffiliations(),
        staleTime: 1000 * 30,
    })

    // Initialize form from fetched data
    if (data && 'success' in data && data.success && !isInitialized) {
        setFee(data.orgFee?.toString() || '')
        setPaymentMethod(data.paymentMethod || 'manual')
        setIsInitialized(true)
    }

    const clubs = (data && 'clubs' in data ? data.clubs : []) || []

    const filteredClubs = activeFilter === 'ALL'
        ? clubs
        : clubs.filter((c: any) => {
            const status = c.affiliation?.status || 'UNPAID'
            return status === activeFilter
        })

    const counts = {
        ALL: clubs.length,
        ACTIVE: clubs.filter((c: any) => c.affiliation?.status === 'ACTIVE').length,
        PENDING_REVIEW: clubs.filter((c: any) => c.affiliation?.status === 'PENDING_REVIEW').length,
        UNPAID: clubs.filter((c: any) => !c.affiliation || c.affiliation.status === 'UNPAID').length,
        EXPIRED: clubs.filter((c: any) => c.affiliation?.status === 'EXPIRED').length,
    }

    const handleSaveSettings = async () => {
        setIsSaving(true)
        try {
            const res = await updateAffiliationSettings({
                affiliationFee: fee ? parseFloat(fee) : 0,
                affiliationPaymentMethod: paymentMethod,
                affiliationBankName: bankName || null,
                affiliationBankAccountNo: bankAccountNo || null,
                affiliationBankAccountName: bankAccountName || null,
                affiliationInstructions: instructions || null,
                affiliationQrCodeUrl: qrCodeUrl,
            })
            if ('error' in res) toast.error(res.error)
            else toast.success('Affiliation settings saved')
        } catch {
            toast.error('Failed to save')
        } finally {
            setIsSaving(false)
        }
    }

    const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setIsUploadingQr(true)
        try {
            const url = await uploadLogo(`affiliation-qr-${organizationId}`, file)
            if (url) {
                setQrCodeUrl(url)
                toast.success('QR code uploaded')
            }
        } catch {
            toast.error('QR upload failed')
        } finally {
            setIsUploadingQr(false)
        }
    }

    const handleApprove = async (affiliationId: string) => {
        const res = await approveAffiliationProof(affiliationId)
        if ('error' in res) toast.error(res.error)
        else {
            toast.success('Affiliation approved — club is now active for 1 year')
            queryClient.invalidateQueries({ queryKey: ['club-affiliations'] })
        }
    }

    const handleReject = async (affiliationId: string) => {
        if (!confirm('Reject this proof of payment? The club will need to resubmit.')) return
        const res = await rejectAffiliationProof(affiliationId)
        if ('error' in res) toast.error(res.error)
        else {
            toast.success('Proof rejected — club can resubmit')
            queryClient.invalidateQueries({ queryKey: ['club-affiliations'] })
        }
    }

    const statusBadge = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'bg-green-100 text-green-700'
            case 'PENDING_REVIEW': return 'bg-blue-100 text-blue-700'
            case 'EXPIRED': return 'bg-amber-100 text-amber-700'
            default: return 'bg-red-100 text-red-700'
        }
    }

    const statusLabel = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Active'
            case 'PENDING_REVIEW': return 'Pending Review'
            case 'EXPIRED': return 'Expired'
            default: return 'Unpaid'
        }
    }

    return (
        <div className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Club Affiliation Fees</h3>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Fee & Payment Config */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Annual Fee */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Annual Fee (₱)</label>
                        <input
                            type="number"
                            value={fee}
                            onChange={e => setFee(e.target.value)}
                            placeholder="e.g. 5000"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Payment Method</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPaymentMethod('manual')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${paymentMethod === 'manual' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                <Banknote className="w-3.5 h-3.5" /> Manual
                            </button>
                            <button
                                onClick={() => setPaymentMethod('xendit')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${paymentMethod === 'xendit' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                <CreditCard className="w-3.5 h-3.5" /> Xendit
                            </button>
                        </div>
                    </div>
                </div>

                {/* Manual Payment Details */}
                {paymentMethod === 'manual' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Manual Payment Details</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
                                <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. BDO" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Account No.</label>
                                <input value={bankAccountNo} onChange={e => setBankAccountNo(e.target.value)} placeholder="1234567890" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Account Name</label>
                                <input value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} placeholder="Juan Dela Cruz" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>

                        {/* QR Code Upload */}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Payment QR Code</label>
                            <div className="flex items-center gap-3">
                                {qrCodeUrl ? (
                                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                                        <Image src={qrCodeUrl} alt="QR Code" fill className="object-contain" unoptimized />
                                    </div>
                                ) : null}
                                <button
                                    onClick={() => qrInputRef.current?.click()}
                                    disabled={isUploadingQr}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                                >
                                    {isUploadingQr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                                    {qrCodeUrl ? 'Change' : 'Upload QR'}
                                </button>
                                <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
                            </div>
                        </div>

                        {/* Instructions */}
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Payment Instructions</label>
                            <textarea
                                value={instructions}
                                onChange={e => setInstructions(e.target.value)}
                                rows={2}
                                placeholder="Optional notes for club masters..."
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                            />
                        </div>
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                    Save Settings
                </button>

                {/* Club Affiliations Table */}
                {fee && parseFloat(fee) > 0 && (
                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-900">Club Affiliations</h4>
                            <div className="flex gap-1.5 text-xs">
                                {(['ALL', 'PENDING_REVIEW', 'ACTIVE', 'UNPAID', 'EXPIRED'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setActiveFilter(f)}
                                        className={`px-2 py-1 rounded-md transition-colors ${activeFilter === f ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        {f === 'ALL' ? 'All' : f === 'PENDING_REVIEW' ? 'Pending' : f.charAt(0) + f.slice(1).toLowerCase()}
                                        {counts[f] > 0 && <span className="ml-1 text-[10px]">({counts[f]})</span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="py-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
                        ) : filteredClubs.length === 0 ? (
                            <div className="py-8 text-center text-gray-400 text-sm">No clubs found</div>
                        ) : (
                            <div className="space-y-2">
                                {filteredClubs.map((club: any) => {
                                    const status = club.affiliation?.status || 'UNPAID'
                                    const isPending = status === 'PENDING_REVIEW'
                                    return (
                                        <div key={club.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                                    <Building2 className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{club.name}</p>
                                                    <p className="text-xs text-gray-500">{club.masterName} · {club.memberCount} members</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {/* Expiry */}
                                                {club.affiliation?.expiresAt && status === 'ACTIVE' && (
                                                    <span className="text-xs text-gray-400 hidden sm:inline">
                                                        Exp {new Date(club.affiliation.expiresAt).toLocaleDateString()}
                                                    </span>
                                                )}

                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(status)}`}>
                                                    {statusLabel(status)}
                                                </span>

                                                {/* Review Proof */}
                                                {isPending && club.affiliation?.proofImageUrl && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setViewingProof(club.affiliation.proofImageUrl)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"
                                                            title="View proof"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(club.affiliation.id)}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(club.affiliation.id)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Proof Image Lightbox */}
            {viewingProof && (
                <div
                    className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
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
