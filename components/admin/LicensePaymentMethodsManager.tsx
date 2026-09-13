'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Edit2, Upload, Loader2, Plus, Trash2, QrCode } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getLicenseFeeSettings, updateLicensePaymentMethods } from '@/app/admin/actions'
import { uploadQrCode } from '@/lib/supabase-storage'

interface PaymentMethod {
    id: string
    label: string
    bankName: string
    accountNo: string
    accountName: string
    qrCodeUrl: string | null
}

/**
 * Structured payment-accounts editor for the Athlete License fee — mirrors
 * AthleteCardFeesManager's account editor, but scoped to KTM's own
 * Organization row (licensePaymentMethods) instead of a per-org one, since
 * KTM is the sole issuer of the license.
 */
export default function LicensePaymentMethodsManager() {
    const queryClient = useQueryClient()
    const qrInputRef = useRef<HTMLInputElement>(null)

    const { data: settings, isLoading } = useQuery({
        queryKey: ['license-fee-settings'],
        queryFn: () => getLicenseFeeSettings(),
    })

    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

    useEffect(() => {
        if (settings?.licensePaymentMethods) {
            setPaymentMethods(settings.licensePaymentMethods as PaymentMethod[])
        }
    }, [settings])

    const [methodModalOpen, setMethodModalOpen] = useState(false)
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
    const [activeQrUploadId, setActiveQrUploadId] = useState<string | null>(null)
    const [isUploadingQr, setIsUploadingQr] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [viewingQr, setViewingQr] = useState<string | null>(null)

    useEffect(() => {
        if (methodModalOpen || viewingQr) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => { document.body.style.overflow = 'unset' }
    }, [methodModalOpen, viewingQr])

    const saveMethodsToBackend = async (newMethods: PaymentMethod[]) => {
        const result = await updateLicensePaymentMethods(newMethods)
        if (result?.error) throw new Error(result.error)
        return result
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
        setSubmitting(true)

        const exists = paymentMethods.some(pm => pm.id === editingMethod.id)
        const updatedMethods = exists
            ? paymentMethods.map(pm => pm.id === editingMethod.id ? editingMethod : pm)
            : [...paymentMethods, editingMethod]

        try {
            await saveMethodsToBackend(updatedMethods)
            setPaymentMethods(updatedMethods)
            queryClient.invalidateQueries({ queryKey: ['license-fee-settings'] })
            toast.success('Payment account saved')
            setMethodModalOpen(false)
        } catch {
            toast.error('Failed to save account')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteMethod = async (id: string) => {
        if (!confirm('Remove this payment account permanently?')) return
        setSubmitting(true)
        const updatedMethods = paymentMethods.filter(pm => pm.id !== id)
        try {
            await saveMethodsToBackend(updatedMethods)
            setPaymentMethods(updatedMethods)
            queryClient.invalidateQueries({ queryKey: ['license-fee-settings'] })
            toast.success('Payment account removed')
        } catch {
            toast.error('Failed to remove account')
        } finally {
            setSubmitting(false)
        }
    }

    const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeQrUploadId || !editingMethod) return
        setIsUploadingQr(true)
        try {
            const url = await uploadQrCode(`license-qr-${activeQrUploadId}`, file)
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

    if (isLoading) {
        return (
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6" />
                <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
            </div>
        )
    }

    return (
        <>
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">License Payment Accounts</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Structured accounts (with optional QR codes) shown to athletes activating their license.
                        </p>
                    </div>
                    <button
                        onClick={openAddMethod}
                        disabled={submitting}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-all text-xs font-semibold disabled:opacity-50"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Account
                    </button>
                </div>

                <div className="p-6 sm:p-8">
                    {paymentMethods.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {paymentMethods.map((pm, i) => (
                                <div key={pm.id || i} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex flex-col justify-between relative group">
                                    <div className="absolute top-2 right-2 flex items-center gap-1">
                                        <button
                                            onClick={() => openEditMethod(pm)}
                                            disabled={submitting}
                                            className="p-1.5 bg-white text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 shadow-sm rounded-md transition-colors disabled:opacity-50"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMethod(pm.id)}
                                            disabled={submitting}
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
                                                onClick={() => setViewingQr(pm.qrCodeUrl)}
                                                className="text-[10px] cursor-pointer font-bold bg-red-50 text-red-600 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-red-100 transition-colors"
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
            </div>

            {/* Add/Edit Payment Method Modal */}
            {methodModalOpen && editingMethod && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !submitting && setMethodModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {paymentMethods.some(pm => pm.id === editingMethod.id) ? 'Edit Account' : 'Add Account'}
                                </h3>
                                <p className="text-gray-500 text-sm mt-1">Provide the payment gateway details</p>
                            </div>
                            <button
                                onClick={() => !submitting && setMethodModalOpen(false)}
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
                                        placeholder="e.g. KTM GCash"
                                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Bank / E-Wallet</label>
                                    <input
                                        value={editingMethod.bankName}
                                        onChange={e => setEditingMethod({ ...editingMethod, bankName: e.target.value })}
                                        placeholder="e.g. GCash, BDO"
                                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Account Number</label>
                                    <input
                                        value={editingMethod.accountNo}
                                        onChange={e => setEditingMethod({ ...editingMethod, accountNo: e.target.value })}
                                        placeholder="e.g. 0912 345 6789"
                                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Account Name</label>
                                    <input
                                        value={editingMethod.accountName}
                                        onChange={e => setEditingMethod({ ...editingMethod, accountName: e.target.value })}
                                        placeholder="e.g. KTM Sports Inc."
                                        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
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
                                        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-red-600 transition-colors w-full sm:w-auto"
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
                                    disabled={submitting}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-6 py-2 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
