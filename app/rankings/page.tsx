import { fetchRankings, getDefaultSegment, getAvailableWeightClasses } from './fetch'
import { Shield, BadgeCheck } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'
import RankingFilters from './RankingFilters'
import Link from 'next/link'
import Image from 'next/image'
import { getTenant } from '@/lib/tenant'
import SyncUrlParams from './SyncUrlParams'
import WOTFGlobalRankingPage from '@/components/landing/wotf-global/pages/RankingsPage'
import Navbar from '@/components/landing/wotf/Navbar'
import Footer from '@/components/landing/wotf/Footer'
import { TapEliteFooter, TapEliteNavbar } from '@/components/landing/tap-elite/pages/LandingPage'
import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'GSS Rankings',
    description: 'Official GSS (Global Skill Score) athlete rankings. See where taekwondo athletes from around the world stand in Kyorugi and Poomsae.',
    openGraph: {
        title: 'GSS Rankings',
        description: 'Official GSS athlete rankings for Kyorugi and Poomsae — powered by the Global Skill Score algorithm.',
    },
}

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function RankingsPage({ searchParams }: PageProps) {
    const params = await searchParams
    const tenant = await getTenant()

    // Pass control to custom tenant pages if necessary
    if (tenant.slug === 'wotf-global') {
        return <WOTFGlobalRankingPage searchParams={params} />
    }

    // Extract filters safely
    // Default type to KYORUGI if not specified, OR show both?
    // User asked for "Two containers". Let's show Tabs that switch the view.
    const currentType = typeof params.type === 'string' ? params.type : 'KYORUGI'

    let division = typeof params.division === 'string' ? params.division : undefined
    const weightCategory = typeof params.weightCategory === 'string' ? params.weightCategory : undefined
    const belt = typeof params.belt === 'string' ? params.belt : undefined
    const skillLevel = typeof params.skillLevel === 'string' ? params.skillLevel : undefined
    let gender = typeof params.gender === 'string' ? params.gender : undefined
    const search = typeof params.search === 'string' ? params.search : undefined

    // KTM now has a real Organization row too (needed for host-based GSS
    // attribution), so its own tenant id is passed through like any other org.
    const tenantId = tenant.id || undefined

    // Different divisions/genders are disconnected competitive populations —
    // athletes in them never actually play each other, so a single flat
    // "all" list mixing them isn't a meaningful ranking (see discussion).
    // Rather than showing an empty/meaningless mixed view, default onto
    // whichever Division+Gender combination actually has ranked athletes.
    //
    // Resolved here (not via redirect()) so the page renders the default
    // segment's data in the very first response — a server redirect would
    // force a second round trip, which is what caused the visible white
    // flash on navigation. The URL is synced afterward on the client via
    // SyncUrlParams, invisibly, without another navigation.
    let syncParams: Record<string, string> | null = null
    if (!division && !gender) {
        const defaultSegment = await getDefaultSegment({ type: currentType, tenantId, tenantSlug: tenant.slug })
        if (defaultSegment) {
            division = defaultSegment.division
            gender = defaultSegment.gender
            syncParams = { type: currentType, division, gender }
            if (weightCategory) syncParams.weightCategory = weightCategory
            if (belt) syncParams.belt = belt
            if (skillLevel) syncParams.skillLevel = skillLevel
            if (search) syncParams.search = search
            // Preserve the ?tenant= override — without it, the synced URL
            // falls back to KTM (the default tenant) instead of staying on
            // whichever org's rankings page this actually is.
            if (!tenant.isMappedDomain) syncParams.tenant = tenant.slug
        }
        // No ranked data at all for this type/tenant yet — fall through and
        // show the honest "no ranked athletes found" empty state below.
    }

    const [rankings, weightClasses] = await Promise.all([
        fetchRankings({ type: currentType, division, weightCategory, belt, skillLevel, gender, search, tenantId, tenantSlug: tenant.slug }),
        getAvailableWeightClasses({ type: currentType, division, gender, tenantId, tenantSlug: tenant.slug }),
    ])

    // Helper to generate tab link
    const getTabLink = (type: string) => {
        const newParams = new URLSearchParams()
        if (division) newParams.set('division', division)
        if (weightCategory) newParams.set('weightCategory', weightCategory)
        if (belt) newParams.set('belt', belt)
        if (skillLevel) newParams.set('skillLevel', skillLevel)
        if (gender) newParams.set('gender', gender)
        if (search) newParams.set('search', search)
        newParams.set('type', type)
        // Preserve the ?tenant= override — same reasoning as the default-segment redirect above.
        if (!tenant.isMappedDomain) newParams.set('tenant', tenant.slug)
        return `/rankings?${newParams.toString()}`
    }

    const brandColor = tenant.primaryColor || '#DC2626'
    const qs = tenant.isMappedDomain ? '' : `?tenant=${tenant.slug}`

    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            {syncParams && <SyncUrlParams params={syncParams} />}
            {tenant.slug === 'tap-elite' ? (
                <TapEliteNavbar qs={qs} solid />
            ) : tenant.slug !== 'ktm' && (
                <Navbar variant="dark" />
            )}

            {/* Hero Section */}
            <div className={`relative overflow-hidden px-4 bg-[#0A0A0A] ${tenant.slug === 'tap-elite' ? 'pt-40 pb-20' : 'py-20'}`}>
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-5" style={{ backgroundColor: brandColor }} />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] opacity-5" style={{ backgroundColor: brandColor }} />
                </div>

                <div className="w-full max-w-[1400px] mx-auto text-center relative z-10">
                    {tenant.slug !== 'tap-elite' && tenant.logoWhiteUrl && (
                        <div className="flex justify-center mb-6">
                            <Image src={tenant.logoWhiteUrl} alt={tenant.name} width={160} height={48} className="h-10 w-auto object-contain" />
                        </div>
                    )}

                    {tenant.slug !== 'tap-elite' && (
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">
                            <Shield className="w-3.5 h-3.5" style={{ color: brandColor }} />
                            Global Leaderboard
                        </div>
                    )}

                    <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight uppercase text-white leading-none">
                        GSS <span className="text-white/40">Rankings</span>
                    </h1>
                    <p className="text-gray-500 text-sm md:text-base max-w-lg mx-auto font-medium tracking-wide">
                        Global Skill Score — the official ranking algorithm by {tenant.name}
                    </p>

                    <div className="flex justify-center mt-10">
                        <div className="inline-flex p-1 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                            <Link
                                href={getTabLink('KYORUGI')}
                                className="flex items-center px-6 py-2.5 rounded-lg font-bold text-sm transition-all"
                                style={currentType === 'KYORUGI' ? { backgroundColor: brandColor, color: '#fff' } : undefined}
                            >
                                <span className={currentType === 'KYORUGI' ? '' : 'text-white/50 hover:text-white'}>Kyorugi</span>
                            </Link>
                            <Link
                                href={getTabLink('POOMSAE')}
                                className="flex items-center px-6 py-2.5 rounded-lg font-bold text-sm transition-all"
                                style={currentType === 'POOMSAE' ? { backgroundColor: brandColor, color: '#fff' } : undefined}
                            >
                                <span className={currentType === 'POOMSAE' ? '' : 'text-white/50 hover:text-white'}>Poomsae</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-[1400px] mx-auto px-4 space-y-6 relative z-20 pb-20">
                <RankingFilters weightClasses={weightClasses} />

                <div className="flex items-center justify-between text-sm font-medium text-gray-500 bg-[#111] px-5 py-3 border border-white/10 rounded-t-xl">
                    <div>
                        <span className="text-white font-bold text-base">{rankings.length}</span>{' '}
                        athletes ranked
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            Active
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-gray-600" />
                            Inactive
                        </div>
                    </div>
                </div>

                <div className="w-full bg-[#111] border border-t-0 border-white/10 rounded-b-xl overflow-hidden -mt-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#0D0D0D] border-b border-white/10">
                                <tr>
                                    <th className="px-5 py-4 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest w-16">#</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Athlete</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest hidden md:table-cell">Club</th>
                                    <th className="px-5 py-4 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest hidden md:table-cell">Weight Class</th>
                                    <th className="px-5 py-4 text-right text-[10px] font-black text-white uppercase tracking-widest w-28">GS Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankings.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                    <Shield className="w-7 h-7 text-gray-600" />
                                                </div>
                                                <p className="text-gray-500 font-medium">
                                                    No ranked athletes found matching your filters.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    rankings.map((athlete) => (
                                        <tr
                                            key={athlete.userId}
                                            className={`transition-colors group border-b border-white/[0.03] last:border-0 ${
                                                athlete.isActive === false ? 'opacity-40' : 'hover:bg-white/[0.03]'
                                            }`}
                                        >
                                            <td className="px-5 py-4 whitespace-nowrap text-center">
                                                {athlete.rank <= 3 ? (
                                                    <div
                                                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm ${
                                                            athlete.rank === 1
                                                                ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30'
                                                                : athlete.rank === 2
                                                                ? 'bg-gray-400/20 text-gray-300 ring-1 ring-gray-400/30'
                                                                : 'bg-amber-600/20 text-amber-500 ring-1 ring-amber-500/30'
                                                        }`}
                                                    >
                                                        {athlete.rank}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-600 font-bold text-sm">{athlete.rank}</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative flex-shrink-0">
                                                        <UserAvatar
                                                            src={athlete.profileImage}
                                                            name={athlete.name}
                                                            size={40}
                                                            className="bg-[#1A1A1A] border border-white/10"
                                                        />
                                                        {athlete.verified && (
                                                            <div className="absolute -bottom-0.5 -right-0.5 bg-[#0A0A0A] rounded-full p-[2px]">
                                                                <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" strokeWidth={2} stroke="#0A0A0A" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Link href={`/athlete/${athlete.userId}`} className="font-bold text-white text-sm hover:text-red-400 transition-colors tracking-tight truncate">
                                                                {athlete.name.toUpperCase()}
                                                            </Link>
                                                            {athlete.isActive === false && (
                                                                <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-white/5 text-gray-600 rounded border border-white/5 flex-shrink-0">
                                                                    Inactive
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[11px] text-gray-600 font-medium tracking-wide mt-0.5 md:hidden">
                                                            {athlete.clubName || 'Independent'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap hidden md:table-cell">
                                                <span className="font-medium text-gray-500 text-sm">{athlete.clubName || 'Independent'}</span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap hidden md:table-cell">
                                                <span className="font-medium text-gray-500 text-sm">{athlete.weightCategory || '—'}</span>
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap text-right">
                                                <div className="font-black text-white text-lg tabular-nums tracking-tight">
                                                    {Math.round(athlete.totalPoints)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {tenant.slug === 'tap-elite' ? (
                <TapEliteFooter qs={qs} standalone />
            ) : tenant.slug !== 'ktm' && (
                <Footer />
            )}
        </div>
    )
}
