'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Megaphone, Plus, X, AlertTriangle, Info, Bell, Trash2 } from 'lucide-react'
import GlobalCalendar from '@/components/GlobalCalendar'
import { createAnnouncement, deleteAnnouncement } from '@/app/organization/actions'
import { toast } from 'sonner'

interface Announcement {
    id: string
    title: string
    content: string
    priority: string
    createdAt: Date
    expiresAt: Date | null
}

const priorityConfig: Record<string, { bg: string, text: string, icon: React.ReactNode }> = {
    LOW: { bg: 'bg-gray-50', text: 'text-gray-600', icon: <Info className="w-4 h-4" /> },
    NORMAL: { bg: 'bg-blue-50', text: 'text-blue-700', icon: <Bell className="w-4 h-4" /> },
    HIGH: { bg: 'bg-amber-50', text: 'text-amber-700', icon: <AlertTriangle className="w-4 h-4" /> },
    URGENT: { bg: 'bg-red-50', text: 'text-red-700', icon: <AlertTriangle className="w-4 h-4" /> }
}

export default function AnnouncementsWidget({ announcements: initialAnnouncements }: { announcements: Announcement[] }) {
    const [announcements, setAnnouncements] = useState(initialAnnouncements)
    const [showModal, setShowModal] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [createPriority, setCreatePriority] = useState<string>('NORMAL')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)

        const formData = new FormData(e.currentTarget)
        const result = await createAnnouncement(formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Announcement created!')
            setShowModal(false)
            setCreatePriority('NORMAL')
            // Refresh page to get new data
            window.location.reload()
        }
        setIsSubmitting(false)
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this announcement?')) return

        const result = await deleteAnnouncement(id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success('Announcement deleted')
            setAnnouncements(prev => prev.filter(a => a.id !== id))
        }
    }

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col flex-1 h-full">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50/50 to-white flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-red-600" />
                        <h3 className="font-bold text-gray-900 text-sm">Announcements</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowModal(true)}
                            className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                    {announcements.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No announcements found</p>
                    ) : (
                        announcements.map(a => {
                            const config = priorityConfig[a.priority] || priorityConfig.NORMAL
                            return (
                                <div key={a.id} className={`p-3 rounded-lg ${config.bg} group relative`}>
                                    <div className="flex items-start gap-2">
                                        <span className={config.text}>{config.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium ${config.text}`}>{a.title}</p>
                                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{a.content}</p>
                                            <p className="text-[10px] text-gray-400 mt-1">
                                                {new Date(a.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(a.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div
                        className="absolute inset-0"
                        onClick={() => setShowModal(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header - Red Gradient */}
                        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-red-600 to-red-700">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                    <Megaphone className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">New Announcement</h3>
                                    <p className="text-red-100 text-xs">Broadcast to your organization</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
                                <input
                                    name="title"
                                    type="text"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all text-sm"
                                    placeholder="Enter announcement title..."
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Content</label>
                                <textarea
                                    name="content"
                                    required
                                    rows={4}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all text-sm resize-none"
                                    placeholder="Write your announcement details..."
                                />
                            </div>

                            {/* Priority - Inline Pills */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                                <div className="flex gap-2">
                                    {[
                                        { value: 'LOW', label: 'Low', color: 'gray' },
                                        { value: 'NORMAL', label: 'Normal', color: 'blue' },
                                        { value: 'HIGH', label: 'High', color: 'amber' },
                                        { value: 'URGENT', label: 'Urgent', color: 'red' },
                                    ].map((p) => {
                                        const isSelected = createPriority === p.value
                                        const colorMap: Record<string, string> = {
                                            gray: isSelected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                                            blue: isSelected ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                                            amber: isSelected ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100',
                                            red: isSelected ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100',
                                        }
                                        return (
                                            <button
                                                key={p.value}
                                                type="button"
                                                onClick={() => setCreatePriority(p.value)}
                                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${colorMap[p.color]}`}
                                            >
                                                {p.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                <input type="hidden" name="priority" value={createPriority} />
                            </div>

                            {/* Expiry Date */}
                            <div>
                                <GlobalCalendar
                                    label="Expires (optional)"
                                    value={undefined}
                                    onChange={(date) => {
                                        const input = document.getElementsByName('expiresAt')[0] as HTMLInputElement
                                        if (input) input.value = format(date, 'yyyy-MM-dd')
                                    }}
                                    placeholder="Select expiry date..."
                                    className="w-full"
                                    fullWidth
                                />
                                <input type="hidden" name="expiresAt" />
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 text-sm shadow-lg shadow-red-600/20"
                            >
                                {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
