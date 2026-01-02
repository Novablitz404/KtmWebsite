import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Match ID required" }, { status: 400 });
        }

        // Filter updates to only allow valid fields if needed, 
        // but for now we trust the desktop app to send correct schema subset.
        // We strictly extract the fields we expect to avoid polluting invalid data if any.
        // However, spread is convenient. We'll rely on Prisma invalid arguments error if bad data.

        const match = await prisma.match.update({
            where: { id },
            data: {
                winner: updates.winner,
                status: updates.status,
                r1_blue_score: updates.r1_blue_score,
                r1_red_score: updates.r1_red_score,
                r2_blue_score: updates.r2_blue_score,
                r2_red_score: updates.r2_red_score,
                r3_blue_score: updates.r3_blue_score,
                r3_red_score: updates.r3_red_score,
                total_blue_score: updates.total_blue_score,
                total_red_score: updates.total_red_score,
                blue_gam_jeom: updates.blue_gam_jeom,
                red_gam_jeom: updates.red_gam_jeom,
                blue_rounds_won: updates.blue_rounds_won,
                red_rounds_won: updates.red_rounds_won,
                // Also update next match slot if provided? Usually computed.
                nextMatchId: updates.nextMatchId,
                nextMatchSlot: updates.nextMatchSlot,
            }
        });

        // TODO: Implement Ranking Logic
        // If status is Finished/Complete and match.round === 1 (Finals)

        return NextResponse.json({ success: true, match });
    } catch (error) {
        console.error("Error updating match:", error);
        return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
    }
}
