
export function deriveSkillLevel(beltInput: string | null): string {
    if (!beltInput) return 'Novice';

    const belt = beltInput.toLowerCase();

    // Advance: Red, Brown, Black, Poom
    if (
        belt.includes('red') ||
        belt.includes('brown') ||
        belt.includes('black') ||
        belt.includes('poom') ||
        belt.includes('dan')
    ) {
        return 'Advance';
    }

    // Intermediate: Yellow, Green, Blue
    if (
        belt.includes('yellow') ||
        belt.includes('green') ||
        belt.includes('blue')
    ) {
        return 'Intermediate';
    }

    // Default to Novice (White and others)
    return 'Novice';
}

/**
 * Tries to extract a specific belt color from a category name string.
 * Used for migrating older templates to the new explicit 'belt' schema.
 */
export function extractBeltFromCategoryName(categoryName: string): string | null {
    const lowerName = categoryName.toLowerCase();

    // Order matters: specific to generic
    // e.g. "High Yellow" -> "Yellow"

    if (lowerName.includes('black') || lowerName.includes('poom') || lowerName.includes('dan')) return 'Black';
    if (lowerName.includes('brown')) return 'Brown';
    if (lowerName.includes('red')) return 'Red';
    if (lowerName.includes('blue')) return 'Blue';
    if (lowerName.includes('green')) return 'Green';
    if (lowerName.includes('yellow')) return 'Yellow';
    if (lowerName.includes('white')) return 'White';

    return null;
}
