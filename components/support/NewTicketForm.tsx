'use client'

import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { createSupportTicket } from '@/app/actions/support'
import GlobalDropdown from '@/components/GlobalDropdown'

const CATEGORIES = ['Account Access', 'Payment', 'Bug Report', 'Other']

interface NewTicketFormProps {
    mode: 'guest' | 'user'
    defaultName?: string
    defaultEmail?: string
    onSuccess: (ticketId: string) => void
}

export default function NewTicketForm({ mode, defaultName, defaultEmail, onSuccess }: NewTicketFormProps) {
    const [name, setName] = useState(defaultName || '')
    const [email, setEmail] = useState(defaultEmail || '')
    const [category, setCategory] = useState(CATEGORIES[0])
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (mode === 'guest' && (!name.trim() || !email.trim())) {
            setError('Please fill in your name and email.')
            return
        }
        if (!subject.trim() || !message.trim()) {
            setError('Please fill in the subject and message.')
            return
        }

        setLoading(true)
        try {
            const result = await createSupportTicket({
                subject,
                category,
                message,
                guestName: mode === 'guest' ? name : undefined,
                guestEmail: mode === 'guest' ? email : undefined,
            })
            onSuccess(result.ticketId)
        } catch (err: any) {
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg px-4 py-3">
                    {error}
                </div>
            )}

            {mode === 'guest' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Your Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none transition-all"
                            placeholder="Full name"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none transition-all"
                            placeholder="name@example.com"
                        />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                <GlobalDropdown
                    options={CATEGORIES}
                    value={category}
                    onChange={setCategory}
                    fullWidth
                />
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none transition-all"
                    placeholder="Briefly describe your issue"
                />
            </div>

            <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message</label>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none transition-all resize-none"
                    placeholder="Tell us what's going on..."
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {loading ? 'Sending...' : 'Submit Request'}
            </button>
        </form>
    )
}
