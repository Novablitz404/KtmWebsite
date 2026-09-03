'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { registerForTournament } from '@/app/actions'
import WaiverDocument from '@/components/WaiverDocument'
import SignatureCanvas from 'react-signature-canvas'
import { CheckCircle2 } from 'lucide-react'
import { calculateAge } from '@/lib/placement'
import GlobalDropdown from '@/components/GlobalDropdown'

// Dynamically import PDFDownloadLink to avoid SSR issues
const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => <span className="text-sm text-indigo-600">Generating waiver...</span>
    }
)

interface Category {
    id: string
    name: string
    type: string
    court: string | null
}

interface ExistingRegistration {
    category: Category
    division: string | null
    registrationStatus: string
}

interface RegisterConfirmProps {
    tournament: {
        id: string
        name: string
        headerImageUrl: string | null
        regularPrice: number | null
    }
    user: {
        id: string
        name: string | null
        clubName: string | null
        gender: string | null
        belt: string | null
        weight: number | null
        birthDate: Date | null
        height?: number | null
        role: string
    }
    categories: Category[]
    existingRegistrations?: ExistingRegistration[]
    availableTypes: string[]
    paymentConfirmed?: boolean
}

export default function RegisterConfirm({
    tournament,
    user,
    categories,
    existingRegistrations = [],
    availableTypes,
    paymentConfirmed = false
}: RegisterConfirmProps) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(paymentConfirmed)
    const [error, setError] = useState('')

    // Signature State
    const [signatureData, setSignatureData] = useState<string | null>(null)
    const sigCanvas = useRef<SignatureCanvas>(null)

    // Selection State
    const initialType = availableTypes.includes('KYORUGI') ? 'KYORUGI' : availableTypes[0] || 'KYORUGI'

    const [eventType, setEventType] = useState<string>(initialType)
    const [poomsaeSubtype, setPoomsaeSubtype] = useState<string>('INDIVIDUAL')
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

    const filteredCategories = categories.filter(c => c.type === eventType)
    const activeCategory = filteredCategories.find(c => c.id === selectedCategoryId) || null

    const age = user.birthDate
        ? calculateAge(user.birthDate)
        : 0

    const handleRedirect = () => {
        if (user.role === 'ATHLETE') {
            router.push('/athlete')
        } else {
            router.push(`/tournaments?registered=true`)
        }
    }

    const handleRegister = async () => {
        if (!activeCategory) {
            setError('No valid category found for your profile.')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            const result = await registerForTournament({
                categoryId: activeCategory.id,
                userId: user.id,
                name: user.name!,
                gender: user.gender!,
                belt: user.belt!,
                weight: user.weight!,
                clubName: user.clubName!,
                poomsaeType: eventType === 'POOMSAE' ? poomsaeSubtype : 'INDIVIDUAL'
            })

            if (result.error) {
                setError(result.error)
            } else {
                setSuccess(true)
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const clearSignature = () => {
        sigCanvas.current?.clear()
    }

    const saveSignature = () => {
        if (sigCanvas.current?.isEmpty()) {
            setError('Please sign the waiver before continuing.')
            return
        }
        setSignatureData(sigCanvas.current?.toDataURL() || null)
        setError('')
    }

    if (success) {
        return (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl w-full mx-auto p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {paymentConfirmed ? '✅ Payment Confirmed!' : 'Registration Successful!'}
                </h2>
                <p className="text-gray-600 mb-2">
                    You have successfully registered for <span className="font-semibold text-gray-900">{tournament.name}</span>
                </p>
                {paymentConfirmed && (
                    <p className="text-sm text-green-600 font-medium mb-4">
                        💰 Your payment has been received. Please sign the waiver below to complete your registration.
                    </p>
                )}

                <div className="space-y-6">
                    {!signatureData ? (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-orange-900 mb-2">Digital Signature Required</h3>
                            <p className="text-sm text-orange-700 mb-4">
                                Please sign below to acknowledge the waiver.
                            </p>

                            <div className="border-2 border-dashed border-orange-300 rounded-xl bg-white overflow-hidden mb-4">
                                <SignatureCanvas
                                    ref={sigCanvas}
                                    penColor="black"
                                    canvasProps={{
                                        className: 'w-full h-80 cursor-crosshair'
                                    }}
                                    backgroundColor="rgba(255, 255, 255, 1)"
                                />
                            </div>

                            {error && <p className="text-red-600 text-sm mb-3 font-medium">{error}</p>}

                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={clearSignature}
                                    className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={saveSignature}
                                    className="px-6 py-2 text-sm text-white bg-orange-600 rounded-lg hover:bg-orange-700 font-medium shadow-sm"
                                >
                                    Confirm Signature
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Download Your Waiver</h3>
                            <div className="inline-block">
                                <PDFDownloadLink
                                    document={
                                        <WaiverDocument
                                            athleteName={user.name || 'Athlete'}
                                            tournamentName={tournament.name}
                                            registrationDate={new Date()}
                                            signatureImage={signatureData}
                                        />
                                    }
                                    fileName={`Waiver.pdf`}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    {({ loading }) => (loading ? 'Generating PDF...' : 'Download Waiver PDF')}
                                </PDFDownloadLink>
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={handleRedirect}
                                    className="text-gray-500 hover:text-gray-900 font-medium text-sm"
                                >
                                    Done - Go to Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl w-full mx-auto">
            {/* Back Button */}
            <button
                onClick={() => router.back()}
                className="fixed top-6 left-6 z-50 inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-200 hover:bg-white"
            >
                Start Over
            </button>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full">
                {/* Header */}
                <div className="relative border-b border-slate-700 p-8 text-white bg-slate-900">
                    <h2 className="text-3xl font-bold tracking-tight mb-6">Confirm Registration</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-8 text-sm">
                        <div>
                            <p className="text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">Athlete</p>
                            <p className="font-semibold text-white text-base">{user.name}</p>
                        </div>
                        <div>
                            <p className="text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">Age & Gender</p>
                            <p className="font-semibold text-white text-base">{age} yrs • {user.gender}</p>
                        </div>
                        <div>
                            <p className="text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">Division</p>
                            <p className="font-semibold text-white text-base">
                                {age <= 5 ? 'Supertoddler' : age <= 8 ? 'Toddler' : age <= 11 ? 'Grade School' : age <= 14 ? 'Cadet' : age <= 17 ? 'Junior' : 'Senior'}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">
                                {age <= 11 ? 'Height' : 'Weight'}
                            </p>
                            <p className="font-semibold text-white text-base">
                                {age <= 11
                                    ? `${user.height || '—'} cm`
                                    : `${user.weight || '—'} kg`
                                }
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                                    {age <= 11 ? 'Height-based' : 'Weight-based'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        Event Selection
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                        {availableTypes.includes('KYORUGI') && (
                            <button
                                onClick={() => { setEventType('KYORUGI'); setSelectedCategoryId('') }}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${eventType === 'KYORUGI' ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <span className="block font-bold">Kyorugi</span>
                                <span className="text-sm opacity-75">Sparring matches</span>
                            </button>
                        )}
                        {availableTypes.includes('POOMSAE') && (
                            <button
                                onClick={() => { setEventType('POOMSAE'); setSelectedCategoryId('') }}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${eventType === 'POOMSAE' ? 'border-purple-600 bg-purple-50 text-purple-900' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <span className="block font-bold">Poomsae</span>
                                <span className="text-sm opacity-75">Forms competition</span>
                            </button>
                        )}
                        {availableTypes.includes('KYUKPA') && (
                            <button
                                onClick={() => { setEventType('KYUKPA'); setSelectedCategoryId('') }}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${eventType === 'KYUKPA' ? 'border-orange-600 bg-orange-50 text-orange-900' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <span className="block font-bold">Kyukpa</span>
                                <span className="text-sm opacity-75">Breaking</span>
                            </button>
                        )}
                    </div>

                    {eventType === 'POOMSAE' && (
                        <div className="mb-6">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Poomsae Type</label>
                            <div className="flex gap-2">
                                {['INDIVIDUAL', 'PAIR', 'TEAM'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setPoomsaeSubtype(type)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium border ${poomsaeSubtype === type ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        {type.charAt(0) + type.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Category Selection */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Category</label>
                        <GlobalDropdown
                            value={selectedCategoryId}
                            onChange={setSelectedCategoryId}
                            options={filteredCategories.map(c => ({ value: c.id, label: c.name }))}
                            label="Select category..."
                            fullWidth
                            searchable
                        />
                        {filteredCategories.length === 0 && (
                            <p className="text-sm text-amber-600 mt-3">
                                No categories available for {eventType}. Please check tournament guidelines.
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleRegister}
                        disabled={submitting || !activeCategory}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
                    >
                        {submitting ? 'Processing...' : 'Confirm Registration'}
                    </button>
                </div>
            </div>
        </div>
    )
}
