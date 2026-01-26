'use client'

import { useState } from 'react'
import { Megaphone, Plus, X, AlertTriangle, Info, Bell, Trash2, ListFilter } from 'lucide-react'
import GlobalDropdown from '@/components/GlobalDropdown'
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
    const [filterPriority, setFilterPriority] = useState<string>('ALL')
    const [createPriority, setCreatePriority] = useState<string>('NORMAL')

    const filteredAnnouncements = announcements.filter(a =>
        filterPriority === 'ALL' ? true : a.priority === filterPriority
    )

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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-red-50/50 to-white">
                    <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-red-600" />
                        <h3 className="font-bold text-gray-900 text-sm">Announcements</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <GlobalDropdown
                            trigger={
                                <button className="p-1.5 rounded-lg text-gray-500 hover:bg-white hover:text-red-600 transition-colors">
                                    <ListFilter className="w-4 h-4" />
                                </button>
                            }
                            align="right"
                            width="w-40"
                            items={[
                                { label: 'All Priorities', onClick: () => setFilterPriority('ALL'), icon: <Bell className="w-3 h-3" /> },
                                { label: 'Urgent Only', onClick: () => setFilterPriority('URGENT'), icon: <AlertTriangle className="w-3 h-3 text-red-500" /> },
                                { label: 'High Priority', onClick: () => setFilterPriority('HIGH'), icon: <AlertTriangle className="w-3 h-3 text-amber-500" /> },
                                { label: 'Normal / Low', onClick: () => setFilterPriority('NORMAL'), icon: <Info className="w-3 h-3 text-blue-500" /> }
                            ]}
                        />
                        <button
                            onClick={() => setShowModal(true)}
                            className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                    {filteredAnnouncements.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No announcements found</p>
                    ) : (
                        filteredAnnouncements.map(a => {
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">New Announcement</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    name="title"
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    placeholder="Announcement title"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                                <textarea
                                    name="content"
                                    required
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                    placeholder="Announcement details..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                    <GlobalDropdown
                                        name="priority"
                                        value={createPriority}
                                        onChange={setCreatePriority}
                                        fullWidth
                                        options={[
                                            { label: 'Low', value: 'LOW', icon: <Info className="w-4 h-4 text-gray-400 group-hover:text-gray-500" /> },
                                            { label: 'Normal', value: 'NORMAL', icon: <Bell className="w-4 h-4 text-blue-500 group-hover:text-blue-600" /> },
                                            { label: 'High', value: 'HIGH', icon: <AlertTriangle className="w-4 h-4 text-amber-500 group-hover:text-amber-600" /> },
                                            { label: 'Urgent', value: 'URGENT', icon: <AlertTriangle className="w-4 h-4 text-red-500 group-hover:text-red-600" /> }
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                                    <input
                                        name="expiresAt"
                                        type="date"
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Announcement'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
