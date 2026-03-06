'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { updateTournamentDetails } from '@/app/actions'
import { uploadBanner } from '@/lib/supabase-storage'
import {
    ImageIcon, Save, Loader2, Calendar, MapPin, DollarSign,
    Check, X, Upload, Trash2
} from 'lucide-react'
import { toast } from 'sonner'

interface TournamentSettingsProps {
    tournament: {
        id: string
        name: string
        venue: string | null
        startDate: Date | string
        registrationStart: Date | string | null
        registrationEnd: Date | string | null
        earlyBirdDeadline: Date | string | null
        earlyBirdPrice: number | null
        regularPrice: number | null
        headerImageUrl: string | null
    }
}

function formatDateForInput(date: Date | string | null): string {
    if (!date) return ''
    const d = new Date(date)
    return d.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:mm
}

export default function TournamentSettings({ tournament }: TournamentSettingsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [name, setName] = useState(tournament.name)
    const [venue, setVenue] = useState(tournament.venue || '')
    const [startDate, setStartDate] = useState(formatDateForInput(tournament.startDate))
    const [registrationStart, setRegistrationStart] = useState(formatDateForInput(tournament.registrationStart))
    const [registrationEnd, setRegistrationEnd] = useState(formatDateForInput(tournament.registrationEnd))
    const [earlyBirdDeadline, setEarlyBirdDeadline] = useState(formatDateForInput(tournament.earlyBirdDeadline))
    const [earlyBirdPrice, setEarlyBirdPrice] = useState(tournament.earlyBirdPrice?.toString() || '')
    const [regularPrice, setRegularPrice] = useState(tournament.regularPrice?.toString() || '')
    const [headerImageUrl, setHeaderImageUrl] = useState(tournament.headerImageUrl || '')

    // UI state
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [bannerPreview, setBannerPreview] = useState<string | null>(tournament.headerImageUrl || null)

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Preview immediately
        const reader = new FileReader()
        reader.onload = (ev) => setBannerPreview(ev.target?.result as string)
        reader.readAsDataURL(file)

        setIsUploading(true)
        try {
            const url = await uploadBanner(tournament.id, file)
            if (url) {
                setHeaderImageUrl(url)
                toast.success('Banner uploaded!')
            } else {
                toast.error('Failed to upload banner')
            }
        } catch {
            toast.error('Upload error')
        } finally {
            setIsUploading(false)
        }
    }

    const handleRemoveBanner = () => {
        setBannerPreview(null)
        setHeaderImageUrl('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Tournament name is required')
            return
        }

        setIsSaving(true)
        try {
            const result = await updateTournamentDetails(tournament.id, {
                name: name.trim(),
                venue: venue.trim() || undefined,
                startDate: startDate || undefined,
                registrationStart: registrationStart || undefined,
                registrationEnd: registrationEnd || undefined,
                earlyBirdDeadline: earlyBirdDeadline || undefined,
                earlyBirdPrice: earlyBirdPrice ? parseFloat(earlyBirdPrice) : null,
                regularPrice: regularPrice ? parseFloat(regularPrice) : null,
                headerImageUrl: headerImageUrl || null,
            })

            if (result.success) {
                toast.success('Tournament details saved!')
            } else {
                toast.error(result.error || 'Failed to save')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Banner Upload */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-indigo-500" />
                    Tournament Banner
                </h3>

                <div className="space-y-4">
                    {bannerPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200">
                            <div className="relative w-full h-48 md:h-64">
                                <Image
                                    src={bannerPreview}
                                    alt="Tournament banner"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                            <div className="absolute top-3 right-3 flex gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 bg-white/90 hover:bg-white rounded-lg shadow-md text-gray-700 transition-all"
                                    title="Change banner"
                                >
                                    <Upload className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleRemoveBanner}
                                    className="p-2 bg-red-500/90 hover:bg-red-600 rounded-lg shadow-md text-white transition-all"
                                    title="Remove banner"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                        >
                            {isUploading ? (
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            ) : (
                                <>
                                    <div className="w-12 h-12 bg-gray-100 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center transition-colors">
                                        <Upload className="w-6 h-6 text-gray-400 group-hover:text-indigo-500" />
                                    </div>
                                    <div className="text-center">
                                        <span className="text-sm font-medium text-gray-700">Click to upload banner</span>
                                        <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB. Recommended: 1200 × 400</p>
                                    </div>
                                </>
                            )}
                        </button>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Tournament Details */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    Tournament Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tournament Name <span className="text-red-500">*</span></label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <MapPin className="w-3.5 h-3.5 inline mr-1" />
                            Venue
                        </label>
                        <input
                            value={venue}
                            onChange={e => setVenue(e.target.value)}
                            placeholder="e.g. Manila Convention Center"
                            className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                        <input
                            type="datetime-local"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Registration Opens</label>
                        <input
                            type="datetime-local"
                            value={registrationStart}
                            onChange={e => setRegistrationStart(e.target.value)}
                            className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Registration Closes</label>
                        <input
                            type="datetime-local"
                            value={registrationEnd}
                            onChange={e => setRegistrationEnd(e.target.value)}
                            className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Early Bird Deadline</label>
                        <input
                            type="datetime-local"
                            value={earlyBirdDeadline}
                            onChange={e => setEarlyBirdDeadline(e.target.value)}
                            className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Pricing */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-500" />
                    Pricing
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Early Bird Price (₱)</label>
                        <input
                            type="number"
                            value={earlyBirdPrice}
                            onChange={e => setEarlyBirdPrice(e.target.value)}
                            placeholder="e.g. 2500"
                            step="0.01"
                            className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Regular Price (₱)</label>
                        <input
                            type="number"
                            value={regularPrice}
                            onChange={e => setRegularPrice(e.target.value)}
                            placeholder="e.g. 3500"
                            step="0.01"
                            className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50 gap-2"
                >
                    {isSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                    ) : (
                        <><Save className="w-4 h-4" /> Save Changes</>
                    )}
                </button>
            </div>
        </div>
    )
}
