import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Match } from '@/types/match';
import { Match as PrismaMatch, Category } from '@prisma/client';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: tournamentId } = await params;

    try {
        const matches = await prisma.match.findMany({
            where: {
                categoryRef: {
                    tournamentId: tournamentId
                }
            },
            include: {
                categoryRef: true
            }
        });

        const response = matches.map((m: PrismaMatch & { categoryRef: Category | null }) => ({
            id: m.id,
            category: m.category || m.categoryRef?.name || "Unknown",
            round: m.round,
            player1: m.player1,
            player2: m.player2,
            winner: m.winner,
            status: m.status,
            nextMatchId: m.nextMatchId,
            nextMatchSlot: m.nextMatchSlot,
            court: m.court,
        }));

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error fetching matches:", error);
        return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
    }
}
