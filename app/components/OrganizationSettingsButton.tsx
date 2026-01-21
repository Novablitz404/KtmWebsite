'use client'

import { useState, useEffect } from 'react'
import { Upload, X } from 'lucide-react'
import { updateOrganizationSettings } from '@/app/organization/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface OrganizationSettingsButtonProps {
    organizationId: string
    orgLogo?: string | null
    address?: string | null
    phone?: string | null
    variant?: 'button' | 'icon'
    buttonText?: string
}

export default function OrganizationSettingsButton({
    organizationId,
    orgLogo,
    address,
    phone,
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
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
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
                            className="space-y-4"
                        >
                            <input type="hidden" name="organizationId" value={organizationId} />

                            <div>
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
                                        className="text-xs text-red-500 mt-2 hover:underline"
                                    >
                                        Remove Preview
                                    </button>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    defaultValue={address || ''}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-gray-50/50 focus:bg-white"
                                    placeholder="Enter organization address"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    defaultValue={phone || ''}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all bg-gray-50/50 focus:bg-white"
                                    placeholder="Enter phone number"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
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
