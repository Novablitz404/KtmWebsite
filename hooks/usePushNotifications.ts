'use client'

import { useState, useEffect, useCallback } from 'react'

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false)
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Check support and current subscription state
    useEffect(() => {
        const checkSupport = async () => {
            const supported = 'serviceWorker' in navigator && 'PushManager' in window
            setIsSupported(supported)

            if (supported) {
                try {
                    const registration = await navigator.serviceWorker.ready
                    const subscription = await registration.pushManager.getSubscription()
                    setIsSubscribed(!!subscription)
                } catch (error) {
                    console.error('Error checking push subscription:', error)
                }
            }
            setIsLoading(false)
        }

        checkSupport()
    }, [])

    const subscribe = useCallback(async () => {
        if (!isSupported) return false

        try {
            setIsLoading(true)

            // Request notification permission
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') {
                setIsLoading(false)
                return false
            }

            // Get VAPID public key from server
            const response = await fetch('/api/push/vapid-key')
            const { publicKey } = await response.json()

            // Subscribe to push
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            })

            // Save subscription to server
            const saveResponse = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription.toJSON())
            })

            if (saveResponse.ok) {
                setIsSubscribed(true)
                setIsLoading(false)
                return true
            }

            setIsLoading(false)
            return false
        } catch (error) {
            console.error('Push subscription failed:', error)
            setIsLoading(false)
            return false
        }
    }, [isSupported])

    const unsubscribe = useCallback(async () => {
        if (!isSupported) return false

        try {
            setIsLoading(true)

            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                // Unsubscribe locally
                await subscription.unsubscribe()

                // Remove from server
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint })
                })
            }

            setIsSubscribed(false)
            setIsLoading(false)
            return true
        } catch (error) {
            console.error('Push unsubscribe failed:', error)
            setIsLoading(false)
            return false
        }
    }, [isSupported])

    return {
        isSupported,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe
    }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): BufferSource {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray.buffer
}
