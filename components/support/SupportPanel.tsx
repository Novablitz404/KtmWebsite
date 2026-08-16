'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMyTickets, getTicketThread } from '@/app/actions/support'
import NewTicketForm from './NewTicketForm'
import TicketList from './TicketList'
import TicketThread from './TicketThread'

type View = 'list' | 'new' | 'thread'

interface SupportPanelProps {
    userName?: string | null
    userEmail?: string | null
}

export default function SupportPanel({ userName, userEmail }: SupportPanelProps) {
    const [view, setView] = useState<View>('list')
    const [tickets, setTickets] = useState<Awaited<ReturnType<typeof getMyTickets>>>([])
    const [activeTicket, setActiveTicket] = useState<Awaited<ReturnType<typeof getTicketThread>> | null>(null)
    const [loading, setLoading] = useState(true)

    const loadTickets = useCallback(async () => {
        const data = await getMyTickets()
        setTickets(data)
        setLoading(false)
        if (data.length === 0) setView('new')
        return data
    }, [])

    useEffect(() => {
        loadTickets()
    }, [loadTickets])

    const openTicket = async (id: string) => {
        const thread = await getTicketThread(id)
        setActiveTicket(thread)
        setView('thread')
    }

    const handleNewTicketSuccess = async (ticketId: string) => {
        await loadTickets()
        openTicket(ticketId)
    }

    const refreshActiveTicket = async () => {
        if (!activeTicket) return
        const thread = await getTicketThread(activeTicket.id)
        setActiveTicket(thread)
        loadTickets()
    }

    if (loading) {
        return <div className="py-10 text-center text-sm text-gray-400">Loading...</div>
    }

    if (view === 'thread' && activeTicket) {
        return (
            <TicketThread
                ticket={activeTicket}
                canReply
                onBack={() => setView('list')}
                onReplied={refreshActiveTicket}
            />
        )
    }

    if (view === 'new') {
        return (
            <div className="space-y-4">
                {tickets.length > 0 && (
                    <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                        ← Back to tickets
                    </button>
                )}
                <NewTicketForm
                    mode="user"
                    defaultName={userName || ''}
                    defaultEmail={userEmail || ''}
                    onSuccess={handleNewTicketSuccess}
                />
            </div>
        )
    }

    return <TicketList tickets={tickets} onSelect={openTicket} onNewTicket={() => setView('new')} />
}
