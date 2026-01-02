import { prisma } from '@/lib/prisma'

interface PlayerProfile {
    birthDate: Date
    gender: string
    weight: number
}

interface PlacementResult {
    division: {
        id: string
        name: string
    }
    weightCategory: {
        id: string
        name: string
    }
    categoryName: string // Combined name for display, e.g. "Junior Male Under 58kg"
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
    }

    return age
}

/**
 * Auto-place a player into the correct division and weight category
 * based on their profile data and the tournament's guideline template
 */
export async function autoPlacePlayer(
    guidelineTemplateId: string,
    player: PlayerProfile
): Promise<PlacementResult | null> {
    const age = calculateAge(player.birthDate)

    // 1. Find the matching division based on age
    const division = await prisma.division.findFirst({
        where: {
            templateId: guidelineTemplateId,
            minAge: { lte: age },
            maxAge: { gte: age }
        },
        orderBy: { displayOrder: 'asc' }
    })

    if (!division) {
        console.warn(`No division found for age ${age}`)
        return null
    }

    // 2. Find the matching weight category
    const weightCategory = await prisma.weightCategory.findFirst({
        where: {
            divisionId: division.id,
            OR: [
                { gender: player.gender },
                { gender: 'Both' }
            ],
            minWeight: { lte: player.weight },
            maxWeight: { gt: player.weight }
        },
        orderBy: { minWeight: 'asc' }
    })

    if (!weightCategory) {
        console.warn(`No weight category found for ${player.gender} at ${player.weight}kg in ${division.name}`)
        return null
    }

    // 3. Create combined category name
    const categoryName = `${division.name} ${player.gender} ${weightCategory.name}`

    return {
        division: {
            id: division.id,
            name: division.name
        },
        weightCategory: {
            id: weightCategory.id,
            name: weightCategory.name
        },
        categoryName
    }
}

/**
 * Get or create a category for a tournament based on division/weight placement
 */
export async function getOrCreateCategory(
    tournamentId: string,
    categoryName: string
): Promise<string> {
    // Check if category already exists
    let category = await prisma.category.findFirst({
        where: {
            tournamentId,
            name: categoryName
        }
    })

    if (!category) {
        // Create it
        category = await prisma.category.create({
            data: {
                name: categoryName,
                tournamentId
            }
        })
    }

    return category.id
}
