import { prisma } from '@/lib/prisma'
import MyEventsView from './MyEventsView'

export default async function EventsTabContent({ userId }: { userId: string }) {
    // Fetch players with full tournament details needed for MyEventsView
    const players = await prisma.player.findMany({
        where: {
            userId: userId
        },
        include: {
            category: {
                include: {
                    tournament: true
                }
            }
        }
    })

    return <MyEventsView players={players as any} />
}
