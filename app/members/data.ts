import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

export interface MembersPageData {
    paginatedMembers: any[]
    totalMembers: number
    avatars: Record<string, string>
}

export async function getMembersData(
    clubName: string,
    currentPage: number,
    pageSize: number,
    searchQuery: string
): Promise<MembersPageData> {
    const skip = (currentPage - 1) * pageSize

    // Parallel queries with DB pagination and search
    const [paginatedMembers, totalMembers] = await Promise.all([
        prisma.user.findMany({
            where: {
                clubName: clubName,
                role: 'ATHLETE',
                OR: searchQuery ? [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { email: { contains: searchQuery, mode: 'insensitive' } }
                ] : undefined
            },
            orderBy: { name: 'asc' },
            skip,
            take: pageSize
        }),
        prisma.user.count({
            where: {
                clubName: clubName,
                role: 'ATHLETE',
                OR: searchQuery ? [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { email: { contains: searchQuery, mode: 'insensitive' } }
                ] : undefined
            }
        })
    ])

    // Fetch avatars from Clerk (Only for current page)
    const clerkIds = paginatedMembers.map(u => u.clerkId).filter(Boolean)
    let avatars: Record<string, string> = {}

    if (clerkIds.length > 0) {
        try {
            const uniqueIds = Array.from(new Set(clerkIds))
            const users = await (await clerkClient()).users.getUserList({
                userId: uniqueIds,
                limit: 100
            })
            users.data.forEach(user => {
                avatars[user.id] = user.imageUrl
            })
        } catch (error) {
            console.error('Failed to fetch Clerk users:', error)
        }
    }

    return {
        paginatedMembers,
        totalMembers,
        avatars
    }
}
