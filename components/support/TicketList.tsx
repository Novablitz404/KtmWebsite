'use client'

import { MessageSquare, Plus } from 'lucide-react'

interface TicketListItem {
    id: string
    subject: string
    status: string
    category: string | null
    updatedAt: Date | string
    messages: { body: string }[]
}

interface TicketListProps {
    tickets: TicketListItem[]
    onSelect: (ticketId: string) => void
    onNewTicket: () => void
}

const STATUS_STYLES: Record<string, string> = {
    OPEN: 'bg-blue-50 text-blue-600',
    IN_PROGRESS: 'bg-amber-50 text-amber-600',
    RESOLVED: 'bg-green-50 text-green-600',
    CLOSED: 'bg-gray-100 text-gray-500',
}

export default function TicketList({ tickets, onSelect, onNewTicket }: TicketListProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">My Tickets</h3>
                <button
                    onClick={onNewTicket}
                    className="flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
                >
                    <Plus size={15} /> New Ticket
                </button>
            </div>

            {tickets.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                    <MessageSquare size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No support tickets yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {tickets.map(ticket => (
                        <button
                            key={ticket.id}
                            onClick={() => onSelect(ticket.id)}
                            className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-red-200 hover:bg-red-50/30 transition-all"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</p>
                                    {ticket.messages[0] && (
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{ticket.messages[0].body}</p>
                                    )}
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${STATUS_STYLES[ticket.status] || STATUS_STYLES.OPEN}`}>
                                    {ticket.status.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2">
                                {new Date(ticket.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
