/**
 * GSS (Global Skill Score) — Core Elo Calculation Engine
 *
 * Pure functions for calculating Elo ratings, field strength bonuses,
 * margin multipliers, and belt-based initial seeding.
 *
 * This module has NO side effects — it only computes numbers.
 */

// ─── K-Factor ────────────────────────────────────────────────
/**
 * Returns the K-factor based on how many rated matches the athlete has played.
 * Higher K = faster rating changes (good for new/calibrating athletes).
 *
 * - 0–9 matches: K=40 (calibration period — fast convergence)
 * - 10–29 matches: K=32 (standard adjustment)
 * - 30+ matches: K=24 (stability for experienced athletes)
 */
export function getKFactor(matchCount: number): number {
    if (matchCount < 10) return 40   // Calibration
    if (matchCount < 30) return 32   // Standard
    return 24                        // Experienced
}

// ─── Expected Outcome ────────────────────────────────────────
/**
 * Calculates the expected probability of player A winning against player B.
 * Standard Elo formula: E(A) = 1 / (1 + 10^((R_B - R_A) / 400))
 *
 * @returns A number between 0 and 1
 */
export function calculateExpected(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

// ─── Score Margin Multiplier ─────────────────────────────────
/**
 * Rewards dominant victories with a bonus multiplier on the Elo change.
 * Capped at 1.5 to prevent single blowout matches from distorting ratings.
 *
 * Formula: min(1.0 + (scoreDiff / 20), 1.5)
 *
 * | Diff | Multiplier |
 * |------|------------|
 * | 0-1  | 1.0–1.05   |
 * | 5    | 1.25       |
 * | 10+  | 1.5 (cap)  |
 */
export function getMarginMultiplier(scoreDifference: number): number {
    return Math.min(1.0 + Math.abs(scoreDifference) / 20, 1.5)
}

// ─── New Rating Calculation ──────────────────────────────────
/**
 * Computes the new Elo rating after a single match.
 *
 * NewRating = OldRating + K × MarginMultiplier × (Outcome - Expected)
 *
 * @param oldRating - Current Elo rating
 * @param expected - Expected outcome probability (from calculateExpected)
 * @param outcome - Actual outcome: 1.0 for win, 0.0 for loss
 * @param kFactor - K-factor (from getKFactor)
 * @param marginMultiplier - Score margin bonus (from getMarginMultiplier)
 * @returns The new Elo rating (not rounded)
 */
export function calculateNewRating(
    oldRating: number,
    expected: number,
    outcome: number,
    kFactor: number,
    marginMultiplier: number
): number {
    return oldRating + kFactor * marginMultiplier * (outcome - expected)
}

// ─── Full Match Elo Update ───────────────────────────────────
/**
 * Computes new Elo ratings for both the winner and loser of a match.
 * This is the primary function called per-match.
 */
export function computeMatchEloUpdate(
    winnerRating: number,
    loserRating: number,
    winnerMatchCount: number,
    loserMatchCount: number,
    scoreDifference: number
): {
    winnerNewRating: number
    loserNewRating: number
    winnerDelta: number
    loserDelta: number
    kFactorWinner: number
    kFactorLoser: number
    marginMultiplier: number
    expectedWinner: number
} {
    const expectedWinner = calculateExpected(winnerRating, loserRating)
    const marginMultiplier = getMarginMultiplier(scoreDifference)
    const kFactorWinner = getKFactor(winnerMatchCount)
    const kFactorLoser = getKFactor(loserMatchCount)

    const winnerNewRating = calculateNewRating(winnerRating, expectedWinner, 1.0, kFactorWinner, marginMultiplier)
    const loserNewRating = calculateNewRating(loserRating, 1 - expectedWinner, 0.0, kFactorLoser, marginMultiplier)

    return {
        winnerNewRating,
        loserNewRating,
        winnerDelta: winnerNewRating - winnerRating,
        loserDelta: loserNewRating - loserRating,
        kFactorWinner,
        kFactorLoser,
        marginMultiplier,
        expectedWinner,
    }
}

// ─── Field Strength ──────────────────────────────────────────
/**
 * Calculates the average Elo of all participants in a category.
 * A higher field strength means the tournament had stronger competition.
 */
export function calculateFieldStrength(participantElos: number[]): number {
    if (participantElos.length === 0) return 1200
    return participantElos.reduce((sum, elo) => sum + elo, 0) / participantElos.length
}

// ─── GSS Tier Multiplier ────────────────────────────────────
/**
 * Maps the tournament GSS Tier to its multiplier value.
 *
 * | Tier  | Multiplier | Example                            |
 * |-------|------------|------------------------------------|
 * | GSS-1 | ×2.0       | World Championship, Olympic Qual.  |
 * | GSS-2 | ×1.5       | National Championship              |
 * | GSS-3 | ×1.0       | Regional / Standard (default)      |
 * | GSS-4 | ×0.75      | Club-level / Local                 |
 *
 * Also handles legacy J-Score tiers for backward compatibility.
 */
export function getGSSTierMultiplier(tier: string): number {
    switch (tier.toUpperCase()) {
        case 'GSS-1': case 'J-4': return 2.0    // Premier
        case 'GSS-2': case 'J-3': return 1.5    // Major
        case 'GSS-3': case 'J-2': return 1.0    // Standard (default)
        case 'GSS-4': case 'J-1': return 0.75   // Local
        default: return 1.0
    }
}

// ─── Placement Multiplier ───────────────────────────────────
/**
 * Returns the placement multiplier used in the Field Strength Bonus.
 * Gold gets the full bonus; lower placements get diminishing returns.
 */
export function getPlacementMultiplier(placement: string): number {
    switch (placement.toUpperCase()) {
        case 'GOLD': return 1.0
        case 'SILVER': return 0.6
        case 'BRONZE': return 0.36
        case 'QF': return 0.22
        case 'R16': return 0.15
        default: return 0
    }
}

// ─── Field Bonus ─────────────────────────────────────────────
/**
 * Calculates the bonus points awarded to a placed athlete after tournament completion.
 *
 * Formula:
 *   FieldBonus = (FieldStrength - 1200) / 100 × BracketDepth × PlacementMultiplier × GSSTierMultiplier
 *
 * This captures two dimensions:
 *   1. Field Strength (auto) — how good were the athletes competing?
 *   2. GSS Tier (manual) — how prestigious is the event?
 *
 * @param fieldStrength - Average Elo of participants in the category
 * @param bracketSize - Number of players in the category bracket
 * @param placement - Medal placement: "GOLD", "SILVER", "BRONZE", "QF", "R16"
 * @param gssTier - Tournament tier: "GSS-1" through "GSS-4"
 * @returns Bonus points (can be 0 or negative if field is below 1200)
 */
export function calculateFieldBonus(
    fieldStrength: number,
    bracketSize: number,
    placement: string,
    gssTier: string
): number {
    const bracketDepth = Math.log2(Math.max(bracketSize, 2))
    const placementMultiplier = getPlacementMultiplier(placement)
    const tierMultiplier = getGSSTierMultiplier(gssTier)

    const bonus = ((fieldStrength - 1200) / 100) * bracketDepth * placementMultiplier * tierMultiplier
    return Math.max(bonus, 0) // Never negative
}

// ─── Time Decay ──────────────────────────────────────────────
/**
 * Smooth exponential decay weight for field bonuses and poomsae percentiles.
 *
 * Formula: e^(-0.0578 × months)
 *
 * λ = 0.0578 is chosen so that at 12 months, weight = 50%.
 *
 * | Age       | Weight |
 * |-----------|--------|
 * | 0 months  | 100%   |
 * | 6 months  | 70.7%  |
 * | 12 months | 50%    |
 * | 24 months | 25%    |
 * | 36 months | 12.5%  |
 * | 48 months | 6.25%  |
 *
 * Note: Decay applies to bonuses/percentiles ONLY. Elo itself never decays.
 */
export function calculateDecayWeight(monthsAgo: number): number {
    const LAMBDA = 0.0578
    return Math.exp(-LAMBDA * Math.max(monthsAgo, 0))
}

/**
 * Calculates the number of months between two dates.
 */
export function monthsBetween(from: Date, to: Date): number {
    const years = to.getFullYear() - from.getFullYear()
    const months = to.getMonth() - from.getMonth()
    const days = to.getDate() - from.getDate()
    return years * 12 + months + (days < 0 ? -1 : 0)
}

// ─── Belt-Based Initial Elo (Cold Start) ─────────────────────
/**
 * Returns the initial Elo rating based on belt rank.
 * Used for cold-start seeding so Day 1 rankings aren't meaningless.
 *
 * | Belt         | Starting Elo |
 * |------------- |-------------|
 * | White        | 800         |
 * | Yellow       | 900         |
 * | Orange       | 1000        |
 * | Green        | 1050        |
 * | Purple       | 1100        |
 * | Blue         | 1150        |
 * | Maroon       | 1200        |
 * | Red          | 1250        |
 * | Brown        | 1300        |
 * | Black / Poom | 1400        |
 * | 1st Dan+     | 1400 + (dan × 25) |
 */
export function getInitialElo(belt: string | null | undefined): number {
    if (!belt) return 1200 // Default for unknown

    const normalized = belt.trim().toLowerCase()

    // Dan grades (e.g., "1st Dan", "2nd Dan", "3rd Dan", etc.)
    const danMatch = normalized.match(/^(\d+)(?:st|nd|rd|th)?\s*dan$/i)
    if (danMatch) {
        const danLevel = parseInt(danMatch[1], 10)
        return 1400 + danLevel * 25
    }

    const beltMap: Record<string, number> = {
        'white': 800,
        'yellow': 900,
        'orange': 1000,
        'green': 1050,
        'purple': 1100,
        'blue': 1150,
        'maroon': 1200,
        'red': 1250,
        'brown': 1300,
        'black': 1400,
        'poom': 1400,
    }

    return beltMap[normalized] ?? 1200
}

// ─── Poomsae Percentile ──────────────────────────────────────
/**
 * Calculates a percentile score for a poomsae performance.
 *
 * Formula: (score - minScore) / (maxScore - minScore) × 100
 *
 * @param athleteScore - The athlete's total score
 * @param minScore - Minimum score in the category
 * @param maxScore - Maximum score in the category
 * @returns Percentile score (0–100+, can exceed 100 with field adjustment)
 */
export function calculatePercentile(
    athleteScore: number,
    minScore: number,
    maxScore: number
): number {
    if (maxScore === minScore) return 50 // Everyone tied
    return ((athleteScore - minScore) / (maxScore - minScore)) * 100
}

/**
 * Applies field-size adjustment to a percentile score.
 * A larger field means the percentile is worth more.
 *
 * Formula: percentile × min(1 + (numCompetitors - 4) / 40, 1.5)
 *
 * 4 competitors = no adjustment; 24 = ×1.5 cap.
 */
export function adjustPercentileForFieldSize(
    percentile: number,
    numCompetitors: number
): number {
    const adjustment = Math.min(1 + (numCompetitors - 4) / 40, 1.5)
    return percentile * Math.max(adjustment, 1)
}

/**
 * Calculates a weighted rolling average of poomsae percentile scores.
 * Uses time-decay weights so recent performances count more.
 *
 * @param scores - Array of { percentile, monthsAgo } from last 8 competitions
 * @returns Weighted average percentile
 */
export function calculatePoomsaeRollingAverage(
    scores: Array<{ percentile: number; monthsAgo: number }>
): number {
    if (scores.length === 0) return 0

    let weightedSum = 0
    let totalWeight = 0

    for (const { percentile, monthsAgo } of scores) {
        const weight = calculateDecayWeight(monthsAgo)
        weightedSum += percentile * weight
        totalWeight += weight
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0
}
