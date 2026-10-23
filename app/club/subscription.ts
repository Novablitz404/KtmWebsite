'use server'

// The signed-in club master's Club management subscription (free to read for any club master: it is what the paid
// screens use to decide whether to show a lock). The real checks are in the paid actions themselves.
import { requireClubMaster } from '@/app/club/manager'
import { getSubscription, type Subscription } from '@/lib/club-subscription'

export async function getClubSubscription(): Promise<{ subscription?: Subscription; clubName?: string; error?: string }> {
    try {
        const { club } = await requireClubMaster()
        return { subscription: await getSubscription(club.id), clubName: club.name }
    } catch (error: any) {
        return { error: error.message || 'Failed to load the subscription' }
    }
}
