import { prisma } from '@/lib/prisma'

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

    // Build avatars map from DB imageUrl
    const avatars: Record<string, string> = {}
    paginatedMembers.forEach(member => {
        if (member.clerkId && member.imageUrl) {
            avatars[member.clerkId] = member.imageUrl
        }
    })

    return {
        paginatedMembers,
        totalMembers,
        avatars
    }
}
