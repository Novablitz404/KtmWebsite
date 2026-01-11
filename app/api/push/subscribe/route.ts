import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get the database user
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId }
        })

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const subscription = await request.json()

        // Validate subscription format
        if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription format' }, { status: 400 })
        }

        // Upsert subscription (update if same endpoint exists)
        await prisma.pushSubscription.upsert({
            where: {
                userId_endpoint: {
                    userId: dbUser.id,
                    endpoint: subscription.endpoint
                }
            },
            update: {
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
            },
            create: {
                userId: dbUser.id,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Subscribe error:', error)
        return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId }
        })

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        const { endpoint } = await request.json()

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
        }

        await prisma.pushSubscription.deleteMany({
            where: {
                userId: dbUser.id,
                endpoint
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Unsubscribe error:', error)
        return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
    }
}
