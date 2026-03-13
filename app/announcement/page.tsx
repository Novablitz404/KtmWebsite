import { prisma } from '@/lib/prisma'
import { getTenant } from '@/lib/tenant'
import GlobalAnnouncementPage from '@/components/landing/wotf-global/pages/AnnouncementPage'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AnnouncementPage() {
    const tenant = await getTenant()

    // Only WOTF Global uses this route
    if (tenant.slug !== 'wotf-global') {
        redirect('/')
    }

    const orgId = tenant.id
    let events: { id: string; name: string; type: string; date: string; venue: string | null }[] = []

    if (orgId) {
        const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { ownerId: true } })

        const [tournaments, seminars] = await Promise.all([
            org?.ownerId ? prisma.tournament.findMany({
                where: { organizerId: org.ownerId, status: { not: 'CANCELLED' } },
                select: { id: true, name: true, startDate: true, venue: true },
                orderBy: { startDate: 'desc' },
                take: 20,
            }) : Promise.resolve([]),
            prisma.seminar.findMany({
                where: { organizationId: orgId, status: { not: 'CANCELLED' } },
                select: { id: true, name: true, startDate: true, venue: true },
                orderBy: { startDate: 'desc' },
                take: 20,
            }),
        ])

        events = [
            ...tournaments.map(t => ({ id: t.id, name: t.name, type: 'Tournament', date: t.startDate.toISOString(), venue: t.venue })),
            ...seminars.map(s => ({ id: s.id, name: s.name, type: 'Seminar', date: s.startDate.toISOString(), venue: s.venue })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    return <GlobalAnnouncementPage events={events} />
}
