'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { getEventConfig } from '@/lib/event-config'
import { Loader2, AlertCircle, CheckCircle2, Plus, Trash2, ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'

const BELT_OPTIONS = ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Red', 'Maroon', 'Brown', 'Black']

interface Athlete {
    id: string
    email: string
    fullName: string
    birthday: string
    beltRank: string
    weightKg: string
    heightCm: string
    gender: string
    country: string
    eventType: string
}

const emptyAthlete = (id: string): Athlete => ({
    id, email: '', fullName: '', birthday: '', beltRank: 'White',
    weightKg: '', heightCm: '', gender: 'Male', country: '', eventType: 'KYORUGI'
})

export default function BulkRegisterPage() {
    const params = useParams()
    const slug = params.slug as string

    const [clubName, setClubName] = useState('')
    const [managerName, setManagerName] = useState('')
    const [managerEmail, setManagerEmail] = useState('')
    const [promoCode, setPromoCode] = useState('')
    const [athletes, setAthletes] = useState<Athlete[]>([emptyAthlete('1')])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [result, setResult] = useState<any>(null)

    const addAthlete = () => {
        setAthletes(prev => [...prev, emptyAthlete(Date.now().toString())])
    }

    const removeAthlete = (id: string) => {
        if (athletes.length <= 1) return
        setAthletes(prev => prev.filter(a => a.id !== id))
    }

    const updateAthlete = (id: string, field: keyof Athlete, value: string) => {
        setAthletes(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
    }

    const handleSubmit = async () => {
        // Validate
        if (!clubName.trim()) { setError('Club name is required'); return }
        if (!managerName.trim()) { setError('Manager name is required'); return }
        if (!managerEmail.includes('@')) { setError('Valid manager email is required'); return }

        for (const a of athletes) {
            if (!a.email || !a.fullName || !a.birthday || !a.weightKg || !a.heightCm || !a.country) {
                setError(`Please complete all fields for athlete: ${a.fullName || '(unnamed)'}`)
                return
            }
        }

        setIsSubmitting(true)
        setError('')

        try {
            const config = getEventConfig(slug)
            if (!config) { setError('Event not found'); return }

            const res = await fetch('/api/event/bulk-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournamentId: config.tournamentId,
                    clubName: clubName.trim(),
                    managerName: managerName.trim(),
                    managerEmail: managerEmail.trim(),
                    promoCode: promoCode.trim() || undefined,
                    athletes: athletes.map(a => ({
                        email: a.email.trim(),
                        fullName: a.fullName.trim(),
                        birthday: a.birthday,
                        beltRank: a.beltRank,
                        weightKg: a.weightKg,
                        heightCm: a.heightCm,
                        gender: a.gender,
                        country: a.country,
                        eventType: a.eventType,
                    })),
                }),
            })

            const data = await res.json()
            if (!res.ok) {
                setError(data.error || 'Bulk registration failed')
                return
            }

            // If payment is needed, redirect to Xendit
            if (data.totalAmount > 0) {
                const checkoutRes = await fetch('/api/checkout/xendit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventType: 'bulk-registration',
                        eventId: config.tournamentId,
                        registrationId: data.bulkRegistrationId,
                        payerEmail: managerEmail,
                        payerName: managerName,
                        redirectUrl: `${window.location.origin}/event/${slug}/bulk-register`,
                    }),
                })
                const checkoutData = await checkoutRes.json()
                if (checkoutData.invoiceUrl) {
                    window.location.href = checkoutData.invoiceUrl
                    return
                }
            }

            setResult(data)
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // SUCCESS VIEW
    if (result) {
        return (
            <div className="min-h-screen bg-gray-50 py-12 px-4">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bulk Registration Complete!</h1>
                        <p className="text-gray-500 mb-6">{result.totalAthletes} athletes registered for {clubName}</p>

                        <div className="bg-slate-900 rounded-xl p-6 text-white text-left mb-6">
                            <div className="text-sm text-slate-400 mb-3">Total Amount: <span className="text-2xl font-bold text-white">₱{result.totalAmount?.toLocaleString()}</span></div>
                            <div className="space-y-2">
                                {result.registrations?.map((r: any) => (
                                    <div key={r.registrationCode} className="flex justify-between items-center py-2 border-b border-slate-700 last:border-0">
                                        <div>
                                            <div className="font-semibold">{r.fullName}</div>
                                            <div className="text-sm text-slate-400">{r.category}</div>
                                        </div>
                                        <div className="font-mono text-sm text-slate-300">{r.registrationCode}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Link href={`/event/${slug}`}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800">
                            Back to Event
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    // FORM VIEW
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <Link href={`/event/${slug}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back to Event
                </Link>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold mb-3">
                        <Users className="w-4 h-4" /> Club Bulk Registration
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Register Your Team</h1>
                    <p className="text-gray-500">Register multiple athletes from your club at once</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
                    {/* Club Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Club Name <span className="text-red-500">*</span></label>
                            <input value={clubName} onChange={e => setClubName(e.target.value)}
                                placeholder="Enter club name" className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Manager Name <span className="text-red-500">*</span></label>
                            <input value={managerName} onChange={e => setManagerName(e.target.value)}
                                placeholder="Your name" className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Manager Email <span className="text-red-500">*</span></label>
                            <input type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)}
                                placeholder="your@email.com" className="w-full h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500" />
                        </div>
                    </div>

                    {/* Promo Code */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Promo Code (optional)</label>
                        <input value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
                            placeholder="EARLYBIRD20" className="w-full sm:w-64 h-11 px-4 rounded-lg bg-gray-50 border border-gray-200 text-sm font-mono uppercase focus:outline-none focus:border-red-500" />
                    </div>

                    {/* Athletes Table */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-gray-900">Athletes ({athletes.length})</h3>
                            <button onClick={addAthlete} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-semibold">
                                <Plus className="w-4 h-4" /> Add Athlete
                            </button>
                        </div>

                        <div className="space-y-4">
                            {athletes.map((athlete, index) => (
                                <div key={athlete.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-gray-500">Athlete #{index + 1}</span>
                                        {athletes.length > 1 && (
                                            <button onClick={() => removeAthlete(athlete.id)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <input value={athlete.fullName} onChange={e => updateAthlete(athlete.id, 'fullName', e.target.value)}
                                            placeholder="Full Name *" className="h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm col-span-2" />
                                        <input type="email" value={athlete.email} onChange={e => updateAthlete(athlete.id, 'email', e.target.value)}
                                            placeholder="Email *" className="h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm col-span-2" />
                                        <input type="date" value={athlete.birthday} onChange={e => updateAthlete(athlete.id, 'birthday', e.target.value)}
                                            className="h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm" />
                                        <select value={athlete.gender} onChange={e => updateAthlete(athlete.id, 'gender', e.target.value)}
                                            className="h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                        <select value={athlete.beltRank} onChange={e => updateAthlete(athlete.id, 'beltRank', e.target.value)}
                                            className="h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm">
                                            {BELT_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                        <select value={athlete.eventType} onChange={e => updateAthlete(athlete.id, 'eventType', e.target.value)}
                                            className="h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm">
                                            <option value="KYORUGI">Kyorugi</option>
                                            <option value="POOMSAE">Poomsae</option>
                                        </select>
                                        <input type="number" value={athlete.weightKg} onChange={e => updateAthlete(athlete.id, 'weightKg', e.target.value)}
                                            placeholder="Weight (kg) *" step="0.1" className="h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm" />
                                        <input type="number" value={athlete.heightCm} onChange={e => updateAthlete(athlete.id, 'heightCm', e.target.value)}
                                            placeholder="Height (cm) *" step="0.1" className="h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm" />
                                        <input value={athlete.country} onChange={e => updateAthlete(athlete.id, 'country', e.target.value)}
                                            placeholder="Country *" className="h-10 px-3 rounded-lg bg-white border border-gray-200 text-sm col-span-2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                        </div>
                    )}

                    <button onClick={handleSubmit} disabled={isSubmitting}
                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                        {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> :
                            `Register ${athletes.length} Athlete${athletes.length > 1 ? 's' : ''} & Pay`}
                    </button>
                </div>
            </div>
        </div>
    )
}
