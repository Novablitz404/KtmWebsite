/**
 * Shared loader for the Rankings tab inside the organization and club dashboards.
 *
 * It returns exactly what the public Rankings page shows (licensed athletes
 * only, ranks 1, 2, 3... within the chosen division/gender/weight class), so the
 * dashboards can never disagree with the website. Callers must have already
 * checked that the signed-in user may view this organization.
 */

import { fetchRankingsPage, getAvailableWeightClasses, type RankingEntry } from '@/app/rankings/fetch'

export const DASHBOARD_RANKINGS_PAGE_SIZE = 25

export interface DashboardRankingsParams {
    type: 'KYORUGI' | 'POOMSAE'
    division?: string
    gender?: string
    weightCategory?: string
    search?: string
    page?: number
    myClubOnly?: boolean
}

export interface DashboardRankingsResult {
    rows: RankingEntry[]
    total: number
    weightClasses: string[]
    pageSize: number
    /** Set for club masters: their club's name, used to highlight its athletes. */
    clubName?: string | null
    /** Set when the club has no organization yet (nothing to rank against). */
    notAffiliated?: boolean
    organizationName?: string | null
}

export const EMPTY_DASHBOARD_RANKINGS: DashboardRankingsResult = {
    rows: [], total: 0, weightClasses: [], pageSize: DASHBOARD_RANKINGS_PAGE_SIZE,
}

export async function loadDashboardRankings(
    organizationId: string,
    params: DashboardRankingsParams,
    clubName?: string | null
): Promise<DashboardRankingsResult> {
    const type = params.type === 'POOMSAE' ? 'POOMSAE' : 'KYORUGI'
    const [{ rows, total }, weightClasses] = await Promise.all([
        fetchRankingsPage(
            {
                type,
                division: params.division || undefined,
                gender: params.gender || undefined,
                weightCategory: params.weightCategory || undefined,
                search: params.search?.trim() || undefined,
                clubName: params.myClubOnly && clubName ? clubName : undefined,
                tenantId: organizationId,
            },
            { page: Math.max(1, params.page ?? 1), pageSize: DASHBOARD_RANKINGS_PAGE_SIZE }
        ),
        getAvailableWeightClasses({
            type,
            division: params.division || undefined,
            gender: params.gender || undefined,
            tenantId: organizationId,
        }),
    ])
    return { rows, total, weightClasses, pageSize: DASHBOARD_RANKINGS_PAGE_SIZE, clubName: clubName ?? null }
}
