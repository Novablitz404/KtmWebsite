import { prisma } from '@/lib/prisma'

interface PlayerProfile {
    birthDate: Date
    gender: string
    weight: number
    height?: number
    belt?: string
    poomsaeType?: string // "INDIVIDUAL", "PAIR", "TEAM"
    type?: string // "KYORUGI" or "POOMSAE"
    skillLevel?: string // "Novice" or "Advance"
}

// Helper to calculate age
export function calculateAge(birthDate: Date | string): number {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
    }
    return age
}

export async function findCategoryForPlayer(
    tournamentId: string,
    player: PlayerProfile
) {
    const age = calculateAge(player.birthDate)

    const categories = await prisma.category.findMany({
        where: { tournamentId }
    })

    // Filter matches
    const matches = categories.filter(cat => {
        // 0. Skill Level Check
        // If the category has a skill level, it must match the player's skill level.
        // If the category has no skill level (Open), anyone can join.
        // Novice players -> Novice categories
        // Intermediate players -> Intermediate categories
        // Advance players -> Advance categories
        if (cat.skillLevel && player.skillLevel && cat.skillLevel !== player.skillLevel) return false

        // 1. Type Check (Kyorugi vs Poomsae)
        // If player.type is specified, it must match. Default to KYORUGI if undefined.
        // Actually, let's look for ALL matches and user selects type later? 
        // No, the placement logic usually wants specific.
        // Let's assume Kyorugi default if not specified.
        const targetType = player.type || 'KYORUGI'
        if (cat.type !== targetType) return false

        // 2. Age Check
        if (cat.minAge && age < cat.minAge) return false
        if (cat.maxAge && age > cat.maxAge) return false

        // 3. Gender Check
        if (cat.gender && cat.gender !== 'Both' && cat.gender !== 'Mixed' && cat.gender !== player.gender) return false

        // 4. Kyorugi Specifics
        if (targetType === 'KYORUGI') {
            // Weight (truthy check: skip when 0/null, used for height-based divisions)
            if (cat.minWeight && player.weight < cat.minWeight) return false
            if (cat.maxWeight && player.weight > cat.maxWeight) return false

            // Height (truthy check: skip when 0/null, used for weight-based divisions)
            if (cat.minHeight && (player.height || 0) < cat.minHeight) return false
            if (cat.maxHeight && (player.height || 0) > cat.maxHeight) return false
        }

        // 5. Poomsae Specifics
        if (targetType === 'POOMSAE') {
            // Belt
            if (cat.belt) {
                // If category has strict belt rule
                if (player.belt && cat.belt !== player.belt) return false
            } else if (player.belt) {
                // Fallback: If category name contains belt info (e.g. "Yellow Belt")
                // We want to ensure the player's belt matches the category name
                // This is a fuzzy match but better than random
                const normalizedCatName = cat.name.toLowerCase()
                const normalizedPlayerBelt = player.belt.toLowerCase()

                // If the category name explicitly mentions a belt color, enforce it
                const knownBelts = ['white', 'yellow', 'orange', 'green', 'purple', 'blue', 'maroon', 'red', 'brown', 'black', 'poom', 'dan']
                const mentionedBelts = knownBelts.filter(b => normalizedCatName.includes(b))

                if (mentionedBelts.length > 0) {

                    if (!normalizedCatName.includes(normalizedPlayerBelt)) return false
                }
            }

            // Subtype
            if (player.poomsaeType && cat.subtype !== player.poomsaeType) return false
        }

        // 6. Kyukpa Specifics (Breaking)
        if (targetType === 'KYUKPA') {
            // Belt Logic (Similar to Poomsae - strict match if specified, or name match)
            if (cat.belt) {
                if (player.belt && cat.belt !== player.belt) return false
            } else if (player.belt) {
                const normalizedCatName = cat.name.toLowerCase()
                const normalizedPlayerBelt = player.belt.toLowerCase()

                // If category implies a specific belt (e.g. "White Belt"), check for it
                // Allow "White" to match "White Belt" etc.
                const beltKeywords = ['white', 'yellow', 'orange', 'green', 'purple', 'blue', 'maroon', 'red', 'brown', 'black', 'poom', 'dan']
                const mentionedBelts = beltKeywords.filter(b => normalizedCatName.includes(b))

                if (mentionedBelts.length > 0) {
                    if (!normalizedCatName.includes(normalizedPlayerBelt)) return false
                }
            }
            // Weight is IGNORED for Kyukpa
        }

        return true
    })

    // Return the best match (or first)
    // If multiple matches? (e.g. Open weight vs specific)
    // Sort by specificity?
    // For now return first.
    return matches[0] || null
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
