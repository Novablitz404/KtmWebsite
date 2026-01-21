'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { registerForTournamentAuto } from '@/app/actions'
import WaiverDocument from '@/components/WaiverDocument'
import SignatureCanvas from 'react-signature-canvas'

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
    }
    user: {
        id: string
        name: string | null
        clubName: string | null
        // ... existing user props ...
        gender: string | null
        belt: string | null
        weight: number | null
        birthDate: Date | null
        role: string
    }
    placement: {
        // ... existing placement props ...
        division: { id: string; name: string }
        weightCategory: { id: string; name: string }
        categoryName: string
    } | null
    poomsaeCategories: Category[]
    existingRegistrations?: ExistingRegistration[]
}
export default function RegisterConfirm({
    tournament,
    user,
    placement,
    poomsaeCategories = [],
    existingRegistrations = []
}: RegisterConfirmProps) {
    // ... existing hooks ...
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    // Signature State
    const [signatureData, setSignatureData] = useState<string | null>(null)
    const sigCanvas = useRef<SignatureCanvas>(null)

    // ... existing selection state ...
    const kyorugiRegistered = placement && existingRegistrations.some(r => r.category.name === placement.categoryName)
    const [selectedOption, setSelectedOption] = useState<string>(
        (placement && !kyorugiRegistered) ? 'kyorugi' : 'poomsae'
    )

    // ... existing helpers ...
    const age = user.birthDate
        ? Math.floor((Date.now() - new Date(user.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0

    const handleRedirect = () => {
        if (user.role === 'ATHLETE') {
            router.push('/athlete')
        } else {
            router.push(`/tournaments?registered=true`)
        }
    }
    // ... existing handleRegister ...
    const handleRegister = async () => {
        setSubmitting(true)
        setError('')

        // Determine registration details
        let division = ''
        let categoryName = ''

        if (selectedOption === 'kyorugi' && placement) {
            division = placement.division.name
            categoryName = placement.categoryName
        } else if (selectedOption === 'poomsae') {
            division = 'Poomsae'
            categoryName = 'Poomsae Open'
        } else {
            setError('Please select a category to register for.')
            setSubmitting(false)
            return
        }

        try {
            const result = await registerForTournamentAuto({
                tournamentId: tournament.id,
                userId: user.id,
                name: user.name!,
                gender: user.gender!,
                belt: user.belt!,
                weight: user.weight!,
                clubName: user.clubName!,
                division: division,
                categoryName: categoryName
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

    const isRegisteredForPoomsae = existingRegistrations.some(r => r.category.type === 'POOMSAE')

    if (success) {
        return (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl w-full mx-auto p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
                <p className="text-gray-600 mb-8">
                    You have successfully registered for <span className="font-semibold text-gray-900">{tournament.name}</span>.
                </p>

                <div className="space-y-6">
                    {!signatureData ? (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-orange-900 mb-2">Digital Signature Required</h3>
                            <p className="text-sm text-orange-700 mb-4">
                                Please sign below to acknowledge the waiver. This signature will be added to your generated PDF document.
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
                            <p className="text-sm text-blue-700 mb-4">
                                Your waiver has been digitally signed. Please download, print, and present it at the venue.
                            </p>

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
                                    fileName={`Waiver_${user.name?.replace(/\s+/g, '_')}_${tournament.name.replace(/\s+/g, '_')}.pdf`}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >

                                    {({ blob, url, loading, error }) => (
                                        loading ? 'Generating PDF...' : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 01-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Download Waiver PDF
                                            </>
                                        )
                                    )}
                                </PDFDownloadLink>
                            </div>
                            <div className="mt-4">
                                <button
                                    onClick={() => setSignatureData(null)}
                                    className="text-xs text-blue-500 hover:text-blue-700 underline"
                                >
                                    Re-sign document
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            onClick={handleRedirect}
                            className="text-gray-500 hover:text-gray-900 font-medium text-sm"
                        >
                            {signatureData ? "Done - Go to Dashboard" : "Skip Signature & Go to Dashboard"}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl w-full mx-auto">
            {/* Back Button - Fixed Top Left */}
            <button
                onClick={() => router.back()}
                className="fixed top-6 left-6 z-50 inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium transition-colors bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-sm border border-gray-200 hover:bg-white"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full">
                {/* Header / Profile Summary */}
                <div className="relative border-b border-slate-700 p-8 text-white overflow-hidden min-h-[220px] flex flex-col justify-end">
                    {tournament.headerImageUrl ? (
                        <>
                            <div className="absolute inset-0">
                                <img
                                    src={tournament.headerImageUrl}
                                    alt={tournament.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-[2px]" />
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                            <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl transform translate-x-12 -translate-y-12 select-none pointer-events-none">
                                KTM
                            </div>
                        </div>
                    )}

                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold tracking-tight mb-6 text-white shadow-black/20 drop-shadow-md">Confirm Registration</h2>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-8 text-sm">
                            <div>
                                <p className="text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">Athlete</p>
                                <p className="font-semibold text-white text-base">{user.name}</p>
                            </div>
                            <div>
                                <p className="text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">Club</p>
                                <p className="font-semibold text-white text-base">{user.clubName}</p>
                            </div>
                            <div>
                                <p className="text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">Belt</p>
                                <p className="font-semibold text-white text-base">{user.belt}</p>
                            </div>
                            <div>
                                <p className="text-slate-300 text-xs uppercase tracking-wider font-semibold mb-1">Division</p>
                                <p className="font-semibold text-white text-base">{age} yrs • {user.gender} • {user.weight}kg</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-gray-50/50">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">1</span>
                        Select Your Event
                    </h3>

                    {/* Existing Registrations Warning - Cleaner Look */}
                    {existingRegistrations.length > 0 && (
                        <div className="mb-6 bg-emerald-50/80 border border-emerald-200 rounded-lg px-4 py-3 flex items-start gap-3">
                            <div className="text-emerald-600 mt-0.5">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-emerald-900">You are already registered for:</p>
                                <ul className="text-sm text-emerald-700 mt-1 space-y-0.5">
                                    {existingRegistrations.map(r => (
                                        <li key={r.category.id}>• {r.category.name} <span className="opacity-75">({r.registrationStatus})</span></li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {/* Kyorugi Option */}
                        {placement && (
                            <label className={`
                            group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                            ${selectedOption === 'kyorugi'
                                    ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600/10'
                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}
                            ${kyorugiRegistered ? 'opacity-60 cursor-not-allowed grayscale-[0.5]' : ''}
                        `}>
                                <div className="flex items-center h-5">
                                    <input
                                        type="radio"
                                        name="categoryType"
                                        value="kyorugi"
                                        checked={selectedOption === 'kyorugi'}
                                        onChange={() => setSelectedOption('kyorugi')}
                                        disabled={kyorugiRegistered || false}
                                        className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 transition-colors"
                                    />
                                </div>
                                <div className="ml-4 flex-1">
                                    <div className="flex justify-between items-center">
                                        <span className={`block font-semibold ${selectedOption === 'kyorugi' ? 'text-indigo-900' : 'text-gray-900'}`}>
                                            Kyorugi (Sparring)
                                        </span>
                                        {kyorugiRegistered && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                Registered
                                            </span>
                                        )}
                                    </div>
                                    <span className={`block text-sm mt-0.5 ${selectedOption === 'kyorugi' ? 'text-indigo-700' : 'text-gray-500'}`}>
                                        {placement.division.name} • {placement.weightCategory.name}
                                    </span>
                                </div>
                            </label>
                        )}

                        {/* Poomsae Option */}
                        <label className={`
                         group relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                         ${selectedOption === 'poomsae'
                                ? 'border-purple-600 bg-purple-50/50 shadow-sm ring-1 ring-purple-600/10'
                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}
                         ${isRegisteredForPoomsae ? 'opacity-60 grayscale-[0.5]' : ''}
                    `}>
                            <div className="flex items-center h-5">
                                <input
                                    type="radio"
                                    name="categoryType"
                                    value="poomsae"
                                    checked={selectedOption === 'poomsae'}
                                    onChange={() => setSelectedOption('poomsae')}
                                    className="h-5 w-5 text-purple-600 border-gray-300 focus:ring-purple-500 transition-colors"
                                />
                            </div>
                            <div className="ml-4 flex-1">
                                <div className="flex justify-between items-center">
                                    <span className={`block font-semibold ${selectedOption === 'poomsae' ? 'text-purple-900' : 'text-gray-900'}`}>
                                        Poomsae (Forms)
                                    </span>
                                    {isRegisteredForPoomsae && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            Registered
                                        </span>
                                    )}
                                </div>
                                <span className={`block text-sm mt-0.5 ${selectedOption === 'poomsae' ? 'text-purple-700' : 'text-gray-500'}`}>
                                    Standard & Freestyle Categories
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-pulse">
                            <div className="text-red-600 mt-0.5">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-sm text-red-700 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Submit Action */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <button
                            onClick={handleRegister}
                            disabled={submitting || !selectedOption}
                            className={`
                            w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all duration-200
                            ${submitting || !selectedOption
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                                }
                        `}
                        >
                            {submitting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                'Confirm Registration'
                            )}
                        </button>
                        <p className="text-center text-xs text-gray-400 mt-4">
                            By registering, you agree to the tournament rules and waiver.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
