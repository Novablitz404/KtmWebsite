export interface Match {
    id: string;
    category: string;
    round: number;
    player1: string;
    player2: string;
    winner: string | null;
    status: 'Pending' | 'Ready' | 'Ongoing' | 'Finished' | 'Complete';
    nextMatchId: string | null;
    nextMatchSlot: 'player1' | 'player2' | null;
    court: string;

    // Scores
    r1_blue_score: number;
    r1_red_score: number;
    r2_blue_score: number;
    r2_red_score: number;
    r3_blue_score: number;
    r3_red_score: number;
    total_blue_score: number;
    total_red_score: number;
    blue_gam_jeom: number;
    red_gam_jeom: number;
    blue_rounds_won: number;
    red_rounds_won: number;
}
