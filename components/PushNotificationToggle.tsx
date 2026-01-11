'use client'

import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushNotificationToggle() {
    const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications()

    if (!isSupported) {
        return null // Don't show toggle if not supported
    }

    const handleToggle = async () => {
        if (isSubscribed) {
            await unsubscribe()
        } else {
            await subscribe()
        }
    }

    return (
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-lg">
                    🔔
                </div>
                <div>
                    <h3 className="font-medium text-gray-900 text-sm">Push Notifications</h3>
                    <p className="text-xs text-gray-500">
                        {isSubscribed ? 'Enabled' : 'Get notified about updates'}
                    </p>
                </div>
            </div>
            <button
                onClick={handleToggle}
                disabled={isLoading}
                className={`relative w-12 h-7 rounded-full transition-colors ${isSubscribed ? 'bg-indigo-600' : 'bg-gray-200'
                    } ${isLoading ? 'opacity-50' : ''}`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${isSubscribed ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    )
}
