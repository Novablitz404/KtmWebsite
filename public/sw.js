// Minimal Service Worker - Push Notifications Only
// NO caching to avoid auth issues

self.addEventListener('install', (event) => {
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim())
})

// Push Notification Handler
self.addEventListener('push', (event) => {
    if (!event.data) return

    let data
    try {
        data = event.data.json()
    } catch {
        data = { title: 'KTM App', body: event.data.text() }
    }

    const options = {
        body: data.body || '',
        icon: '/KTMLogo.png',
        badge: '/KTMLogo.png',
        tag: data.tag || 'ktm-notification',
        data: { url: data.url || '/' },
        vibrate: [100, 50, 100]
    }

    event.waitUntil(
        self.registration.showNotification(data.title || 'KTM App', options)
    )
})

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const url = event.notification.data?.url || '/'

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus()
                }
            }
            return clients.openWindow(url)
        })
    )
})
