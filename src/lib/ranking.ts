
import { Player, Tournament, User } from "@prisma/client";

// Define strict interfaces for the ranking calculation to avoid stale Prisma type errors
// during development. These match the schema but allow the function to be compiled
// even if the generated Prisma Client is lagging behind.

export interface RankablePlayer {
    medal: string | null;
}

export interface RankableTournament {
    tier: string; // "K-1" | "K-2" | "K-3" | "K-4"
    startDate: Date;
    endDate?: Date | null;
}

export interface RankableUser {
    isVerified: boolean;
}

/**
 * Calculates the K-Points for a specific tournament entry.
 *
 * @param player Object containing the medal result.
 * @param tournament Object containing tier and date.
 * @param athlete Object containing verification status.
 * @returns The calculated Current Valid Score.
 */
export function calculateKPoints(
    player: RankablePlayer,
    tournament: RankableTournament,
    athlete: RankableUser
): number {
    // 1. The Verification Gate
    if (!athlete.isVerified) {
        return 0;
    }

    // 2. Base Points
    let basePoints = 0;
    if (!player.medal) {
        return 0; // No medal/rank achieved, 0 points.
    }

    // Safe upper case check
    const medal = player.medal.toUpperCase();
    switch (medal) {
        case "GOLD":
            basePoints = 10.0;
            break;
        case "SILVER":
            basePoints = 6.0;
            break;
        case "BRONZE":
            basePoints = 3.6;
            break;
        case "QF": // Quarter Finalist
            basePoints = 2.16;
            break;
        case "R16": // Round of 16
            basePoints = 1.51;
            break;
        default:
            basePoints = 0;
    }

    // 3. Event Multipliers
    let tierMultiplier = 1;
    // Use optional chaining just in case, though interface implies required
    const tier = tournament.tier ? tournament.tier.toUpperCase() : "K-2";

    switch (tier) {
        case "K-1":
            tierMultiplier = 1;
            break;
        case "K-2":
            tierMultiplier = 2;
            break;
        case "K-3":
            tierMultiplier = 3;
            break;
        case "K-4":
            tierMultiplier = 4;
            break;
        default:
            // Default to K-1 if unknown pattern, but usually K-2 is standard local
            tierMultiplier = 1;
    }

    // 4. Decay Protocol
    const eventDate = new Date(tournament.startDate);
    const currentDate = new Date();

    // Calculate difference in months
    let monthsDiff = (currentDate.getFullYear() - eventDate.getFullYear()) * 12;
    monthsDiff -= eventDate.getMonth();
    monthsDiff += currentDate.getMonth();

    // Adjust for day of month
    if (currentDate.getDate() < eventDate.getDate()) {
        monthsDiff--;
    }

    let decayFactor = 1.0;

    if (monthsDiff <= 12) {
        decayFactor = 1.0;
    } else if (monthsDiff <= 24) {
        decayFactor = 0.75;
    } else if (monthsDiff <= 36) {
        decayFactor = 0.50;
    } else if (monthsDiff <= 48) {
        decayFactor = 0.25;
    } else {
        decayFactor = 0.0;
    }

    const finalScore = (basePoints * tierMultiplier) * decayFactor;

    return parseFloat(finalScore.toFixed(2));
}
