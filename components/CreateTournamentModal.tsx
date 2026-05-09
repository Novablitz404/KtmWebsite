'use client'

import { Fragment, useState, useRef } from 'react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { createTournament } from '@/app/actions'
import { X, Image as ImageIcon, Check, Loader2 } from 'lucide-react'
import GlobalDropdown from './GlobalDropdown'
import GlobalCalendar from './GlobalCalendar'
import GlobalTimePicker from './GlobalTimePicker'
import ImageCropperModal from './ImageCropperModal'

import { useQueryClient } from '@tanstack/react-query'

interface CreateTournamentModalProps {
    isOpen: boolean
    onClose: () => void
    templates: { id: string; name: string }[]
}

export default function CreateTournamentModal({ isOpen, onClose, templates }: CreateTournamentModalProps) {
    const formRef = useRef<HTMLFormElement>(null)
    const router = useRouter()
    const queryClient = useQueryClient()

    // Form State
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [selectedTemplate, setSelectedTemplate] = useState('')
    const [startDate, setStartDate] = useState<Date | undefined>(undefined)
    const [registrationStart, setRegistrationStart] = useState<Date | undefined>(undefined)
    const [registrationEnd, setRegistrationEnd] = useState<Date | undefined>(undefined)
    const [selectedTier, setSelectedTier] = useState('GSS-3')
    const [dateTBA, setDateTBA] = useState(false)

    // Time States
    const [startTime, setStartTime] = useState('08:00')
    const [regStartTime, setRegStartTime] = useState('00:00')
    const [regEndTime, setRegEndTime] = useState('23:59')

    // Early Bird States
    const [showEarlyBird, setShowEarlyBird] = useState(false)
    const [earlyBirdDate, setEarlyBirdDate] = useState<Date | undefined>(undefined)
    const [earlyBirdTime, setEarlyBirdTime] = useState('23:59')

    // Pricing States
    const [showPricing, setShowPricing] = useState(false)
    const [currency, setCurrency] = useState('PHP')
    const CURRENCIES = [
        { code: 'PHP', symbol: '₱', label: 'PHP – Philippine Peso' },
        { code: 'USD', symbol: '$', label: 'USD – US Dollar' },
        { code: 'EUR', symbol: '€', label: 'EUR – Euro' },
        { code: 'SGD', symbol: 'S$', label: 'SGD – Singapore Dollar' },
        { code: 'AUD', symbol: 'A$', label: 'AUD – Australian Dollar' },
        { code: 'GBP', symbol: '£', label: 'GBP – British Pound' },
    ]
    const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol ?? currency
    const PRICING_COMBOS = [
        { key: 'KYORUGI_INDIVIDUAL', label: 'Kyorugi Individual' },
        { key: 'KYORUGI_TEAM', label: 'Kyorugi Team' },
        { key: 'POOMSAE_INDIVIDUAL', label: 'Poomsae Individual' },
        { key: 'POOMSAE_PAIR', label: 'Poomsae Pair' },
        { key: 'POOMSAE_TEAM', label: 'Poomsae Team' },
        { key: 'KYUKPA_INDIVIDUAL', label: 'Kyukpa Individual' },
    ]
    const [categoryPricing, setCategoryPricing] = useState<Record<string, { earlyBird: string; regular: string }>>({})

    // Cropper State
    const [showCropper, setShowCropper] = useState(false)
    const [tempImage, setTempImage] = useState<string | null>(null) // Original uploaded image to crop
    const [croppedImageBlob, setCroppedImageBlob] = useState<Blob | null>(null) // Final cropped blob

    // Xendit State
    const [xenditEnabled, setXenditEnabled] = useState(false)

    const handleBackdropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please upload an image file')
                e.target.value = ''
                return
            }
            if (file.size > 10 * 1024 * 1024) {
                setError('Image size must be less than 10MB')
                e.target.value = ''
                return
            }
            setError('')

            const objectUrl = URL.createObjectURL(file)
            setTempImage(objectUrl)
            setShowCropper(true)
            e.target.value = ''
        }
    }

    const removeImage = () => {
        setCroppedImageBlob(null)
        if (imagePreview) URL.revokeObjectURL(imagePreview)
        setImagePreview(null)
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        setIsSubmitting(true)
        setError('')

        // Append cropped image
        if (croppedImageBlob) {
            formData.delete('headerImage')
            formData.append('headerImage', croppedImageBlob, 'header.jpg')
        }

        try {
            const result = await createTournament(formData)

            if (result?.error) {
                setError(result.error)
            } else {
                if (result.id) {
                    queryClient.invalidateQueries({ queryKey: ['organizer-tournaments'] })
                    queryClient.invalidateQueries({ queryKey: ['organization-dashboard'] })
                    queryClient.invalidateQueries({ queryKey: ['organization-events-data'] })
                    router.push(`/tournament/${result.id}`)
                } else {
                    router.refresh()
                    onClose()
                }
            }
        } catch {
            setError('Failed to create tournament. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">


            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Panel */}
            <div className="flex min-h-full items-center justify-center p-4">
                <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-600 to-red-700">
                        <h2 className="text-lg font-bold text-white">Create New Tournament</h2>
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 max-h-[85vh] overflow-y-auto">
                        <form
                            ref={formRef}
                            onSubmit={handleSubmit}
                            className="space-y-8"
                        >
                            {/* ─── SECTION 1: Tournament Information ─── */}
                            <section>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">1</span>
                                    Tournament Information
                                </h3>

                                <div className="space-y-4">
                                    {/* Name + Venue Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
                                                Tournament Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                id="name"
                                                placeholder="e.g. KTM Winter Championship 2025"
                                                required
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="venue" className="block text-sm font-semibold text-gray-700 mb-1">
                                                Venue
                                            </label>
                                            <input
                                                type="text"
                                                name="venue"
                                                id="venue"
                                                placeholder="e.g. Mall of Asia Arena, Pasay City"
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* GSS Tier + Guideline Template Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                GSS Tier
                                            </label>
                                            <div className="flex gap-2">
                                                {([
                                                    { value: 'GSS-4', label: 'Local', desc: '×0.75' },
                                                    { value: 'GSS-3', label: 'Standard', desc: '×1.0' },
                                                    { value: 'GSS-2', label: 'Major', desc: '×1.5' },
                                                    { value: 'GSS-1', label: 'Premier', desc: '×2.0' },
                                                ] as const).map((tier) => (
                                                    <button
                                                        key={tier.value}
                                                        type="button"
                                                        onClick={() => setSelectedTier(tier.value)}
                                                        className={`flex-1 px-3 py-2 text-sm font-bold rounded-lg border transition-all ${selectedTier === tier.value
                                                            ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span className="block text-xs">{tier.label}</span>
                                                        <span className="block text-[10px] opacity-70">{tier.desc}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Higher tiers multiply GSS ranking bonuses (Local = ×0.75, Premier = ×2.0).
                                            </p>
                                            <input type="hidden" name="tier" value={selectedTier} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Guideline Template
                                            </label>
                                            {templates.length === 0 ? (
                                                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                                                    ⚠️ No templates found. Contact an administrator.
                                                </div>
                                            ) : (
                                                <>
                                                    <GlobalDropdown
                                                        name="guidelineTemplateId"
                                                        fullWidth
                                                        label="Select a template (Optional)"
                                                        options={templates.map(t => ({
                                                            value: t.id,
                                                            label: t.name
                                                        }))}
                                                        value={selectedTemplate}
                                                        onChange={setSelectedTemplate}
                                                        align="left"
                                                        className="w-full"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        Auto-populates categories from the template.
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <hr className="border-gray-100" />

                            {/* ─── SECTION 2: Header Image ─── */}
                            <section>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">2</span>
                                    Header Image
                                </h3>

                                <div className="relative group">
                                    <div className={`
                                        w-full h-44 rounded-xl border-2 border-dashed 
                                        flex flex-col items-center justify-center 
                                        bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer overflow-hidden
                                        ${imagePreview ? 'border-red-400' : 'border-gray-300'}
                                    `}>
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} alt="Header Preview" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        removeImage()
                                                    }}
                                                    className="absolute top-2 right-2 p-1 bg-white/80 rounded-full hover:bg-white text-gray-600 hover:text-red-500 transition-colors shadow-sm"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </>
                                        ) : (
                                            <label htmlFor="headerImage" className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4">
                                                <ImageIcon className="w-8 h-8 text-gray-400 mb-2 group-hover:text-red-500 transition-colors" />
                                                <p className="text-sm font-medium text-gray-600">Click to upload header image</p>
                                                <p className="text-xs text-gray-400 mt-1">Recommended: 1200×400 · PNG, JPG (Max 10MB)</p>
                                            </label>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        id="headerImage"
                                        accept="image/*"
                                        onChange={handleBackdropChange}
                                        className="hidden"
                                    />
                                </div>
                                {croppedImageBlob && (
                                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Image cropped and ready to upload
                                    </p>
                                )}
                            </section>

                            {/* Cropper Modal (Nested) */}
                            {showCropper && tempImage && (
                                <ImageCropperModal
                                    imageUrl={tempImage}
                                    aspectRatio={3 / 1}
                                    onClose={() => {
                                        setShowCropper(false)
                                        setTempImage(null)
                                        const input = document.getElementById('headerImage') as HTMLInputElement
                                        if (input) input.value = ''
                                    }}
                                    onCropComplete={(croppedBlob) => {
                                        const objectUrl = URL.createObjectURL(croppedBlob)
                                        setImagePreview(objectUrl)
                                        setCroppedImageBlob(croppedBlob)
                                        setShowCropper(false)
                                    }}
                                />
                            )}

                            <hr className="border-gray-100" />

                            {/* ─── SECTION 3: Schedule & Registration ─── */}
                            <section>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">3</span>
                                    Schedule & Registration
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Tournament Date + Time */}
                                    <div className="space-y-2">
                                        <div className={dateTBA ? 'opacity-40 pointer-events-none' : ''}>
                                            <GlobalCalendar
                                                label="Tournament Date *"
                                                value={startDate}
                                                onChange={(date) => {
                                                    setStartDate(date)
                                                    const input = document.getElementById('startDate') as HTMLInputElement
                                                    if (input) input.value = format(date, 'yyyy-MM-dd')
                                                }}
                                                placeholder={dateTBA ? 'TBA' : 'Select date...'}
                                                className="w-full"
                                                fullWidth
                                            />
                                            <div className="mt-2">
                                                <GlobalTimePicker
                                                    label="Start Time"
                                                    value={startTime}
                                                    onChange={setStartTime}
                                                    name="startTime"
                                                    fullWidth
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDateTBA(!dateTBA)
                                                if (!dateTBA) {
                                                    setStartDate(undefined)
                                                    const input = document.getElementById('startDate') as HTMLInputElement
                                                    if (input) input.value = '2099-12-31'
                                                } else {
                                                    const input = document.getElementById('startDate') as HTMLInputElement
                                                    if (input) input.value = ''
                                                }
                                            }}
                                            className={`w-full text-xs font-bold py-1.5 rounded-lg transition-colors ${dateTBA ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                                        >
                                            {dateTBA ? '✕ Remove TBA' : 'Set as TBA'}
                                        </button>
                                        <input type="hidden" name="startDate" id="startDate" required />
                                        <input type="hidden" name="dateTBA" value={dateTBA ? 'true' : 'false'} />
                                    </div>

                                    {/* Registration Opens + Time */}
                                    <div className="space-y-2">
                                        <GlobalCalendar
                                            label="Registration Opens"
                                            value={registrationStart}
                                            onChange={(date) => {
                                                setRegistrationStart(date)
                                                const input = document.getElementById('registrationStart') as HTMLInputElement
                                                if (input) input.value = format(date, 'yyyy-MM-dd')
                                            }}
                                            placeholder="Select date..."
                                            className="w-full"
                                            fullWidth
                                        />
                                        <input type="hidden" name="registrationStart" id="registrationStart" />
                                        <GlobalTimePicker
                                            label="Opens At"
                                            value={regStartTime}
                                            onChange={setRegStartTime}
                                            name="regStartTime"
                                            fullWidth
                                        />
                                    </div>

                                    {/* Registration Closes + Time */}
                                    <div className="space-y-2">
                                        <GlobalCalendar
                                            label="Registration Closes"
                                            value={registrationEnd}
                                            onChange={(date) => {
                                                setRegistrationEnd(date)
                                                const input = document.getElementById('registrationEnd') as HTMLInputElement
                                                if (input) input.value = format(date, 'yyyy-MM-dd')
                                            }}
                                            placeholder="Select date..."
                                            className="w-full"
                                            fullWidth
                                        />
                                        <input type="hidden" name="registrationEnd" id="registrationEnd" />
                                        <GlobalTimePicker
                                            label="Closes At"
                                            value={regEndTime}
                                            onChange={setRegEndTime}
                                            name="regEndTime"
                                            fullWidth
                                        />
                                    </div>
                                </div>
                            </section>

                            <hr className="border-gray-100" />

                            {/* ─── SECTION 4: Pricing ─── */}
                            <section>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">4</span>
                                    Pricing
                                </h3>

                                <div className="space-y-4">
                                    {/* Currency Selector */}
                                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Currency</p>
                                            <p className="text-xs text-gray-500">Athletes will see and pay in this currency. Xendit settles the equivalent amount to your local bank.</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {CURRENCIES.map(c => (
                                                <button
                                                    key={c.code}
                                                    type="button"
                                                    onClick={() => setCurrency(c.code)}
                                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                                                        currency === c.code
                                                            ? 'bg-red-600 text-white border-red-600 shadow-sm'
                                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {c.symbol} {c.code}
                                                </button>
                                            ))}
                                        </div>
                                        <input type="hidden" name="currency" value={currency} />
                                    </div>

                                    {/* Early Bird — shows only when registration dates are set */}
                                    {registrationStart && registrationEnd && (
                                        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Early Bird Pricing</p>
                                                    <p className="text-xs text-gray-500">Offer a discounted rate for early registrations</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowEarlyBird(!showEarlyBird)}
                                                    className={`relative w-11 h-6 rounded-full transition-colors ${showEarlyBird ? 'bg-red-600' : 'bg-gray-300'}`}
                                                >
                                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${showEarlyBird ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>

                                            {showEarlyBird && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-200">
                                                    {/* Early Bird Deadline */}
                                                    <div>
                                                        <GlobalCalendar
                                                            label="Early Bird Deadline"
                                                            value={earlyBirdDate}
                                                            onChange={(date) => {
                                                                setEarlyBirdDate(date)
                                                                const input = document.getElementById('earlyBirdDeadline') as HTMLInputElement
                                                                if (input) input.value = format(date, 'yyyy-MM-dd')
                                                            }}
                                                            placeholder="Select date..."
                                                            className="w-full"
                                                            fullWidth
                                                        />
                                                        <input type="hidden" name="earlyBirdDeadline" id="earlyBirdDeadline" />
                                                        <div className="mt-2">
                                                            <GlobalTimePicker
                                                                label="Deadline Time"
                                                                value={earlyBirdTime}
                                                                onChange={setEarlyBirdTime}
                                                                name="earlyBirdTime"
                                                                fullWidth
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Early Bird Price */}
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Early Bird Price</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                                            <input
                                                                type="number"
                                                                name="earlyBirdPrice"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="0.00"
                                                                className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Regular Price */}
                                                    <div>
                                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Regular Price</label>
                                                        <div className="relative">
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
                                                            <input
                                                                type="number"
                                                                name="regularPrice"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="0.00"
                                                                className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Per-Category Pricing */}
                                    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Category Pricing</p>
                                            <p className="text-xs text-gray-500">Set fees per event type (e.g., Kyorugi Individual, Poomsae Pair)</p>
                                        </div>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                                                        <th className="pb-2 pr-4">Event Type</th>
                                                        <th className="pb-2 px-2 text-center">Early Bird ({currencySymbol})</th>
                                                        <th className="pb-2 pl-2 text-center">Regular ({currencySymbol})</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {PRICING_COMBOS.map(combo => (
                                                        <tr key={combo.key}>
                                                            <td className="py-2.5 pr-4 text-sm font-medium text-gray-700">{combo.label}</td>
                                                            <td className="py-2.5 px-2">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder="—"
                                                                    value={categoryPricing[combo.key]?.earlyBird || ''}
                                                                    onChange={(e) => setCategoryPricing(prev => ({
                                                                        ...prev,
                                                                        [combo.key]: { ...prev[combo.key], earlyBird: e.target.value, regular: prev[combo.key]?.regular || '' }
                                                                    }))}
                                                                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-center focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                                                />
                                                            </td>
                                                            <td className="py-2.5 pl-2">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    placeholder="—"
                                                                    value={categoryPricing[combo.key]?.regular || ''}
                                                                    onChange={(e) => setCategoryPricing(prev => ({
                                                                        ...prev,
                                                                        [combo.key]: { ...prev[combo.key], regular: e.target.value, earlyBird: prev[combo.key]?.earlyBird || '' }
                                                                    }))}
                                                                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-center focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                                                                />
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Show Pricing Toggle */}
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">Show Pricing Publicly</p>
                                                <p className="text-xs text-gray-400">Athletes can see fees on the registration page</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowPricing(!showPricing)}
                                                className={`relative w-11 h-6 rounded-full transition-colors ${showPricing ? 'bg-red-600' : 'bg-gray-300'}`}
                                            >
                                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${showPricing ? 'translate-x-5' : ''}`} />
                                            </button>
                                        </div>

                                        {/* Hidden inputs for form submission */}
                                        <input type="hidden" name="showPricing" value={showPricing ? 'true' : 'false'} />
                                        <input
                                            type="hidden"
                                            name="categoryPricing"
                                            value={JSON.stringify(
                                                Object.fromEntries(
                                                    Object.entries(categoryPricing)
                                                        .filter(([, v]) => v.earlyBird || v.regular)
                                                        .map(([k, v]) => [k, {
                                                            earlyBird: v.earlyBird ? parseFloat(v.earlyBird) : null,
                                                            regular: v.regular ? parseFloat(v.regular) : null
                                                        }])
                                                )
                                            )}
                                        />
                                    </div>
                                </div>
                            </section>

                            <hr className="border-gray-100" />

                            {/* ─── SECTION 5: Xendit Payment Integration ─── */}
                            <section>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">5</span>
                                    Online Payment (Xendit)
                                </h3>

                                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Enable Xendit Payments</p>
                                            <p className="text-xs text-gray-500">Collect registration fees online via Xendit</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setXenditEnabled(!xenditEnabled)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${xenditEnabled ? 'bg-red-600' : 'bg-gray-300'}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${xenditEnabled ? 'translate-x-5' : ''}`} />
                                        </button>
                                    </div>

                                    {xenditEnabled && (
                                        <div className="pt-3 border-t border-gray-200 space-y-3">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Xendit Secret API Key</label>
                                                <input
                                                    type="password"
                                                    name="xenditSecretKey"
                                                    placeholder="xnd_development_..."
                                                    required
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                                                />
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Found in your Xendit Dashboard → Settings → API Keys. This key is encrypted before storage.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <input type="hidden" name="xenditEnabled" value={xenditEnabled ? 'true' : 'false'} />
                                </div>
                            </section>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-2 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-200"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 size={16} className="animate-spin" />
                                            Creating Tournament...
                                        </span>
                                    ) : 'Create Tournament'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
