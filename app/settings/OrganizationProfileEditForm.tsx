'use client'

import { useState } from 'react'
import { updateOrganizationProfile } from './actions'
import LoadingButton from '@/components/ui/LoadingButton'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface OrganizationProfileEditFormProps {
    organization: {
        id: string
        name: string
        chairman: string | null
        viceChairman: string | null
        address: string | null
        contactEmail: string | null
        contactPhone: string | null
        website: string | null
        logoUrl: string | null
    }
    isOwner?: boolean
}

export default function OrganizationProfileEditForm({ organization, isOwner = false }: OrganizationProfileEditFormProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    const [previewImage, setPreviewImage] = useState<string | null>(organization.logoUrl || null)
    const fileInputRef = useState<HTMLInputElement | null>(null) // We use ref for file input

    // Handle image selection
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const objectUrl = URL.createObjectURL(file)
            setPreviewImage(objectUrl)
        }
    }

    const handleSubmit = async (formData: FormData) => {
        setSaving(true)
        try {
            await updateOrganizationProfile(organization.id, formData)
            toast.success('Organization profile updated successfully!')
            setIsEditing(false)
            router.refresh()

            // Clean up preview if needed? 
            // Better to rely on refresh
        } catch (error) {
            console.error(error)
            toast.error('Failed to update organization profile.')
        } finally {
            setSaving(false)
        }
    }

    if (!isEditing) {
        return (
            <button
                onClick={() => setIsEditing(true)}
                className="group flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all text-sm font-medium shadow-sm shadow-indigo-200"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit Organization</span>
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 scale-100">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold text-gray-900">Edit Organization</h2>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6">
                    <form action={handleSubmit} className="space-y-6">

                        {/* Organization Logo Upload - Owners Only */}
                        {isOwner && (
                            <div className="flex flex-col items-center pb-4 border-b border-gray-100">
                                <div className="relative group cursor-pointer" onClick={() => document.getElementById('org-logo-upload')?.click()}>
                                    <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm relative bg-gray-50 flex items-center justify-center">
                                        {previewImage ? (
                                            <img src={previewImage} alt="Organization Logo" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <span className="text-4xl">🏢</span>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-xs font-semibold">Change Logo</span>
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1.5 shadow-md border border-gray-100 text-indigo-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </div>
                                </div>
                                <input
                                    id="org-logo-upload"
                                    type="file"
                                    name="logo"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange}
                                />
                                <p className="text-xs text-gray-500 mt-3 font-medium">Click to upload logo</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Organization Name</label>
                            <input
                                type="text"
                                name="name"
                                defaultValue={organization.name}
                                required
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Chairman</label>
                                <input
                                    type="text"
                                    name="chairman"
                                    defaultValue={organization.chairman || ''}
                                    placeholder="Full Name"
                                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vice Chairman</label>
                                <input
                                    type="text"
                                    name="viceChairman"
                                    defaultValue={organization.viceChairman || ''}
                                    placeholder="Full Name"
                                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Headquarters Address</label>
                            <input
                                type="text"
                                name="address"
                                defaultValue={organization.address || ''}
                                placeholder="Street, City, Country"
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Email</label>
                                <input
                                    type="email"
                                    name="contactEmail"
                                    defaultValue={organization.contactEmail || ''}
                                    placeholder="info@org.com"
                                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Contact Phone</label>
                                <input
                                    type="tel"
                                    name="contactPhone"
                                    defaultValue={organization.contactPhone || ''}
                                    placeholder="+1 234 567 890"
                                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Website</label>
                            <input
                                type="url"
                                name="website"
                                defaultValue={organization.website || ''}
                                placeholder="https://example.com"
                                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white"
                            />
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex gap-3">
                            <LoadingButton
                                type="submit"
                                isLoading={saving}
                                loadingText="Saving..."
                                variant="primary"
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                            >
                                Save Changes
                            </LoadingButton>
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
