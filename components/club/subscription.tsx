'use client'

// Everything the Club management paywall needs on screen: the subscription state, the "paid feature" page, the lock
// badge and the renewal banner. Attendance, Finance, Schedule and the kiosks are paid; Members and Registrations are free.
import { createContext, useContext, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Lock, CalendarCheck, Wallet, CalendarDays, MonitorSmartphone, LifeBuoy, AlertTriangle, type LucideIcon } from 'lucide-react'
import { getClubSubscription } from '@/app/club/subscription'
import type { Subscription } from '@/lib/club-subscription'

export type PaidFeatureId = 'attendance' | 'finance' | 'schedule' | 'kiosks' | 'membership' | 'member-attendance'

export const PAID_FEATURES: Record<PaidFeatureId, { title: string; pitch: string; icon: LucideIcon }> = {
    attendance: { title: 'Attendance', icon: CalendarCheck, pitch: 'Track who comes to class, check members in by hand or with their face at the door, and see each member’s history.' },
    finance: { title: 'Finance', icon: Wallet, pitch: 'Set monthly fees, record payments and balances, and send invoices with your payment QR code.' },
    schedule: { title: 'Schedule', icon: CalendarDays, pitch: 'Plan your weekly classes, set capacity and belt ranges, and enroll members.' },
    kiosks: { title: 'Check-in kiosks', icon: MonitorSmartphone, pitch: 'Let members check in with their face at your door, even when the internet is down.' },
    membership: { title: 'Membership & fees', icon: Wallet, pitch: 'Set each member’s monthly fee, billing day and status so dues are worked out for you.' },
    'member-attendance': { title: 'Attendance history', icon: CalendarCheck, pitch: 'See every visit, the days present each month and the full history for this member.' },
}

type SubscriptionContext = {
    sub: Subscription | undefined
    loading: boolean
    locked: boolean        // never subscribed: the paid features show the "paid feature" page
    readOnly: boolean      // subscription ended: records can be viewed, not changed
    contactSupport: (feature?: PaidFeatureId) => void
}

const Context = createContext<{ contactSupport?: (feature?: PaidFeatureId) => void } | null>(null)

// ClubDashboard provides how "Contact support" opens its Support tab with a ticket started; elsewhere it falls back to a link.
export function SubscriptionProvider({ contactSupport, children }: { contactSupport: (feature?: PaidFeatureId) => void; children: React.ReactNode }) {
    const value = useMemo(() => ({ contactSupport }), [contactSupport])
    return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useSubscription(): SubscriptionContext {
    const router = useRouter()
    const provided = useContext(Context)
    const { data, error } = useQuery({
        queryKey: ['club-subscription'],
        queryFn: async () => {
            const res = await getClubSubscription()
            if (res.error || !res.subscription) throw new Error(res.error || 'Could not load the subscription')
            return res.subscription
        },
        staleTime: 60_000,
    })
    return {
        sub: data,
        loading: !data && !error,
        locked: data?.state === 'none',
        readOnly: data?.state === 'lapsed',
        contactSupport: provided?.contactSupport ?? ((feature?: PaidFeatureId) => router.push(`/club?tab=support&topic=${feature ?? 'club-management'}`)),
    }
}

// The page shown instead of a paid screen (or a small card inside a tab) for a club that has not subscribed.
export function PaidFeature({ feature, compact = false }: { feature: PaidFeatureId; compact?: boolean }) {
    const { contactSupport } = useSubscription()
    const { title, pitch, icon: Icon } = PAID_FEATURES[feature]
    return (
        <div className={compact ? 'rounded-2xl border border-gray-100 bg-white p-6 text-center' : 'flex items-center justify-center min-h-[60vh] p-6'}>
            <div className={compact ? '' : 'bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-10 max-w-md w-full text-center'}>
                <div className="mx-auto w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4 relative">
                    <Icon size={20} className="text-red-600" />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-100 flex items-center justify-center"><Lock size={10} className="text-gray-500" /></span>
                </div>
                <h2 className="text-lg font-black text-gray-900">{title} is a paid feature</h2>
                <p className="text-sm text-gray-500 mt-2">{pitch}</p>
                <p className="text-sm text-gray-700 font-semibold mt-4">To subscribe, contact KTM Sports through a support ticket.</p>
                <button type="button" onClick={() => contactSupport(feature)} className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-black rounded-xl shadow-sm transition-colors">
                    <LifeBuoy size={15} /> Contact support
                </button>
            </div>
        </div>
    )
}

// Shows `children` unless the club has not subscribed. While the answer loads it shows nothing, so a locked club never sees the real screen flash by.
export function PaidGate({ feature, children, compact = false }: { feature: PaidFeatureId; children: React.ReactNode; compact?: boolean }) {
    const { loading, locked } = useSubscription()
    if (loading) return compact ? <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" /> : null
    if (locked) return <PaidFeature feature={feature} compact={compact} />
    return <>{children}</>
}

// A strip at the top of the dashboard while the subscription is about to end, in its grace period, or over.
export function SubscriptionBanner() {
    const { sub, contactSupport } = useSubscription()
    if (!sub || sub.state === 'none') return null
    let text = ''
    let tone = 'bg-amber-50 border-amber-200 text-amber-800'
    if (sub.state === 'lapsed') {
        tone = 'bg-red-50 border-red-200 text-red-800'
        text = sub.suspended ? 'Your Club management subscription is suspended. You can view your records, but not add or change them.' : `Your Club management subscription ended${sub.expiresOn ? ` on ${sub.expiresOn}` : ''}. You can view your records, but not add or change them.`
    } else if (sub.state === 'grace') {
        text = `Your Club management subscription ended on ${sub.expiresOn}. Everything keeps working for ${sub.graceDaysLeft} more day${sub.graceDaysLeft === 1 ? '' : 's'}; renew to avoid interruption.`
    } else if (sub.daysLeft !== null && sub.daysLeft <= 14) {
        text = `Your Club management subscription ends on ${sub.expiresOn} (${sub.daysLeft} day${sub.daysLeft === 1 ? '' : 's'} left).`
    } else return null
    return (
        <div role="status" className={`flex items-center gap-3 flex-wrap px-4 sm:px-6 py-2.5 border-b text-sm font-semibold ${tone}`}>
            <AlertTriangle size={15} className="flex-shrink-0" />
            <span className="flex-1 min-w-0">{text}</span>
            <button type="button" onClick={() => contactSupport()} className="underline underline-offset-2 font-black whitespace-nowrap">Contact support to renew</button>
        </div>
    )
}
