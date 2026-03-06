'use client'

import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import { toast } from 'sonner'
import {
    Shield, Settings, Upload, Loader2, XCircle,
    Eye, ChevronDown, ChevronUp,
    Banknote, QrCode, CreditCard, Plus, Trash2
} from 'lucide-react'
import { getClubAffiliations, updateAffiliationSettings } from '@/app/organization/actions'
import { uploadQrCode } from '@/lib/supabase-storage'

interface PaymentMethod {
    id: string
    label: string
    bankName: string
    accountNo: string
    accountName: string
    qrCodeUrl: string | null
}

interface OrganizationAffiliationManagerProps {
    organizationId: string
}

export default function OrganizationAffiliationManager({ organizationId }: OrganizationAffiliationManagerProps) {
    const queryClient = useQueryClient()
    const qrInputRef = useRef<HTMLInputElement>(null)

    const [isSaving, setIsSaving] = useState(false)
    const [fee, setFee] = useState('')
    const [paymentType, setPaymentType] = useState('manual')
    const [instructions, setInstructions] = useState('')
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [activeQrUploadId, setActiveQrUploadId] = useState<string | null>(null)
    const [isUploadingQr, setIsUploadingQr] = useState(false)
    const [viewingQr, setViewingQr] = useState<string | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [showManualDetails, setShowManualDetails] = useState(false)

    const { data } = useQuery({
        queryKey: ['club-affiliations'],
        queryFn: () => getClubAffiliations(),
        staleTime: 1000 * 30,
    })

    // Initialize form from fetched data
    if (data && 'success' in data && data.success && !isInitialized) {
        setFee(data.orgFee?.toString() || '')
        setPaymentType(data.paymentMethod || 'manual')
        setInstructions((data as any).instructions || '')
        const savedMethods = (data as any).paymentMethods || []
        if (savedMethods.length > 0) {
            setPaymentMethods(savedMethods)
        }
        setIsInitialized(true)
    }

    const addPaymentMethod = () => {
        setPaymentMethods(prev => [...prev, {
            id: crypto.randomUUID(),
            label: '',
            bankName: '',
            accountNo: '',
            accountName: '',
            qrCodeUrl: null,
        }])
    }

    const removePaymentMethod = (id: string) => {
        setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
    }

    const updatePaymentMethod = (id: string, field: keyof PaymentMethod, value: string | null) => {
        setPaymentMethods(prev => prev.map(pm => pm.id === id ? { ...pm, [field]: value } : pm))
    }

    const handleSaveSettings = async () => {
        setIsSaving(true)
        try {
            const res = await updateAffiliationSettings({
                affiliationFee: fee ? parseFloat(fee) : 0,
                affiliationPaymentMethod: paymentType,
                affiliationInstructions: instructions || null,
                affiliationPaymentMethods: paymentMethods.length > 0 ? paymentMethods : null,
            })
            if ('error' in res) toast.error(res.error)
            else {
                toast.success('Affiliation settings saved')
                queryClient.invalidateQueries({ queryKey: ['club-affiliations'] })
            }
        } catch {
            toast.error('Failed to save')
        } finally {
            setIsSaving(false)
        }
    }

    const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeQrUploadId) return
        setIsUploadingQr(true)
        try {
            const url = await uploadQrCode(`affiliation-qr-${activeQrUploadId}`, file)
            if (url) {
                updatePaymentMethod(activeQrUploadId, 'qrCodeUrl', url)
                toast.success('QR code uploaded')
            }
        } catch {
            toast.error('QR upload failed')
        } finally {
            setIsUploadingQr(false)
            setActiveQrUploadId(null)
        }
    }

    // Check if data has saved values
    const savedFee = data && 'orgFee' in data ? data.orgFee : null
    const savedPaymentType = data && 'paymentMethod' in data ? data.paymentMethod : null
    const savedPaymentMethods: PaymentMethod[] = data && 'paymentMethods' in data ? (data as any).paymentMethods || [] : []

    return (
        <div className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Club Affiliation Fees</h3>
                </div>
            </div>

            <div className="p-6 space-y-6">

                {/* Current Settings Summary */}
                {savedFee && savedFee > 0 && (
                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3">
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Current Settings</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-indigo-100/50">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Annual Fee</p>
                                <p className="text-lg font-bold text-gray-900">₱{savedFee.toLocaleString()}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-indigo-100/50">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Payment</p>
                                <p className="text-sm font-semibold text-gray-900 capitalize flex items-center gap-1.5">
                                    {savedPaymentType === 'xendit' ? <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> : <Banknote className="w-3.5 h-3.5 text-green-500" />}
                                    {savedPaymentType || 'Manual'}
                                </p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-indigo-100/50">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Payment Methods</p>
                                <p className="text-sm font-semibold text-gray-900">{savedPaymentMethods.length} configured</p>
                            </div>
                        </div>
                        {savedPaymentMethods.length > 0 && (
                            <div className="space-y-1.5">
                                {savedPaymentMethods.map((pm: PaymentMethod) => (
                                    <div key={pm.id} className="flex items-center gap-2 text-xs text-gray-600 bg-white px-3 py-2 rounded-lg border border-indigo-100/50">
                                        {pm.qrCodeUrl ? <QrCode className="w-3 h-3 text-indigo-500 flex-shrink-0" /> : <Banknote className="w-3 h-3 text-gray-400 flex-shrink-0" />}
                                        <span className="font-medium">{pm.label || pm.bankName || 'Unnamed'}</span>
                                        {pm.bankName && <span className="text-gray-400">• {pm.bankName}</span>}
                                        {pm.accountNo && <span className="text-gray-400 font-mono">• {pm.accountNo}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Fee & Payment Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Payment Type</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPaymentType('manual')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${paymentType === 'manual' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                <Banknote className="w-3.5 h-3.5" /> Manual
                            </button>
                            <button
                                onClick={() => setPaymentType('xendit')}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-1.5 ${paymentType === 'xendit' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                                <CreditCard className="w-3.5 h-3.5" /> Xendit
                            </button>
                        </div>
                    </div>
                </div>

                {/* Manual Payment Methods — Collapsible */}
                {paymentType === 'manual' && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setShowManualDetails(!showManualDetails)}
                            className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Banknote className="w-4 h-4 text-gray-500" />
                                <span className="text-sm font-semibold text-gray-700">Manual Payment Methods</span>
                                <span className="text-xs text-gray-400">({paymentMethods.length} configured)</span>
                            </div>
                            {showManualDetails ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        {showManualDetails && (
                            <div className="p-4 space-y-4">
                                {paymentMethods.map((pm, idx) => (
                                    <div key={pm.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                                                <CreditCard className="w-3 h-3" /> Payment Method {idx + 1}
                                            </p>
                                            <button
                                                onClick={() => removePaymentMethod(pm.id)}
                                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div>
                                            <label className="text-xs text-gray-500 mb-1 block">Label (e.g. &quot;GCash&quot;, &quot;BDO Savings&quot;)</label>
                                            <input
                                                value={pm.label}
                                                onChange={e => updatePaymentMethod(pm.id, 'label', e.target.value)}
                                                placeholder="e.g. GCash, BDO, Maya"
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Bank/Wallet Name</label>
                                                <input
                                                    value={pm.bankName}
                                                    onChange={e => updatePaymentMethod(pm.id, 'bankName', e.target.value)}
                                                    placeholder="e.g. BDO, GCash"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Account No.</label>
                                                <input
                                                    value={pm.accountNo}
                                                    onChange={e => updatePaymentMethod(pm.id, 'accountNo', e.target.value)}
                                                    placeholder="1234567890"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1 block">Account Name</label>
                                                <input
                                                    value={pm.accountName}
                                                    onChange={e => updatePaymentMethod(pm.id, 'accountName', e.target.value)}
                                                    placeholder="Juan Dela Cruz"
                                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>

                                        {/* QR Code */}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-2 block">QR Code (optional)</label>
                                            <div className="flex items-start gap-3">
                                                {pm.qrCodeUrl ? (
                                                    <div
                                                        className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-indigo-300 transition-colors group flex-shrink-0"
                                                        onClick={() => setViewingQr(pm.qrCodeUrl)}
                                                    >
                                                        <Image src={pm.qrCodeUrl} alt="QR Code" fill className="object-contain p-1" unoptimized />
                                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                            <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 flex-shrink-0">
                                                        <QrCode className="w-6 h-6 mb-1" />
                                                        <span className="text-[9px]">No QR</span>
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-1.5">
                                                    <button
                                                        onClick={() => { setActiveQrUploadId(pm.id); qrInputRef.current?.click() }}
                                                        disabled={isUploadingQr}
                                                        className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
                                                    >
                                                        {isUploadingQr && activeQrUploadId === pm.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                                        {pm.qrCodeUrl ? 'Change' : 'Upload'}
                                                    </button>
                                                    {pm.qrCodeUrl && (
                                                        <button
                                                            onClick={() => updatePaymentMethod(pm.id, 'qrCodeUrl', null)}
                                                            className="px-2.5 py-1.5 border border-red-200 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
                                                        >
                                                            <XCircle className="w-3 h-3" /> Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    onClick={addPaymentMethod}
                                    className="w-full px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Payment Method
                                </button>

                                {/* Instructions */}
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Payment Instructions (shown to all clubs)</label>
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

                {/* Hidden file input for QR uploads */}
                <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
            </div>

            {/* QR Code Lightbox */}
            {viewingQr && (
                <div
                    className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
                    onClick={() => setViewingQr(null)}
                >
                    <div className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">Payment QR Code</h3>
                            <button onClick={() => setViewingQr(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="relative w-full aspect-square p-4">
                            <Image src={viewingQr} alt="Payment QR Code" fill className="object-contain p-4" unoptimized />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
