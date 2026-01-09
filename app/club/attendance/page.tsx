import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AttendanceDashboard from './AttendanceDashboard'

export const revalidate = 30

// Helper to get date range based on view
function getDateRange(dateStr: string, view: 'daily' | 'weekly' | 'monthly') {
    const date = new Date(dateStr)
    const start = new Date(date)
    const end = new Date(date)

    if (view === 'daily') {
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
    } else if (view === 'weekly') {
        // Start on Monday
        const day = start.getDay()
        const diff = start.getDate() - day + (day === 0 ? -6 : 1)
        start.setDate(diff)
        start.setHours(0, 0, 0, 0)

        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)
    } else if (view === 'monthly') {
        start.setDate(1)
        start.setHours(0, 0, 0, 0)

        end.setMonth(end.getMonth() + 1)
        end.setDate(0)
        end.setHours(23, 59, 59, 999)
    }

    return { start, end }
}

export default async function ClubAttendancePage(props: { searchParams: Promise<{ date?: string; view?: string }> }) {
    const searchParams = await props.searchParams
    const clerkUser = await currentUser()

    if (!clerkUser) {
        redirect('/sign-in')
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: {
            id: true,
            role: true,
            clubName: true,
            club: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true,
                    kioskToken: true,
                    kioskPin: true
                }
            }
        }
    })

    if (!dbUser) {
        redirect('/onboarding')
    }

    // Check role
    if (dbUser.role !== 'CLUB_MASTER' && dbUser.role !== 'ASSISTANT_CLUB_MASTER') {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-4xl mb-4">🔒</p>
                    <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
                    <p className="text-gray-500">Only Club Masters can access attendance.</p>
                </div>
            </main>
        )
    }

    // Get club
    let club = dbUser.club
    if (!club && dbUser.clubName) {
        club = await prisma.club.findFirst({
            where: { name: dbUser.clubName },
            select: {
                id: true,
                name: true,
                logoUrl: true,
                kioskToken: true,
                kioskPin: true
            }
        })
    }

    if (!club) {
        return (
            <main className="min-h-[calc(100vh-4rem)] bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-4xl mb-4">🏫</p>
                    <h1 className="text-xl font-bold text-gray-900">No Club Found</h1>
                    <p className="text-gray-500">Please set up your club first.</p>
                </div>
            </main>
        )
    }

    // Parse params
    const view = (searchParams.view as 'daily' | 'weekly' | 'monthly') || 'daily'
    const dateStr = searchParams.date || new Date().toISOString().split('T')[0]
    const { start, end } = getDateRange(dateStr, view)

    // Get attendance records for range
    const [attendanceRecords, totalMembers, enrolledCount] = await Promise.all([
        prisma.attendanceRecord.findMany({
            where: {
                clubId: club.id,
                date: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        clerkId: true
                    }
                }
            },
            orderBy: { checkInTime: 'desc' }
        }),
        prisma.user.count({
            where: { clubName: club.name, role: 'ATHLETE' }
        }),
        prisma.user.count({
            where: { clubName: club.name, role: 'ATHLETE', faceDescriptor: { not: null } }
        })
    ])

    // Fetch avatars
    const clerkIds = attendanceRecords.map(r => r.user.clerkId).filter(Boolean)
    let avatars: Record<string, string> = {}

    if (clerkIds.length > 0) {
        try {
            const users = await (await clerkClient()).users.getUserList({
                userId: Array.from(new Set(clerkIds)),
                limit: 50
            })
            users.data.forEach(u => {
                avatars[u.id] = u.imageUrl
            })
        } catch (e) {
            console.error('Failed to fetch avatars:', e)
        }
    }

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <AttendanceDashboard
                    club={club}
                    records={attendanceRecords}
                    avatars={avatars}
                    stats={{
                        totalMembers,
                        enrolledCount,
                        periodCount: attendanceRecords.length
                    }}
                    userRole={dbUser.role}
                    currentDate={dateStr}
                    currentView={view}
                />
            </div>
        </main>
    )
}
