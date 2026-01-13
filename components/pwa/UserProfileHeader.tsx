import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'

export default async function UserProfileHeader({ userId }: { userId: string }) {
    // Artificial delay to demonstrate skeleton if needed, but omitted for prod
    const [dbUser, clerkUser] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                name: true,
                clubName: true,
                belt: true
            }
        }),
        currentUser()
    ])

    if (!dbUser) return null

    return (
        <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 pt-8 pb-16 px-4">
            <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center mb-3 shadow-lg overflow-hidden">
                    {clerkUser?.imageUrl ? (
                        <img
                            src={clerkUser.imageUrl}
                            alt={dbUser.name || 'Athlete'}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="text-3xl">🥋</span>
                    )}
                </div>
                <h1 className="text-xl font-bold text-white">
                    {dbUser.name || 'Athlete'}
                </h1>
                <p className="text-white/80 text-sm mt-0.5">
                    {dbUser.clubName || 'Independent'}
                </p>
                {dbUser.belt && (
                    <span className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-sm ${dbUser.belt === 'Black' ? 'bg-black text-white' :
                        dbUser.belt === 'Red' ? 'bg-red-100 text-red-800' :
                            dbUser.belt === 'Blue' ? 'bg-blue-100 text-blue-800' :
                                dbUser.belt === 'Yellow' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-white/90 text-gray-800'
                        }`}>
                        {dbUser.belt} Belt
                    </span>
                )}
            </div>
        </div>
    )
}
