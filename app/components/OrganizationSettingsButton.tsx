'use client'

import { useState, useEffect } from 'react'
import { Upload, X } from 'lucide-react'
import { updateOrganizationSettings } from '@/app/organization/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface OrganizationSettingsButtonProps {
    organizationId: string
    orgName: string
    orgLogo?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    website?: string | null
    chairman?: string | null
    viceChairman?: string | null
    defaultBeltFees?: any
    variant?: 'button' | 'icon'
    buttonText?: string
}

export default function OrganizationSettingsButton({
    organizationId,
    orgName,
    orgLogo,
    address,
    phone,
    email,
    website,
    chairman,
    viceChairman,
    defaultBeltFees,
    variant = 'button',
    buttonText = 'Organization Settings'
}: OrganizationSettingsButtonProps) {
    const router = useRouter()
    const [showSettings, setShowSettings] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [logoPreview, setLogoPreview] = useState<string | null>(orgLogo || null)

    useEffect(() => {
        setLogoPreview(orgLogo || null)
    }, [orgLogo])

    return (
        <>
            {variant === 'button' ? (
                <button
                    onClick={() => setShowSettings(true)}
                    className="group flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-all text-sm font-medium border border-gray-200"
                >
                    <span>{buttonText}</span>
                </button>
            ) : (
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    title="Organization Settings"
                >
                    <span className="text-xl">⚙️</span>
                </button>
            )}

            {/* ⚙️ Organization Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Organization Settings</h3>
                                <p className="text-gray-500 text-sm mt-1">Update your organization profile</p>
                            </div>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault()
                                setSubmitting(true)
                                const formData = new FormData(e.currentTarget)

                                try {
                                    const result = await updateOrganizationSettings(formData)
                                    if (result?.error) {
                                        toast.error(result.error)
                                    } else {
                                        toast.success('Organization settings updated')
                                        setShowSettings(false)
                                        router.refresh()
                                    }
                                } catch {
                                    toast.error('Failed to update settings')
                                } finally {
                                    setSubmitting(false)
                                }
                            }}
                            className="space-y-6"
                        >
                            <input type="hidden" name="organizationId" value={organizationId} />

                            <div className="flex flex-col sm:flex-row gap-6">
                                {/* Logo Upload */}
                                <div className="w-full sm:w-1/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Organization Logo</label>
                                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group relative overflow-hidden h-40">
                                        {logoPreview ? (
                                            <>
                                                <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <p className="text-white text-sm font-medium">Click to change</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center">
                                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2 group-hover:text-indigo-500 transition-colors" />
                                                <p className="text-sm text-gray-500">Click to upload logo</p>
                                                <p className="text-[10px] text-gray-400 mt-1">PNG, JPG (Max 5MB)</p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            name="logo"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (file) {
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        toast.error('File size must be less than 5MB')
                                                        e.target.value = ''
                                                        return
                                                    }
                                                    const url = URL.createObjectURL(file)
                                                    setLogoPreview(url)
                                                }
                                            }}
                                        />
                                    </div>
                                    {logoPreview && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLogoPreview(null)
                                            }}
                                            className="text-xs text-red-500 mt-2 hover:underline w-full text-center"
                                        >
                                            Remove Preview
                                        </button>
                                    )}
                                </div>

                                {/* Main Info Fields */}
                                <div className="w-full sm:w-2/3 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="name"
                                            defaultValue={orgName}
                                            required
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                            placeholder="Enter organization name"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                            <input
                                                type="email"
                                                name="email"
                                                defaultValue={email || ''}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                                placeholder="Contact email"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                defaultValue={phone || ''}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                                placeholder="Contact phone"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        defaultValue={address || ''}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                        placeholder="Full address"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Website</label>
                                    <input
                                        type="url"
                                        name="website"
                                        defaultValue={website || ''}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                        placeholder="https://example.com"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Chairman</label>
                                        <input
                                            type="text"
                                            name="chairman"
                                            defaultValue={chairman || ''}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                            placeholder="Chairman name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Vice Chairman</label>
                                        <input
                                            type="text"
                                            name="viceChairman"
                                            defaultValue={viceChairman || ''}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                            placeholder="Vice Chairman name"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Promotion Test Default Fees */}
                            <div className="pt-2 border-t border-gray-100">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Promotion Test Default Fees</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1.5">White to Purple (₱)</label>
                                        <input
                                            type="number"
                                            name="whiteToPurpleFee"
                                            defaultValue={defaultBeltFees?.whiteToPurple || ''}
                                            placeholder="e.g. 600"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1.5">Blue to Maroon (₱)</label>
                                        <input
                                            type="number"
                                            name="blueToMaroonFee"
                                            defaultValue={defaultBeltFees?.blueToMaroon || ''}
                                            placeholder="e.g. 700"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1.5">Brown (₱)</label>
                                        <input
                                            type="number"
                                            name="brownFee"
                                            defaultValue={defaultBeltFees?.brown || ''}
                                            placeholder="e.g. 800"
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Applied automatically to new promotion tests</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowSettings(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 border border-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
