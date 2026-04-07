'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { updateTournamentDetails, deleteTournament, deleteAllCategories } from '@/app/actions'
import { uploadBanner } from '@/lib/supabase-storage'
import {
    ImageIcon, Save, Loader2, Calendar, MapPin, DollarSign,
    Upload, Trash2, Tag, Settings2, Download,
    FileText, RefreshCw, ShieldAlert, CheckCircle2, XCircle,
    Clock, Archive, Play, RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'

interface TournamentSettingsProps {
    tournament: {
        id: string
        name: string
        venue: string | null
        startDate: Date | string
        status: string
        guidelines?: string | null
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
    return new Date(date).toISOString().slice(0, 16)
}

const inputClass = `w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium
    focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white
    transition-all placeholder:text-gray-300`

const textareaClass = `w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium
    focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white
    transition-all placeholder:text-gray-300 resize-none leading-relaxed`

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
            {children}
        </label>
    )
}

function SectionDivider({ title }: { title: string }) {
    return (
        <div className="flex items-center gap-3 pt-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{title}</span>
            <div className="flex-1 h-px bg-gray-100" />
        </div>
    )
}

function DateField({ label, value, onChange, hint }: {
    label: string; value: string; onChange: (v: string) => void; hint?: string
}) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <input
                type="datetime-local"
                value={value}
                onChange={e => onChange(e.target.value)}
                className={inputClass}
            />
            {hint && <p className="text-[10px] text-gray-400 mt-1.5 font-medium">{hint}</p>}
        </div>
    )
}

const STATUS_OPTIONS = [
    { value: 'UPCOMING',    label: 'Upcoming',    icon: Clock,         color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
    { value: 'ONGOING',     label: 'Ongoing',     icon: Play,          color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { value: 'COMPLETED',   label: 'Completed',   icon: CheckCircle2,  color: 'text-gray-600',   bg: 'bg-gray-100',  border: 'border-gray-200'   },
    { value: 'CANCELLED',   label: 'Cancelled',   icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200'    },
    { value: 'RESCHEDULED', label: 'Rescheduled', icon: RotateCcw,     color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
]

const SUB_TABS = [
    { id: 'general',  label: 'General',  icon: Settings2  },
    { id: 'schedule', label: 'Schedule', icon: Calendar   },
    { id: 'pricing',  label: 'Pricing',  icon: DollarSign },
    { id: 'banner',   label: 'Banner',   icon: ImageIcon  },
    { id: 'advanced', label: 'Advanced', icon: ShieldAlert },
] as const

type SubTab = typeof SUB_TABS[number]['id']

export default function TournamentSettings({ tournament }: TournamentSettingsProps) {
    const router         = useRouter()
    const fileInputRef   = useRef<HTMLInputElement>(null)
    const [activeTab, setActiveTab] = useState<SubTab>('general')

    const [name, setName]                           = useState(tournament.name)
    const [venue, setVenue]                         = useState(tournament.venue || '')
    const [status, setStatus]                       = useState(tournament.status || 'UPCOMING')
    const [guidelines, setGuidelines]               = useState(tournament.guidelines || '')
    const [startDate, setStartDate]                 = useState(formatDateForInput(tournament.startDate))
    const [registrationStart, setRegistrationStart] = useState(formatDateForInput(tournament.registrationStart))
    const [registrationEnd, setRegistrationEnd]     = useState(formatDateForInput(tournament.registrationEnd))
    const [earlyBirdDeadline, setEarlyBirdDeadline] = useState(formatDateForInput(tournament.earlyBirdDeadline))
    const [earlyBirdPrice, setEarlyBirdPrice]       = useState(tournament.earlyBirdPrice?.toString() || '')
    const [regularPrice, setRegularPrice]           = useState(tournament.regularPrice?.toString() || '')
    const [headerImageUrl, setHeaderImageUrl]       = useState(tournament.headerImageUrl || '')

    const [isSaving, setIsSaving]           = useState(false)
    const [isUploading, setIsUploading]     = useState(false)
    const [isDeletingCats, setIsDeletingCats] = useState(false)
    const [isDeleting, setIsDeleting]       = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState('')
    const [bannerPreview, setBannerPreview] = useState<string | null>(tournament.headerImageUrl || null)

    const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => setBannerPreview(ev.target?.result as string)
        reader.readAsDataURL(file)
        setIsUploading(true)
        try {
            const url = await uploadBanner(tournament.id, file)
            if (url) { setHeaderImageUrl(url); toast.success('Banner uploaded!') }
            else toast.error('Failed to upload banner')
        } catch { toast.error('Upload error') }
        finally { setIsUploading(false) }
    }

    const handleRemoveBanner = () => {
        setBannerPreview(null); setHeaderImageUrl('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSave = async () => {
        if (!name.trim()) { toast.error('Tournament name is required'); return }
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
                status,
                guidelines: guidelines || null,
            })
            if (result.success) toast.success('Tournament saved!')
            else toast.error(result.error || 'Failed to save')
        } catch { toast.error('Something went wrong') }
        finally { setIsSaving(false) }
    }

    const handleDeleteAllCategories = async () => {
        if (!confirm('Delete all categories and their matches? This cannot be undone.')) return
        setIsDeletingCats(true)
        try {
            await deleteAllCategories(tournament.id)
            toast.success('All categories deleted.')
            router.refresh()
        } catch { toast.error('Failed to delete categories.') }
        finally { setIsDeletingCats(false) }
    }

    const handleDeleteTournament = async () => {
        if (deleteConfirm !== tournament.name) {
            toast.error('Tournament name does not match.')
            return
        }
        setIsDeleting(true)
        try {
            await deleteTournament(tournament.id)
            toast.success('Tournament deleted.')
            router.push('/tournament')
        } catch (err: any) {
            toast.error(err?.message || 'Failed to delete tournament.')
        } finally {
            setIsDeleting(false)
        }
    }

    const savings = earlyBirdPrice && regularPrice
        ? parseFloat(regularPrice) - parseFloat(earlyBirdPrice)
        : 0

    const currentStatus = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0]

    return (
        <div className="space-y-5 animate-in fade-in duration-300">

            {/* ── Page header ─────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-sm text-gray-500 mt-1">Configure tournament details and preferences.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-red-600 to-red-700 shadow-md shadow-red-500/25 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                >
                    {isSaving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Save size={15} /> Save Changes</>}
                </button>
            </div>

            {/* ── Main card with sub-tabs ──────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

                {/* Tab nav */}
                <div className="flex border-b border-gray-100 px-2 pt-2 gap-1">
                    {SUB_TABS.map(tab => {
                        const Icon     = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-all border-b-2 -mb-px ${
                                    isActive
                                        ? 'border-red-600 text-red-600 bg-red-50/50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Icon size={14} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* ─────────── GENERAL TAB ─────────── */}
                {activeTab === 'general' && (
                    <div className="p-6 space-y-8 animate-in fade-in duration-200">

                        {/* Row 1: Name + Venue | Status */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left: Name & Venue */}
                            <div className="space-y-4">
                                <SectionDivider title="Basic Info" />
                                <div>
                                    <FieldLabel>Tournament Name <span className="text-red-500">*</span></FieldLabel>
                                    <input value={name} onChange={e => setName(e.target.value)}
                                        placeholder="e.g. National Championships 2025" className={inputClass} />
                                </div>
                                <div>
                                    <FieldLabel><span className="inline-flex items-center gap-1"><MapPin size={9} className="inline" /> Venue</span></FieldLabel>
                                    <input value={venue} onChange={e => setVenue(e.target.value)}
                                        placeholder="e.g. Manila Convention Center" className={inputClass} />
                                </div>
                            </div>

                            {/* Right: Status */}
                            <div className="space-y-4">
                                <SectionDivider title="Tournament Status" />
                                <p className="text-xs text-gray-400">Changing the status affects public visibility and registration availability.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {STATUS_OPTIONS.map(opt => {
                                        const Icon     = opt.icon
                                        const isActive = status === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => setStatus(opt.value)}
                                                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-left transition-all ${
                                                    isActive
                                                        ? `${opt.bg} ${opt.border} shadow-sm`
                                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <Icon size={14} className={isActive ? opt.color : 'text-gray-400'} />
                                                <span className={`text-sm font-bold ${isActive ? opt.color : 'text-gray-600'}`}>{opt.label}</span>
                                                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Guidelines (full width) */}
                        <div className="space-y-3">
                            <SectionDivider title="Tournament Guidelines" />
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div>
                                    <FieldLabel>Rules & Instructions</FieldLabel>
                                    <textarea
                                        value={guidelines}
                                        onChange={e => setGuidelines(e.target.value)}
                                        rows={7}
                                        placeholder="Enter tournament rules, eligibility criteria, weight class info, or any other guidelines for participants..."
                                        className={textareaClass}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1.5 font-medium">Displayed to athletes and clubs on the registration portal.</p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Preview</p>
                                    {guidelines.trim() ? (
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{guidelines}</p>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-28 gap-2">
                                            <FileText size={22} className="text-gray-200" />
                                            <p className="text-xs text-gray-400">Guidelines will appear here.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* ─────────── ADVANCED TAB ─────────── */}
                {activeTab === 'advanced' && (
                    <div className="p-6 space-y-8 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                            {/* Data Management */}
                            <div className="space-y-3">
                                <SectionDivider title="Data Management" />
                                <p className="text-xs text-gray-400">Export records or reset tournament data.</p>
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        onClick={() => toast.info('Export feature coming soon.')}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-left"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                            <Download size={14} className="text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Export Athletes (CSV)</p>
                                            <p className="text-xs text-gray-400">Download all registered athletes.</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toast.info('Export feature coming soon.')}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-left"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <Archive size={14} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Export Results (PDF)</p>
                                            <p className="text-xs text-gray-400">Download bracket results report.</p>
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteAllCategories}
                                        disabled={isDeletingCats}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-all text-left disabled:opacity-50"
                                    >
                                        <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                                            {isDeletingCats
                                                ? <Loader2 size={14} className="text-orange-600 animate-spin" />
                                                : <RefreshCw size={14} className="text-orange-600" />
                                            }
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-orange-700">Reset All Categories</p>
                                            <p className="text-xs text-orange-500">Deletes all categories, matches &amp; registrations.</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="space-y-3">
                                <SectionDivider title="Danger Zone" />
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <ShieldAlert size={14} className="text-red-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-red-700">Delete Tournament</p>
                                            <p className="text-xs text-red-500 mt-0.5">
                                                Permanently removes this tournament, all categories, matches, and registrations. This action cannot be undone.
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <FieldLabel>
                                            Type <span className="font-black text-red-600 lowercase normal-case">"{tournament.name}"</span> to confirm
                                        </FieldLabel>
                                        <input
                                            type="text"
                                            value={deleteConfirm}
                                            onChange={e => setDeleteConfirm(e.target.value)}
                                            placeholder="Type tournament name..."
                                            className="w-full px-4 py-2.5 bg-white border border-red-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all placeholder:text-red-200"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDeleteTournament}
                                        disabled={isDeleting || deleteConfirm !== tournament.name}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                                    >
                                        {isDeleting
                                            ? <><Loader2 size={14} className="animate-spin" /> Deleting...</>
                                            : <><Trash2 size={14} /> Delete Tournament</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─────────── SCHEDULE TAB ─────────── */}
                {activeTab === 'schedule' && (
                    <div className="p-6 space-y-6 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <DateField label="Event Date" value={startDate} onChange={setStartDate} hint="Main competition day." />
                            <DateField label="Registration Opens" value={registrationStart} onChange={setRegistrationStart} hint="When athletes can start registering." />
                            <DateField label="Registration Closes" value={registrationEnd} onChange={setRegistrationEnd} hint="Final deadline for submissions." />
                            <DateField label="Early Bird Deadline" value={earlyBirdDeadline} onChange={setEarlyBirdDeadline} hint="Discounted rate cut-off." />
                        </div>

                        {(registrationStart || earlyBirdDeadline || registrationEnd || startDate) && (
                            <div>
                                <SectionDivider title="Timeline Preview" />
                                <div className="mt-4 flex items-start gap-0 overflow-x-auto pb-2">
                                    {[
                                        { label: 'Reg. Opens',  date: registrationStart, color: 'bg-blue-500'   },
                                        { label: 'Early Bird',  date: earlyBirdDeadline, color: 'bg-amber-500'  },
                                        { label: 'Reg. Closes', date: registrationEnd,   color: 'bg-orange-500' },
                                        { label: 'Event Day',   date: startDate,          color: 'bg-red-600'    },
                                    ].filter(d => d.date).map((item, i, arr) => (
                                        <div key={item.label} className="flex items-center min-w-0">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                                                <p className="text-[9px] font-black text-gray-500 uppercase tracking-wide mt-1.5 whitespace-nowrap">{item.label}</p>
                                                <p className="text-[9px] text-gray-400 whitespace-nowrap">
                                                    {new Date(item.date!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </p>
                                            </div>
                                            {i < arr.length - 1 && <div className="h-px w-16 bg-gray-200 mx-2 flex-shrink-0 -mt-6" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─────────── PRICING TAB ─────────── */}
                {activeTab === 'pricing' && (
                    <div className="p-6 space-y-6 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <FieldLabel>Early Bird Price (₱)</FieldLabel>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-300">₱</span>
                                    <input type="number" value={earlyBirdPrice} onChange={e => setEarlyBirdPrice(e.target.value)}
                                        placeholder="0.00" step="0.01" className={inputClass + ' pl-8'} />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5 font-medium">Applies before the early bird deadline.</p>
                            </div>
                            <div>
                                <FieldLabel>Regular Price (₱)</FieldLabel>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-300">₱</span>
                                    <input type="number" value={regularPrice} onChange={e => setRegularPrice(e.target.value)}
                                        placeholder="0.00" step="0.01" className={inputClass + ' pl-8'} />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1.5 font-medium">Standard rate after the deadline.</p>
                            </div>
                        </div>

                        {savings > 0 && (
                            <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
                                <Tag size={13} className="text-emerald-600 flex-shrink-0" />
                                <p className="text-xs font-semibold text-emerald-700">
                                    Athletes save <span className="font-black">₱{savings.toLocaleString()}</span> with early bird registration.
                                </p>
                            </div>
                        )}

                        {(earlyBirdPrice || regularPrice) && (
                            <div className="grid grid-cols-2 gap-3">
                                {earlyBirdPrice && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Early Bird</p>
                                        <p className="text-3xl font-black text-gray-900 mt-1.5">₱{parseFloat(earlyBirdPrice).toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Before deadline</p>
                                    </div>
                                )}
                                {regularPrice && (
                                    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5">
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Regular</p>
                                        <p className="text-3xl font-black text-gray-900 mt-1.5">₱{parseFloat(regularPrice).toLocaleString()}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Standard rate</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ─────────── BANNER TAB ─────────── */}
                {activeTab === 'banner' && (
                    <div className="p-6 space-y-5 animate-in fade-in duration-200">
                        <p className="text-xs text-gray-400">Displayed at the top of your tournament page. Recommended: <span className="font-semibold text-gray-600">1200 × 400 px</span> · PNG, JPG, or GIF · up to 5 MB.</p>

                        {bannerPreview ? (
                            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                                <div className="relative w-full h-52 md:h-72">
                                    <Image src={bannerPreview} alt="Tournament banner" fill className="object-cover" unoptimized />
                                    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
                                </div>
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <button onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white backdrop-blur-sm rounded-xl shadow-md text-gray-700 text-xs font-bold transition-all">
                                        <Upload size={11} /> Change
                                    </button>
                                    <button onClick={handleRemoveBanner}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/90 hover:bg-red-600 backdrop-blur-sm rounded-xl shadow-md text-white text-xs font-bold transition-all">
                                        <Trash2 size={11} /> Remove
                                    </button>
                                </div>
                                {isUploading && (
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                        <div className="flex items-center gap-2 text-white">
                                            <Loader2 size={18} className="animate-spin" />
                                            <span className="text-sm font-semibold">Uploading...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full h-56 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-red-300 hover:bg-red-50/20 transition-all group"
                            >
                                {isUploading
                                    ? <><Loader2 size={22} className="text-red-500 animate-spin" /><span className="text-sm text-gray-400">Uploading...</span></>
                                    : <>
                                        <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-red-50 flex items-center justify-center transition-colors">
                                            <Upload size={20} className="text-gray-400 group-hover:text-red-500 transition-colors" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-gray-600 group-hover:text-gray-800">Click to upload banner</p>
                                            <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, GIF · up to 5 MB</p>
                                        </div>
                                    </>
                                }
                            </button>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" />
                    </div>
                )}
            </div>
        </div>
    )
}
