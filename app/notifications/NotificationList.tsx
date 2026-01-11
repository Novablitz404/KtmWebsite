'use client'

import { useState, useEffect } from 'react'
import { getNotifications, markAsRead, markAllAsRead } from '@/app/actions/notifications'
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Notification {
    id: string
    title: string
    body: string
    url: string | null
    read: boolean
    createdAt: Date
}

export default function NotificationList({ userId }: { userId: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        fetchNotifications()
    }, [userId])

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications(userId)
            setNotifications(data)
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAsRead = async (id: string, url: string | null) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

        try {
            await markAsRead(id)
            if (url) {
                router.push(url)
            }
        } catch (error) {
            console.error('Failed to mark as read:', error)
        }
    }

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        try {
            await markAllAsRead(userId)
        } catch (error) {
            console.error('Failed to mark all as read:', error)
        }
    }

    const groupedNotifications = notifications.reduce((acc, notification) => {
        const date = new Date(notification.createdAt)
        let key = 'Earlier'
        if (isToday(date)) key = 'Today'
        else if (isYesterday(date)) key = 'Yesterday'

        if (!acc[key]) acc[key] = []
        acc[key].push(notification)
        return acc
    }, {} as Record<string, Notification[]>)

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
            </div>
        )
    }

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <span className="text-3xl">🔔</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
                <p className="text-gray-500 mt-2">You'll see updates here when they arrive.</p>
                <Link
                    href="/athlete/home"
                    className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium"
                >
                    Go Home
                </Link>
            </div>
        )
    }

    return (
        <div className="pb-20">
            {notifications.some(n => !n.read) && (
                <div className="flex justify-end px-4 py-2 sticky top-14 bg-white/95 backdrop-blur z-10 border-b border-gray-100">
                    <button
                        onClick={handleMarkAllRead}
                        className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
                    >
                        Mark all as read
                    </button>
                </div>
            )}

            <div className="space-y-6 p-4">
                {['Today', 'Yesterday', 'Earlier'].map(group => {
                    const groupNotes = groupedNotifications[group]
                    if (!groupNotes?.length) return null

                    return (
                        <div key={group}>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                                {group}
                            </h3>
                            <div className="space-y-3">
                                {groupNotes.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleMarkAsRead(notification.id, notification.url)}
                                        className={`bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-3 active:scale-[0.98] transition-all cursor-pointer ${!notification.read ? 'ring-1 ring-indigo-500/20 bg-indigo-50/10' : ''
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!notification.read ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {notification.title.includes('Approved') ? '✅' :
                                                notification.title.includes('Reminder') ? '⏰' :
                                                    notification.title.includes('Scheduled') ? '📅' : '📣'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                                                {notification.body}
                                            </p>
                                        </div>
                                        {!notification.read && (
                                            <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
