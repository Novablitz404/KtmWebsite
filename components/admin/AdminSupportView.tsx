'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, MessageSquare, Loader2 } from 'lucide-react'
import { getAllTickets, getTicketThread, updateTicketStatus } from '@/app/actions/support'
import TicketThread from '@/components/support/TicketThread'

type Ticket = Awaited<ReturnType<typeof getAllTickets>>[number]
type TicketDetail = Awaited<ReturnType<typeof getTicketThread>>

const STATUS_TABS = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const STATUS_STYLES: Record<string, string> = {
    OPEN: 'bg-blue-50 text-blue-600',
    IN_PROGRESS: 'bg-amber-50 text-amber-600',
    RESOLVED: 'bg-green-50 text-green-600',
    CLOSED: 'bg-gray-100 text-gray-500',
}

export default function AdminSupportView() {
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [search, setSearch] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [detail, setDetail] = useState<TicketDetail | null>(null)
    const [detailLoading, setDetailLoading] = useState(false)

    const loadTickets = useCallback(async () => {
        setLoading(true)
        const data = await getAllTickets({
            status: statusFilter === 'ALL' ? undefined : statusFilter,
            search: search || undefined,
        })
        setTickets(data)
        setLoading(false)
    }, [statusFilter, search])

    useEffect(() => {
        const timeout = setTimeout(loadTickets, 300)
        return () => clearTimeout(timeout)
    }, [loadTickets])

    const openTicket = async (id: string) => {
        setSelectedId(id)
        setDetailLoading(true)
        const thread = await getTicketThread(id)
        setDetail(thread)
        setDetailLoading(false)
    }

    const refreshDetail = async () => {
        if (!selectedId) return
        const thread = await getTicketThread(selectedId)
        setDetail(thread)
        loadTickets()
    }

    const handleStatusChange = async (status: string) => {
        if (!selectedId) return
        await updateTicketStatus(selectedId, status)
        refreshDetail()
    }

    return (
        <div className="h-full flex">
            {/* Ticket List */}
            <div className="w-full md:w-96 flex-shrink-0 border-r border-gray-200 flex flex-col h-full bg-white">
                <div className="p-4 border-b border-gray-100 space-y-3">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tickets..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-300 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-1 overflow-x-auto">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setStatusFilter(tab)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${
                                    statusFilter === tab ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                {tab.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
                    ) : tickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">
                            <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No tickets found.</p>
                        </div>
                    ) : (
                        tickets.map(ticket => (
                            <button
                                key={ticket.id}
                                onClick={() => openTicket(ticket.id)}
                                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${selectedId === ticket.id ? 'bg-red-50/50' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</p>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide flex-shrink-0 ${STATUS_STYLES[ticket.status]}`}>
                                        {ticket.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                    {ticket.user?.name || ticket.guestName || 'Guest'} · {ticket.user?.email || (ticket as any).guestEmail}
                                </p>
                                {ticket.organization?.name && (
                                    <p className="text-[10px] text-gray-400 mt-1">{ticket.organization.name}</p>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Ticket Detail */}
            <div className="hidden md:flex flex-1 flex-col h-full overflow-y-auto p-6">
                {!selectedId ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Select a ticket to view the conversation.</p>
                        </div>
                    </div>
                ) : detailLoading || !detail ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                ) : (
                    <div className="max-w-2xl w-full mx-auto space-y-4">
                        <div className="flex items-center justify-end gap-2">
                            <label className="text-xs font-semibold text-gray-500">Status</label>
                            <select
                                value={detail.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
                            >
                                {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => (
                                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                        <TicketThread ticket={detail} canReply onReplied={refreshDetail} />
                    </div>
                )}
            </div>
        </div>
    )
}
