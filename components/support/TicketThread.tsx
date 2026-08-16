'use client'

import { useState } from 'react'
import { ArrowLeft, Loader2, Send, ShieldCheck, User as UserIcon } from 'lucide-react'
import { replyToTicket } from '@/app/actions/support'

interface ThreadMessage {
    id: string
    authorType: string
    authorName: string | null
    body: string
    createdAt: Date | string
}

interface TicketThreadTicket {
    id: string
    subject: string
    status: string
    category: string | null
    createdAt: Date | string
    messages: ThreadMessage[]
}

interface TicketThreadProps {
    ticket: TicketThreadTicket
    canReply: boolean
    onBack?: () => void
    onReplied?: () => void
}

const STATUS_STYLES: Record<string, string> = {
    OPEN: 'bg-blue-50 text-blue-600 border-blue-100',
    IN_PROGRESS: 'bg-amber-50 text-amber-600 border-amber-100',
    RESOLVED: 'bg-green-50 text-green-600 border-green-100',
    CLOSED: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function TicketThread({ ticket, canReply, onBack, onReplied }: TicketThreadProps) {
    const [reply, setReply] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleReply = async () => {
        if (!reply.trim()) return
        setLoading(true)
        setError('')
        try {
            await replyToTicket(ticket.id, reply)
            setReply('')
            onReplied?.()
        } catch (err: any) {
            setError(err.message || 'Failed to send reply.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            {onBack && (
                <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    <ArrowLeft size={14} /> Back to tickets
                </button>
            )}

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">{ticket.subject}</h3>
                    {ticket.category && <p className="text-xs text-gray-400 mt-0.5">{ticket.category}</p>}
                </div>
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border flex-shrink-0 ${STATUS_STYLES[ticket.status] || STATUS_STYLES.OPEN}`}>
                    {ticket.status.replace('_', ' ')}
                </span>
            </div>

            <div className="space-y-3">
                {ticket.messages.map(msg => {
                    const isAdmin = msg.authorType === 'ADMIN'
                    return (
                        <div key={msg.id} className={`flex gap-3 ${isAdmin ? '' : 'flex-row-reverse'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                {isAdmin ? <ShieldCheck size={15} /> : <UserIcon size={15} />}
                            </div>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isAdmin ? 'bg-gray-50 border border-gray-100 text-gray-800' : 'bg-red-600 text-white'}`}>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                                <p className={`text-[10px] mt-1.5 ${isAdmin ? 'text-gray-400' : 'text-red-100'}`}>
                                    {isAdmin ? (msg.authorName || 'Support Team') : 'You'} · {new Date(msg.createdAt).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {canReply && ticket.status !== 'CLOSED' && (
                <div className="pt-2 space-y-2">
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <div className="flex gap-2">
                        <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            rows={2}
                            placeholder="Type a reply..."
                            className="flex-1 px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none transition-all resize-none"
                        />
                        <button
                            onClick={handleReply}
                            disabled={loading || !reply.trim()}
                            className="flex items-center justify-center gap-2 px-4 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
