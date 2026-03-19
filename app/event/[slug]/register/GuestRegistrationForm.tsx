'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import SignatureCanvas from 'react-signature-canvas'
import { Loader2, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft, Search, X, Tag } from 'lucide-react'
import { COUNTRIES } from '@/lib/countries'

const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    { ssr: false, loading: () => <span className="text-sm text-indigo-600">Generating waiver...</span> }
)

// Lazily import WaiverDocument (it uses @react-pdf)
import WaiverDocument from '@/components/WaiverDocument'

const BELT_OPTIONS = [
    'White', 'Yellow', 'Orange', 'Green', 'Purple',
    'Blue', 'Red', 'Maroon', 'Brown', 'Black'
]

const GENDER_OPTIONS = ['Male', 'Female']

type Step = 'info' | 'category' | 'waiver' | 'payment' | 'confirmation'

type CategoryPricingMap = Record<string, { regular: number; earlyBird?: number }>

/** Returns the currency symbol for a given ISO currency code */
function getCurrencySymbol(code: string): string {
    const symbols: Record<string, string> = {
        PHP: '₱', USD: '$', EUR: '€', SGD: 'S$', AUD: 'A$', GBP: '£', JPY: '¥',
        KRW: '₩', CNY: '¥', MYR: 'RM', THB: '฿', IDR: 'Rp',
    }
    return symbols[code.toUpperCase()] ?? code
}

interface GuestRegistrationFormProps {
    tournament: {
        id: string
        name: string
        xenditEnabled: boolean
        currentPrice: number
        isEarlyBird: boolean
        regularPrice: number | null
        earlyBirdPrice: number | null
        categoryPricing?: CategoryPricingMap | null
        currency?: string
    }
    clubs: { id: string; name: string }[]
    eventSlug: string
    paymentConfirmed?: boolean
    registrationId?: string
}

export default function GuestRegistrationForm({
    tournament,
    clubs,
    eventSlug,
    paymentConfirmed = false,
    registrationId,
}: GuestRegistrationFormProps) {
    const router = useRouter()
    const currencyCode = tournament.currency ?? 'PHP'
    const currencySymbol = getCurrencySymbol(currencyCode)
    const [step, setStep] = useState<Step>(paymentConfirmed ? 'confirmation' : 'info')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')

    // Step 1: Personal Info
    const [email, setEmail] = useState('')
    const [fullName, setFullName] = useState('')
    const [birthday, setBirthday] = useState('')
    const [gender, setGender] = useState('Male')
    const [belt, setBelt] = useState('White')
    const [weight, setWeight] = useState('')
    const [height, setHeight] = useState('')
    const [country, setCountry] = useState('')
    const [clubSelection, setClubSelection] = useState<'search' | 'independent' | 'other'>('search')
    const [selectedClubId, setSelectedClubId] = useState('')
    const [clubSearch, setClubSearch] = useState('')
    const [clubNameOther, setClubNameOther] = useState('')
    const [countrySearch, setCountrySearch] = useState('')
    const [showClubDropdown, setShowClubDropdown] = useState(false)
    const [showCountryDropdown, setShowCountryDropdown] = useState(false)

    // Step 2: Category
    const [detectedCategory, setDetectedCategory] = useState<string | null>(null)
    const [isDetecting, setIsDetecting] = useState(false)
    const [eventType, setEventType] = useState('KYORUGI')
    const [poomsaeSubtype, setPoomsaeSubtype] = useState('INDIVIDUAL')

    // Step 3: Waiver
    const sigCanvas = useRef<SignatureCanvas>(null)
    const [signatureData, setSignatureData] = useState<string | null>(null)

    // Helper to resolve price from categoryPricing map
    const resolveCategoryPrice = (evType: string, poomsaeSub: string): number => {
        const { categoryPricing, regularPrice, earlyBirdPrice, isEarlyBird, currentPrice } = tournament
        if (regularPrice) {
            return isEarlyBird && earlyBirdPrice ? earlyBirdPrice : regularPrice
        }
        if (categoryPricing) {
            let key = evType
            if (evType === 'POOMSAE') key = `POOMSAE_${poomsaeSub}`
            else if (evType === 'KYORUGI') key = 'KYORUGI_INDIVIDUAL'
            else if (evType === 'KYUKPA') key = 'KYUKPA_INDIVIDUAL'
            const entry = categoryPricing[key]
            if (entry) return isEarlyBird && entry.earlyBird ? entry.earlyBird : entry.regular
        }
        return currentPrice
    }

    // Step 4: Payment
    const [promoCode, setPromoCode] = useState('')
    const [promoDiscount, setPromoDiscount] = useState<{ type: string; value: number } | null>(null)
    const [promoError, setPromoError] = useState('')
    const [promoValidating, setPromoValidating] = useState(false)

    // Result
    const [registrationCode, setRegistrationCode] = useState('')
    const [playerId, setPlayerId] = useState(registrationId || '')
    const [categoryName, setCategoryName] = useState('')

    // Compute initial price: use category pricing map if available
    const getInitialPrice = (): number => {
        const { categoryPricing, regularPrice, earlyBirdPrice, isEarlyBird, currentPrice } = tournament
        if (regularPrice) return isEarlyBird && earlyBirdPrice ? earlyBirdPrice : regularPrice
        if (categoryPricing) {
            const entry = categoryPricing['KYORUGI_INDIVIDUAL'] ?? Object.values(categoryPricing)[0]
            if (entry) return isEarlyBird && entry.earlyBird ? entry.earlyBird : entry.regular
        }
        return currentPrice
    }
    const [finalPrice, setFinalPrice] = useState(getInitialPrice)

    // Filtered lists
    const filteredClubs = clubs.filter(c =>
        c.name.toLowerCase().includes(clubSearch.toLowerCase())
    )
    const filteredCountries = COUNTRIES.filter(c =>
        c.toLowerCase().includes(countrySearch.toLowerCase())
    )

    // Auto-detect category when moving to step 2
    const detectCategory = async () => {
        setIsDetecting(true)
        setError('')
        try {
            const res = await fetch('/api/event/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournamentId: tournament.id,
                    email, fullName, birthday, beltRank: belt,
                    weightKg: weight, heightCm: height, gender, country,
                    clubId: selectedClubId || null,
                    clubNameOther: clubSelection === 'other' ? clubNameOther : null,
                    isIndependent: clubSelection === 'independent',
                    eventType,
                    poomsaeSubtype: eventType === 'POOMSAE' ? poomsaeSubtype : undefined,
                    waiverAccepted: true,
                    promoCode: promoDiscount ? promoCode : undefined,
                    _dryRun: true, // We'll handle this differently — just detect category
                }),
            })
            // For category detection, we use the placement API directly
            const catRes = await fetch(`/api/tournament/${tournament.id}/detect-category`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    birthDate: birthday,
                    gender,
                    weight: parseFloat(weight),
                    height: parseFloat(height),
                    belt,
                    type: eventType,
                    poomsaeType: eventType === 'POOMSAE' ? poomsaeSubtype : undefined,
                }),
            })
            if (catRes.ok) {
                const data = await catRes.json()
                setDetectedCategory(data?.name || null)
            } else {
                setDetectedCategory(null)
            }
        } catch {
            setDetectedCategory(null)
        } finally {
            setIsDetecting(false)
        }
    }

    // Validate Step 1
    const validateStep1 = (): boolean => {
        if (!email.trim() || !email.includes('@')) { setError('Valid email is required'); return false }
        if (!fullName.trim()) { setError('Full name is required'); return false }
        if (!birthday) { setError('Birthday is required'); return false }
        if (!weight || parseFloat(weight) <= 0) { setError('Weight is required'); return false }
        if (!height || parseFloat(height) <= 0) { setError('Height is required'); return false }
        if (!country) { setError('Country is required'); return false }
        if (clubSelection === 'search' && !selectedClubId) { setError('Please select a club or choose Independent/Other'); return false }
        if (clubSelection === 'other' && !clubNameOther.trim()) { setError('Please enter your club name'); return false }
        setError('')
        return true
    }

    // Handle promo code validation
    const validatePromo = async () => {
        if (!promoCode.trim()) return
        setPromoValidating(true)
        setPromoError('')
        try {
            const res = await fetch('/api/event/promo/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tournamentId: tournament.id, code: promoCode }),
            })
            const data = await res.json()
            if (res.ok && data.valid) {
                setPromoDiscount({ type: data.discountType, value: data.discountValue })
                const discount = data.discountType === 'PERCENTAGE'
                    ? tournament.currentPrice * (data.discountValue / 100)
                    : data.discountValue
                setFinalPrice(Math.max(0, tournament.currentPrice - discount))
                setPromoError('')
            } else {
                setPromoDiscount(null)
                setFinalPrice(tournament.currentPrice)
                setPromoError(data.error || 'Invalid promo code')
            }
        } catch {
            setPromoError('Failed to validate promo code')
        } finally {
            setPromoValidating(false)
        }
    }

    // Handle full registration submission
    const handleSubmit = async () => {
        setIsSubmitting(true)
        setError('')
        try {
            const res = await fetch('/api/event/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournamentId: tournament.id,
                    email: email.trim(),
                    fullName: fullName.trim(),
                    birthday,
                    beltRank: belt,
                    weightKg: weight,
                    heightCm: height,
                    gender,
                    country,
                    clubId: selectedClubId || null,
                    clubNameOther: clubSelection === 'other' ? clubNameOther : null,
                    isIndependent: clubSelection === 'independent',
                    eventType,
                    poomsaeSubtype: eventType === 'POOMSAE' ? poomsaeSubtype : undefined,
                    waiverAccepted: true,
                    promoCode: promoDiscount ? promoCode.toUpperCase().trim() : undefined,
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                setError(data.error || 'Registration failed')
                setIsSubmitting(false)
                return
            }

            setRegistrationCode(data.registrationCode)
            setPlayerId(data.playerId)
            setCategoryName(data.categoryName)
            setFinalPrice(data.finalPrice)

            // If Xendit is enabled, redirect to payment
            if (tournament.xenditEnabled && data.finalPrice > 0) {
                const checkoutRes = await fetch('/api/checkout/xendit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventType: 'guest-tournament',
                        eventId: tournament.id,
                        registrationId: data.playerId,
                        payerEmail: email,
                        payerName: fullName,
                        amount: data.finalPrice,
                        currency: currencyCode,
                        redirectUrl: `${window.location.origin}/event/${eventSlug}/register`,
                    }),
                })
                const checkoutData = await checkoutRes.json()
                if (checkoutData.invoiceUrl) {
                    window.location.href = checkoutData.invoiceUrl
                    return
                } else {
                    setError(checkoutData.error || 'Failed to create payment link')
                }
            } else {
                // No payment needed — go to confirmation
                setStep('confirmation')
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // ========================
    // STEP RENDERERS
    // ========================

    // Step 1: Personal Info
    const renderInfoStep = () => (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Personal Information</h2>
                <p className="text-gray-500 text-sm">Enter your details to register for {tournament.name}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com" className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)}
                        placeholder="Enter your full name" className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Birthday <span className="text-red-500">*</span></label>
                    <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)}
                        className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Gender <span className="text-red-500">*</span></label>
                    <select value={gender} onChange={e => setGender(e.target.value)}
                        className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500">
                        {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Belt Rank <span className="text-red-500">*</span></label>
                    <select value={belt} onChange={e => setBelt(e.target.value)}
                        className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500">
                        {BELT_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Weight (kg) <span className="text-red-500">*</span></label>
                    <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                        placeholder="e.g. 65" step="0.1" className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Height (cm) <span className="text-red-500">*</span></label>
                    <input type="number" value={height} onChange={e => setHeight(e.target.value)}
                        placeholder="e.g. 170" step="0.1" className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                </div>

                {/* Country with search */}
                <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Country <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <input value={country || countrySearch}
                            onChange={e => { setCountrySearch(e.target.value); setCountry(''); setShowCountryDropdown(true) }}
                            onFocus={() => setShowCountryDropdown(true)}
                            placeholder="Search country..."
                            className="w-full h-11 px-4 pr-8 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                        {country && <button onClick={() => { setCountry(''); setCountrySearch('') }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400" /></button>}
                    </div>
                    {showCountryDropdown && filteredCountries.length > 0 && (
                        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {filteredCountries.slice(0, 20).map(c => (
                                <button key={c} type="button" onClick={() => { setCountry(c); setCountrySearch(''); setShowCountryDropdown(false) }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 transition-colors">{c}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Club Selection */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Club <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-3">
                    {(['search', 'independent', 'other'] as const).map(opt => (
                        <button key={opt} onClick={() => { setClubSelection(opt); setSelectedClubId(''); setClubNameOther('') }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${clubSelection === opt
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}>
                            {opt === 'search' ? 'Find Club' : opt === 'independent' ? 'Independent' : 'Other'}
                        </button>
                    ))}
                </div>

                {clubSelection === 'search' && (
                    <div className="relative">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input value={clubSearch} onChange={e => { setClubSearch(e.target.value); setShowClubDropdown(true) }}
                                onFocus={() => setShowClubDropdown(true)}
                                placeholder="Search clubs..."
                                className="w-full h-11 pl-10 pr-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                        </div>
                        {selectedClubId && (
                            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                                <CheckCircle2 className="w-4 h-4" />
                                {clubs.find(c => c.id === selectedClubId)?.name}
                                <button onClick={() => { setSelectedClubId(''); setClubSearch('') }} className="ml-auto"><X className="w-4 h-4" /></button>
                            </div>
                        )}
                        {showClubDropdown && clubSearch && filteredClubs.length > 0 && !selectedClubId && (
                            <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                {filteredClubs.slice(0, 15).map(c => (
                                    <button key={c.id} type="button" onClick={() => { setSelectedClubId(c.id); setClubSearch(c.name); setShowClubDropdown(false) }}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 transition-colors">{c.name}</button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {clubSelection === 'other' && (
                    <input value={clubNameOther} onChange={e => setClubNameOther(e.target.value)}
                        placeholder="Enter your club name"
                        className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500" />
                )}

                {clubSelection === 'independent' && (
                    <p className="text-sm text-gray-500 italic">You will be registered as an independent athlete.</p>
                )}
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

            <button onClick={() => { if (validateStep1()) { setStep('category'); detectCategory() } }}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                Next: Select Category <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    )

    // Step 2: Category Detection
    const renderCategoryStep = () => (
        <div className="space-y-6">
            <button onClick={() => setStep('info')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Event Selection</h2>
                <p className="text-gray-500 text-sm">Choose your event type and confirm your category</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['KYORUGI', 'POOMSAE'].map(type => (
                    <button key={type} onClick={() => { setEventType(type); setFinalPrice(resolveCategoryPrice(type, poomsaeSubtype)); detectCategory() }}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${eventType === type
                            ? (type === 'KYORUGI' ? 'border-red-600 bg-red-50' : 'border-purple-600 bg-purple-50')
                            : 'border-gray-200 hover:border-gray-300'
                            }`}>
                        <span className="block font-bold">{type === 'KYORUGI' ? 'Kyorugi' : 'Poomsae'}</span>
                        <span className="text-sm opacity-75">{type === 'KYORUGI' ? 'Sparring' : 'Forms'}</span>
                    </button>
                ))}
            </div>

            {eventType === 'POOMSAE' && (
                <div className="flex gap-2">
                    {['INDIVIDUAL', 'PAIR', 'TEAM'].map(sub => (
                        <button key={sub} onClick={() => { setPoomsaeSubtype(sub); setFinalPrice(resolveCategoryPrice('POOMSAE', sub)); detectCategory() }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border ${poomsaeSubtype === sub
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }`}>
                            {sub.charAt(0) + sub.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detected Category</label>
                    {isDetecting && <Loader2 className="w-4 h-4 text-red-500 animate-spin" />}
                </div>
                {detectedCategory ? (
                    <div>
                        <div className="text-xl font-bold text-gray-900">{detectedCategory}</div>
                        <div className="text-sm text-green-600 flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-4 h-4" /> Based on your profile
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <div className="text-amber-600 font-medium mb-1">{isDetecting ? 'Detecting...' : 'No Category Found'}</div>
                        {!isDetecting && <p className="text-sm text-gray-500">No matching category for your profile. Please contact the organizer.</p>}
                    </div>
                )}
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

            <button onClick={() => { if (detectedCategory) setStep('waiver'); else setError('No category detected') }}
                disabled={!detectedCategory || isDetecting}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                Next: Sign Waiver <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    )

    // Step 3: Waiver
    const renderWaiverStep = () => (
        <div className="space-y-6">
            <button onClick={() => setStep('category')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Waiver & Consent</h2>
                <p className="text-gray-500 text-sm">Please sign the waiver to proceed with registration</p>
            </div>

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-orange-900 mb-2">Digital Signature Required</h3>
                <p className="text-sm text-orange-700 mb-4">
                    By signing below, you acknowledge that you have read and agree to the event waiver,
                    release of liability, and terms of participation.
                </p>

                <div className="border-2 border-dashed border-orange-300 rounded-xl bg-white overflow-hidden mb-4">
                    <SignatureCanvas
                        ref={sigCanvas}
                        penColor="black"
                        canvasProps={{ className: 'w-full h-48 cursor-crosshair' }}
                        backgroundColor="rgba(255, 255, 255, 1)"
                    />
                </div>

                {error && <p className="text-red-600 text-sm mb-3 font-medium">{error}</p>}

                <div className="flex gap-3 justify-center">
                    <button onClick={() => sigCanvas.current?.clear()}
                        className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                        Clear
                    </button>
                    <button onClick={() => {
                        if (sigCanvas.current?.isEmpty()) { setError('Please sign the waiver'); return }
                        setSignatureData(sigCanvas.current?.toDataURL() || null)
                        setError('')
                        setStep('payment')
                    }}
                        className="px-6 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 font-medium shadow-sm">
                        Confirm Signature
                    </button>
                </div>
            </div>
        </div>
    )

    // Step 4: Payment
    const renderPaymentStep = () => (
        <div className="space-y-6">
            <button onClick={() => setStep('waiver')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Review & Pay</h2>
                <p className="text-gray-500 text-sm">Review your registration details and complete payment</p>
            </div>

            {/* Summary */}
            <div className="bg-slate-900 rounded-xl p-6 text-white">
                <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold mb-4">Registration Summary</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Name</span><span className="font-semibold">{fullName}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="font-semibold">{email}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Category</span><span className="font-semibold">{detectedCategory}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Event Type</span><span className="font-semibold">{eventType}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Country</span><span className="font-semibold">{country}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Club</span>
                        <span className="font-semibold">
                            {clubSelection === 'independent' ? 'Independent' : clubSelection === 'other' ? clubNameOther : clubs.find(c => c.id === selectedClubId)?.name || '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Promo Code */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Promo Code (optional)</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
                            placeholder="Enter code" className="w-full h-11 pl-10 pr-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 uppercase font-mono" />
                    </div>
                    <button onClick={validatePromo} disabled={promoValidating || !promoCode.trim()}
                        className="px-4 h-11 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                        {promoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                    </button>
                </div>
                {promoDiscount && <p className="text-green-600 text-sm mt-1 font-medium">✓ {promoDiscount.type === 'PERCENTAGE' ? `${promoDiscount.value}% off` : `₱${promoDiscount.value} off`} applied!</p>}
                {promoError && <p className="text-red-600 text-sm mt-1">{promoError}</p>}
            </div>

            {/* Price */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-sm text-gray-500">Registration Fee</div>
                        {tournament.isEarlyBird && <div className="text-xs text-green-600 font-semibold">Early Bird Pricing</div>}
                    </div>
                    <div className="text-right">
                        {promoDiscount && <div className="text-sm text-gray-400 line-through">{currencySymbol}{tournament.currentPrice.toLocaleString()}</div>}
                        <div className="text-3xl font-black text-gray-900">{currencySymbol}{finalPrice.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

            <button onClick={handleSubmit} disabled={isSubmitting}
                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> :
                    tournament.xenditEnabled && finalPrice > 0 ? 'Proceed to Payment' : 'Complete Registration'}
            </button>
        </div>
    )

    // Step 5: Confirmation
    const renderConfirmationStep = () => (
        <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {paymentConfirmed ? '✅ Payment Confirmed!' : 'Registration Successful!'}
                </h2>
                <p className="text-gray-600">
                    You have been registered for <span className="font-semibold text-gray-900">{tournament.name}</span>
                </p>
            </div>

            {registrationCode && (
                <div className="bg-slate-900 rounded-xl p-6 text-white">
                    <div className="text-sm text-slate-400 mb-2">Your Registration Code</div>
                    <div className="text-3xl font-mono font-bold tracking-wider">{registrationCode}</div>
                    <p className="text-xs text-slate-400 mt-3">Save this code — you'll need it for check-in at the event.</p>
                </div>
            )}

            {signatureData && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Download Your Waiver</h3>
                    <PDFDownloadLink
                        document={<WaiverDocument athleteName={fullName} tournamentName={tournament.name} registrationDate={new Date()} signatureImage={signatureData} />}
                        fileName="Waiver.pdf"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        {({ loading }: { loading: boolean }) => (loading ? 'Generating PDF...' : 'Download Waiver PDF')}
                    </PDFDownloadLink>
                </div>
            )}

            <div className="flex gap-4 justify-center">
                <a href={`/event/${eventSlug}/status`}
                    className="px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors">
                    Check Registration Status
                </a>
                <a href={`/event/${eventSlug}`}
                    className="px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors">
                    Back to Event
                </a>
            </div>
        </div>
    )

    // ========================
    // MAIN RENDER
    // ========================
    const stepLabels: Record<Step, string> = {
        info: 'Personal Info',
        category: 'Category',
        waiver: 'Waiver',
        payment: 'Review & Pay',
        confirmation: 'Done',
    }

    const steps: Step[] = ['info', 'category', 'waiver', 'payment', 'confirmation']
    const currentIndex = steps.indexOf(step)

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-900 mb-2">{tournament.name}</h1>
                    <p className="text-gray-500">Guest Registration</p>
                </div>

                {/* Progress Steps */}
                {step !== 'confirmation' && (
                    <div className="flex items-center justify-center gap-1 mb-8">
                        {steps.filter(s => s !== 'confirmation').map((s, i) => (
                            <div key={s} className="flex items-center gap-1">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < currentIndex ? 'bg-green-500 text-white'
                                        : i === currentIndex ? 'bg-red-600 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {i < currentIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                                </div>
                                {i < 3 && <div className={`w-8 h-0.5 ${i < currentIndex ? 'bg-green-500' : 'bg-gray-200'}`} />}
                            </div>
                        ))}
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                    {step === 'info' && renderInfoStep()}
                    {step === 'category' && renderCategoryStep()}
                    {step === 'waiver' && renderWaiverStep()}
                    {step === 'payment' && renderPaymentStep()}
                    {step === 'confirmation' && renderConfirmationStep()}
                </div>
            </div>
        </div>
    )
}
