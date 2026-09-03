'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    Settings, Upload, Loader2, XCircle,
    Eye,
    Banknote, QrCode, Plus, Trash2, Edit2, X
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

    // Fee modal state
    const [feeModalOpen, setFeeModalOpen] = useState(false)
    // Payment method modal state
    const [methodModalOpen, setMethodModalOpen] = useState(false)
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)

    const [activeQrUploadId, setActiveQrUploadId] = useState<string | null>(null)
    const [isUploadingQr, setIsUploadingQr] = useState(false)
    const [viewingQr, setViewingQr] = useState<string | null>(null)

    // Scroll lock for all modals
    useEffect(() => {
        if (feeModalOpen || methodModalOpen || viewingQr) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [feeModalOpen, methodModalOpen, viewingQr])

    const { data } = useQuery({
        queryKey: ['club-affiliations'],
        queryFn: () => getClubAffiliations(),
        staleTime: 1000 * 30,
    })

    // Initialize state from fetch
    useEffect(() => {
        if (data && 'success' in data && data.success) {
            setFee(data.orgFee?.toString() || '')
            setPaymentType(data.paymentMethod || 'manual')
            setInstructions((data as any).instructions || '')
            const savedMethods = (data as any).paymentMethods || []
            if (savedMethods.length > 0) {
                setPaymentMethods(savedMethods)
            }
        }
    }, [data])


    const saveSettingsToBackend = async (newMethods: PaymentMethod[], newFee: string, newType: string, newInstructions: string) => {
        const res = await updateAffiliationSettings({
            affiliationFee: newFee ? parseFloat(newFee) : 0,
            affiliationPaymentMethod: newType,
            affiliationInstructions: newInstructions || null,
            affiliationPaymentMethods: newMethods.length > 0 ? newMethods : null,
        })
        if ('error' in res) throw new Error(res.error)
        return res
    }

    const handleSavePrimarySettings = async () => {
        setIsSaving(true)
        try {
            await saveSettingsToBackend(paymentMethods, fee, paymentType, instructions)
            toast.success('Affiliation settings saved')
            queryClient.invalidateQueries({ queryKey: ['club-affiliations'] })
            setFeeModalOpen(false)
        } catch {
            toast.error('Failed to save settings')
        } finally {
            setIsSaving(false)
        }
    }

    const openAddMethod = () => {
        setEditingMethod({
            id: crypto.randomUUID(),
            label: '',
            bankName: '',
            accountNo: '',
            accountName: '',
            qrCodeUrl: null
        })
        setMethodModalOpen(true)
    }

    const openEditMethod = (pm: PaymentMethod) => {
        setEditingMethod({ ...pm })
        setMethodModalOpen(true)
    }

    const handleMethodSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingMethod) return
        setIsSaving(true)

        const exists = paymentMethods.some(pm => pm.id === editingMethod.id)
        const updatedMethods = exists
            ? paymentMethods.map(pm => pm.id === editingMethod.id ? editingMethod : pm)
            : [...paymentMethods, editingMethod]

        try {
            await saveSettingsToBackend(updatedMethods, fee, paymentType, instructions)
            setPaymentMethods(updatedMethods)
            toast.success('Payment account saved')
            queryClient.invalidateQueries({ queryKey: ['club-affiliations'] })
            setMethodModalOpen(false)
        } catch {
            toast.error('Failed to save account')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDeleteMethod = async (id: string) => {
        if (!confirm('Remove this payment account permanently?')) return
        setIsSaving(true)
        const updatedMethods = paymentMethods.filter(pm => pm.id !== id)
        try {
            await saveSettingsToBackend(updatedMethods, fee, paymentType, instructions)
            setPaymentMethods(updatedMethods)
            toast.success('Payment account removed')
            queryClient.invalidateQueries({ queryKey: ['club-affiliations'] })
        } catch {
            toast.error('Failed to remove account')
        } finally {
            setIsSaving(false)
        }
    }


    const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeQrUploadId || !editingMethod) return
        setIsUploadingQr(true)
        try {
            const url = await uploadQrCode(`affiliation-qr-${activeQrUploadId}`, file)
            if (url) {
                setEditingMethod({ ...editingMethod, qrCodeUrl: url })
                toast.success('QR code uploaded')
            }
        } catch {
            toast.error('QR upload failed')
        } finally {
            setIsUploadingQr(false)
            setActiveQrUploadId(null)
        }
    }

    // Check if data has saved values to determine initial display state (from DB)
    const savedFee = data && 'orgFee' in data ? data.orgFee : null
    const savedPaymentType = data && 'paymentMethod' in data ? data.paymentMethod : null
    const savedPaymentMethods: PaymentMethod[] = data && 'paymentMethods' in data ? (data as any).paymentMethods || [] : []

    return (
        <>
            <div className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900">Club Affiliation Settings</h3>
                    <button
                        onClick={() => setFeeModalOpen(true)}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-all text-xs font-medium border border-gray-200"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                        <span className="text-sm text-gray-500">Annual Fee</span>
                        <span className="text-sm font-semibold text-gray-900">
                            {savedFee && savedFee > 0 ? `₱${savedFee.toLocaleString()}` : <span className="text-gray-300 font-medium tracking-wide text-xs">NOT SET</span>}
                        </span>
                    </div>

                    {((data as any)?.paymentMethod === 'manual' || savedPaymentType === 'manual') && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-gray-500">Linked Payment Accounts</span>
                                <button
                                    onClick={openAddMethod}
                                    disabled={isSaving}
                                    className="text-indigo-600 hover:bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add Account
                                </button>
                            </div>

                            {savedPaymentMethods.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {savedPaymentMethods.map((pm: PaymentMethod, i: number) => (
                                        <div key={pm.id || i} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex flex-col justify-between relative group">

                                            {/* Action Buttons Overlay */}
                                            <div className="absolute top-2 right-2 flex items-center gap-1">
                                                <button
                                                    onClick={() => openEditMethod(pm)}
                                                    disabled={isSaving}
                                                    className="p-1.5 bg-white text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 shadow-sm rounded-md transition-colors disabled:opacity-50"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMethod(pm.id)}
                                                    disabled={isSaving}
                                                    className="p-1.5 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 shadow-sm rounded-md transition-colors disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <div className="pr-16">
                                                <p className="text-sm font-semibold text-gray-900 line-clamp-1">{pm.label || pm.bankName}</p>
                                                <p className="text-xs text-gray-500 font-mono mt-0.5">{pm.accountNo}</p>
                                            </div>
                                            <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-between">
                                                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{pm.bankName}</span>
                                                {pm.qrCodeUrl && (
                                                    <span
                                                        onClick={() => setViewingQr(pm.qrCodeUrl!)}
                                                        className="text-[10px] cursor-pointer font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                                                    >
                                                        <QrCode className="w-3 h-3" /> QR
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-gray-50 rounded-lg p-4 text-center border border-dashed border-gray-200">
                                    <p className="text-sm text-gray-500 font-medium tracking-wide">NO PAYMENT ACCOUNTS ADDED</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Fee Edit Modal */}
            {feeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isSaving && setFeeModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Club Affiliation Terms</h3>
                                <p className="text-gray-500 text-sm mt-1">Configure the annual affiliation details</p>
                            </div>
                            <button
                                onClick={() => !isSaving && setFeeModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
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
                                    <div className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border bg-indigo-50 border-indigo-200 text-indigo-700 flex items-center justify-center gap-1.5">
                                        <Banknote className="w-3.5 h-3.5" /> Manual
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="pt-2">
                                <label className="text-xs text-gray-500 mb-1 block">Payment Instructions (shown to all clubs)</label>
                                <textarea
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                    rows={3}
                                    placeholder="Optional notes for club masters..."
                                    className="w-full px-3 py-3 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-gray-50/50"
                                />
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end">
                                <button
                                    onClick={handleSavePrimarySettings}
                                    disabled={isSaving}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                                    Save
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}


            {/* Add/Edit Payment Method Modal */}
            {methodModalOpen && editingMethod && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isSaving && setMethodModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {paymentMethods.some(pm => pm.id === editingMethod.id) ? 'Edit Account' : 'Add Account'}
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">Provide the payment gateway details</p>
                            </div>
                            <button
                                onClick={() => !isSaving && setMethodModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleMethodSave} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Account Label</label>
                                    <input
                                        value={editingMethod.label}
                                        onChange={e => setEditingMethod({ ...editingMethod, label: e.target.value })}
                                        placeholder="e.g. Master's GCash"
                                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Bank / E-Wallet</label>
                                    <input
                                        value={editingMethod.bankName}
                                        onChange={e => setEditingMethod({ ...editingMethod, bankName: e.target.value })}
                                        placeholder="e.g. GCash, BDO"
                                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                                    <input
                                        value={editingMethod.accountNo}
                                        onChange={e => setEditingMethod({ ...editingMethod, accountNo: e.target.value })}
                                        placeholder="e.g. 0912 345 6789"
                                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Account Name</label>
                                    <input
                                        value={editingMethod.accountName}
                                        onChange={e => setEditingMethod({ ...editingMethod, accountName: e.target.value })}
                                        placeholder="e.g. John Doe"
                                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                                <label className="block text-xs text-gray-500 mb-2">QR Code Image (Optional)</label>
                                {editingMethod.qrCodeUrl ? (
                                    <div className="flex items-start gap-4">
                                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-white">
                                            <img src={editingMethod.qrCodeUrl} alt="QR Code" className="w-full h-full object-contain" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setEditingMethod({ ...editingMethod, qrCodeUrl: null })}
                                            className="text-xs text-red-500 hover:text-red-700 bg-red-50 px-2 py-1.5 rounded-md font-medium transition-colors"
                                        >
                                            Remove QR
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveQrUploadId(editingMethod.id)
                                            qrInputRef.current?.click()
                                        }}
                                        disabled={isUploadingQr}
                                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors w-full sm:w-auto"
                                    >
                                        {isUploadingQr ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        Upload QR Template
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setMethodModalOpen(false)}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Hidden file input for QR uploads */}
            <input
                ref={qrInputRef}
                type="file"
                accept="image/*"
                onChange={handleQrUpload}
                className="hidden"
            />

            {/* QR Code Lightbox */}
            {viewingQr && (
                <div
                    className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4"
                    onClick={() => setViewingQr(null)}
                >
                    <div className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">Payment QR Code</h3>
                            <button onClick={() => setViewingQr(null)} className="text-gray-400 hover:text-gray-600 border border-gray-200 rounded p-0.5">✕</button>
                        </div>
                        <div className="relative w-full aspect-square p-4 flex items-center justify-center">
                            <img src={viewingQr} alt="Payment QR Code" className="w-full h-full object-contain" />
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
