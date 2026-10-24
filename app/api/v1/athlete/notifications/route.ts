import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'

// GET /api/v1/athlete/notifications
export async function GET() {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

        const [items, unread] = await Promise.all([
            prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 }),
            prisma.notification.count({ where: { userId: user.id, read: false } }),
        ])
        return apiResponse({ items, unread })
    } catch (error) {
        console.error('Athlete notifications error:', error)
        return apiError('Failed to fetch notifications', 500)
    }
}

// PATCH /api/v1/athlete/notifications  body: { ids?: string[] } — marks those (or all) as read
export async function PATCH(request: Request) {
    try {
        const user = await authenticateApi()
        if (!user) return apiError('Unauthorized', 401)

        const body = await request.json().catch(() => ({}))
        const ids: string[] | undefined = Array.isArray(body?.ids) ? body.ids : undefined
        const result = await prisma.notification.updateMany({
            where: { userId: user.id, read: false, ...(ids && { id: { in: ids } }) },
            data: { read: true },
        })
        return apiResponse({ updated: result.count })
    } catch (error) {
        console.error('Athlete notifications update error:', error)
        return apiError('Failed to update notifications', 500)
    }
}
