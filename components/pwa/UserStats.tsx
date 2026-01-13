import { prisma } from '@/lib/prisma'

export default async function UserStats({ userId }: { userId: string }) {
    const tournamentsJoined = await prisma.player.count({
        where: { userId }
    })

    return (
        <div className="px-4 -mt-8 relative z-10">
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{tournamentsJoined}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Events</div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                    <div className="text-2xl font-bold text-amber-500">0</div>
                    <div className="text-xs text-gray-500 mt-0.5">Medals</div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
                    <div className="text-2xl font-bold text-gray-400">-</div>
                    <div className="text-xs text-gray-500 mt-0.5">Rank</div>
                </div>
            </div>
        </div>
    )
}
