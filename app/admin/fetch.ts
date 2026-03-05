'use server'

import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'

async function checkAdmin() {
    const user = await getAuthUser()
    if (!user) throw new Error('Not authenticated')

    const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true }
    })

    if (dbUser?.role !== 'ADMIN') throw new Error('Unauthorized')
    return true
}

export async function fetchAdminUsers(page = 1, pageSize = 10, search = '', roleFilter = 'ALL') {
    await checkAdmin()

    const skip = (page - 1) * pageSize
    const where: any = {}

    // Search Filter
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
        ]
    }

    // Role Filter
    if (roleFilter !== 'ALL') {
        where.role = roleFilter
    }

    const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        }),
        prisma.user.count({ where })
    ])

    return {
        users,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount
    }
}

export async function fetchAdminEvents(page = 1, pageSize = 10, mode: 'tournaments' | 'promotions' = 'tournaments') {
    await checkAdmin()

    const skip = (page - 1) * pageSize

    if (mode === 'tournaments') {
        const [tournaments, totalCount] = await Promise.all([
            prisma.tournament.findMany({
                orderBy: { startDate: 'desc' },
                skip,
                take: pageSize,
                include: {
                    organizer: {
                        select: { name: true, email: true }
                    }
                }
            }),
            prisma.tournament.count()
        ])

        return {
            items: tournaments,
            totalPages: Math.ceil(totalCount / pageSize),
            totalCount
        }
    } else {
        const [promotions, totalCount] = await Promise.all([
            prisma.promotionTest.findMany({
                orderBy: { testDate: 'desc' },
                skip,
                take: pageSize,
                include: {
                    organization: {
                        select: { name: true }
                    }
                }
            }),
            prisma.promotionTest.count()
        ])

        return {
            items: promotions,
            totalPages: Math.ceil(totalCount / pageSize),
            totalCount
        }
    }
}

export async function fetchAdminApiKeys(page = 1, pageSize = 10, search = '') {
    await checkAdmin()

    const skip = (page - 1) * pageSize
    const where: any = {}

    // Search (if applicable later, assume search by description or owner name)
    // Currently API Key view doesn't have search input passed to it in the same way, but let's support basic description search
    if (search) {
        where.OR = [
            { description: { contains: search, mode: 'insensitive' } },
            { owner: { name: { contains: search, mode: 'insensitive' } } }
        ]
    }

    const [keys, totalCount] = await Promise.all([
        prisma.apiKey.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize,
            include: {
                owner: { select: { id: true, name: true, email: true } }
            }
        }),
        prisma.apiKey.count({ where })
    ])

    return {
        keys,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount
    }
}

export async function fetchGuidelineTemplates(page = 1, pageSize = 10, search = '') {
    await checkAdmin()

    const skip = (page - 1) * pageSize
    const where: any = {}

    if (search) {
        where.name = { contains: search, mode: 'insensitive' }
    }

    const [templates, totalCount] = await Promise.all([
        prisma.guidelineTemplate.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take: pageSize
        }),
        prisma.guidelineTemplate.count({ where })
    ])

    return {
        templates,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount
    }
}

export async function fetchGuidelineDetails(id: string) {
    await checkAdmin()

    if (!id) return null

    const template = await prisma.guidelineTemplate.findUnique({
        where: { id },
        include: {
            divisions: {
                orderBy: { displayOrder: 'asc' },
                include: {
                    categories: {
                        orderBy: { displayOrder: 'asc' }
                    }
                }
            }
        }
    })

    return template
}
