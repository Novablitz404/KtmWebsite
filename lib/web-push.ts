import webpush from 'web-push'

// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@ktm.com'

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

export interface PushPayload {
    title: string
    body: string
    icon?: string
    badge?: string
    url?: string
    tag?: string
}

export interface PushSubscriptionData {
    endpoint: string
    keys: {
        p256dh: string
        auth: string
    }
}

/**
 * Send a push notification to a single subscription
 */
export async function sendNotification(
    subscription: PushSubscriptionData,
    payload: PushPayload
): Promise<boolean> {
    try {
        await webpush.sendNotification(
            {
                endpoint: subscription.endpoint,
                keys: subscription.keys
            },
            JSON.stringify({
                title: payload.title,
                body: payload.body,
                icon: payload.icon || '/icons/icon-192x192.png',
                badge: payload.badge || '/icons/badge-72x72.png',
                url: payload.url,
                tag: payload.tag
            })
        )
        return true
    } catch (error: any) {
        // Handle expired/invalid subscriptions (410 Gone or 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('Subscription expired or invalid:', subscription.endpoint)
            return false // Subscription should be removed
        }
        console.error('Push notification failed:', error)
        throw error
    }
}

/**
 * Send push notifications to multiple subscriptions
 * Returns array of endpoints that failed (should be cleaned up)
 */
export async function sendBulkNotifications(
    subscriptions: PushSubscriptionData[],
    payload: PushPayload
): Promise<string[]> {
    const failedEndpoints: string[] = []

    await Promise.all(
        subscriptions.map(async (sub) => {
            const success = await sendNotification(sub, payload).catch(() => false)
            if (!success) {
                failedEndpoints.push(sub.endpoint)
            }
        })
    )

    return failedEndpoints
}

export { vapidPublicKey }
