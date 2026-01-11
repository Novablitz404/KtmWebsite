/// <reference lib="webworker" />
export { }

// Handle push events
self.addEventListener('install', (event) => {
    (self as unknown as ServiceWorkerGlobalScope).skipWaiting()
})

self.addEventListener('activate', (event) => {
    const sw = self as unknown as ServiceWorkerGlobalScope
    (event as ExtendableEvent).waitUntil(sw.clients.claim())
})

self.addEventListener('push', (event) => {
    const pushEvent = event as PushEvent
    if (!pushEvent.data) return

    let data
    try {
        data = pushEvent.data.json()
    } catch {
        // Fallback for non-JSON payloads (e.g. testing)
        data = {
            title: 'KTM App',
            body: pushEvent.data.text()
        }
    }

    const options = {
        body: data.body || '',
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/badge-72x72.png',
        tag: data.tag || 'ktm-notification',
        data: {
            url: data.url || '/'
        },
        vibrate: [100, 50, 100],
        requireInteraction: false
    }

    pushEvent.waitUntil(
        (self as unknown as ServiceWorkerGlobalScope).registration.showNotification(data.title || 'KTM App', options)
    )

})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    const notifEvent = event as NotificationEvent
    notifEvent.notification.close()

    const url = notifEvent.notification.data?.url || '/'
    const sw = self as unknown as ServiceWorkerGlobalScope

    notifEvent.waitUntil(
        sw.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open with the target URL
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) {
                    return (client as WindowClient).focus()
                }
            }
            // If no window is open, open a new one
            if (sw.clients.openWindow) {
                return sw.clients.openWindow(url)
            }
        })
    )
})
