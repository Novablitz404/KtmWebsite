'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { getEventConfig } from '@/lib/event-config'
import { Search, Loader2, AlertCircle, CheckCircle2, Clock, XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Registration {
    registrationCode: string
    fullName: string
    category: string
    categoryType: string
    paymentStatus: string
    registrationStatus: string
    registeredAt: string
}

export default function EventStatusPage() {
    const params = useParams()
    const slug = params.slug as string

    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [registrations, setRegistrations] = useState<Registration[] | null>(null)
    const [searched, setSearched] = useState(false)

    const handleSearch = async () => {
        if (!email.trim() || !email.includes('@')) {
            setError('Please enter a valid email address')
            return
        }

        setLoading(true)
        setError('')
        setRegistrations(null)

        try {
            const config = getEventConfig(slug)
            if (!config) { setError('Event not found'); setLoading(false); return }

            const res = await fetch('/api/event/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), tournamentId: config.tournamentId }),
            })

            const data = await res.json()
            setSearched(true)

            if (data.found) {
                setRegistrations(data.registrations)
            } else {
                setRegistrations([])
            }
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const statusIcon = (status: string) => {
        switch (status) {
            case 'PAID': return <CheckCircle2 className="w-5 h-5 text-green-500" />
            case 'PENDING': return <Clock className="w-5 h-5 text-yellow-500" />
            case 'EXPIRED': return <XCircle className="w-5 h-5 text-red-500" />
            default: return <Clock className="w-5 h-5 text-gray-400" />
        }
    }

    const statusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PAID: 'bg-green-100 text-green-700 border-green-200',
            APPROVED: 'bg-green-100 text-green-700 border-green-200',
            PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            EXPIRED: 'bg-red-100 text-red-700 border-red-200',
            UNPAID: 'bg-gray-100 text-gray-700 border-gray-200',
        }
        return `inline-flex px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles.PENDING}`
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-xl mx-auto">
                <Link href={`/event/${slug}`} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back to Event
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Check Registration Status</h1>
                    <p className="text-gray-500">Enter the email you used during registration</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                    <div className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                placeholder="your@email.com"
                                className="w-full h-12 pl-11 pr-4 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            />
                        </div>
                        <button onClick={handleSearch} disabled={loading}
                            className="px-6 h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm disabled:opacity-50 flex items-center gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                        </button>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2 mb-6">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                        </div>
                    )}

                    {searched && registrations && registrations.length === 0 && (
                        <div className="text-center py-8">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-6 h-6 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No Registrations Found</h3>
                            <p className="text-sm text-gray-500">
                                No registrations found for <span className="font-semibold">{email}</span>
                            </p>
                        </div>
                    )}

                    {registrations && registrations.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                {registrations.length} Registration{registrations.length > 1 ? 's' : ''} Found
                            </h3>
                            {registrations.map((reg) => (
                                <div key={reg.registrationCode} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="font-bold text-gray-900">{reg.fullName}</div>
                                            <div className="text-sm text-gray-500">{reg.category} • {reg.categoryType}</div>
                                        </div>
                                        {statusIcon(reg.paymentStatus)}
                                    </div>

                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={statusBadge(reg.paymentStatus)}>Payment: {reg.paymentStatus}</span>
                                        <span className={statusBadge(reg.registrationStatus || 'PENDING')}>Status: {reg.registrationStatus || 'PENDING'}</span>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="text-xs text-gray-500 mb-1">Registration Code</div>
                                        <div className="text-lg font-mono font-bold text-gray-900 tracking-wider">{reg.registrationCode}</div>
                                    </div>

                                    <div className="text-xs text-gray-400 mt-3">
                                        Registered on {new Date(reg.registeredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
