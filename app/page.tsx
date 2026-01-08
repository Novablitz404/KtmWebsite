import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

const ADMIN_EMAILS = ['ericjann21@gmail.com']

export default async function Home() {
  const user = await currentUser()

  // Role-based redirects for logged-in users
  if (user) {
    const userEmail = user.emailAddresses[0]?.emailAddress

    // Parallel fetch all needed data upfront
    const [existingUser, pendingOrganizerInvite, pendingClubMasterInvite] = await Promise.all([
      prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true }
      }),
      userEmail ? prisma.organizerInvite.findUnique({ where: { email: userEmail } }) : null,
      userEmail ? prisma.clubMasterInvite.findUnique({ where: { email: userEmail } }) : null
    ])

    // Admin redirect (whitelist based)
    if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
      if (!existingUser || existingUser.role !== 'ADMIN') {
        await prisma.user.upsert({
          where: { clerkId: user.id },
          update: { role: 'ADMIN' },
          create: {
            id: '00000',
            clerkId: user.id,
            email: userEmail,
            name: user.firstName ? `${user.firstName} ${user.lastName}` : 'Super Admin',
            role: 'ADMIN',
            clubName: 'KTM Admin'
          }
        })
      }
      redirect('/admin')
    }

    // Handle pending organizer invite
    if (pendingOrganizerInvite && userEmail) {
      const generateId = () => String(Math.floor(10000 + Math.random() * 90000))
      let newId = generateId()
      while (await prisma.user.findUnique({ where: { id: newId } })) {
        newId = generateId()
      }

      await prisma.user.create({
        data: {
          id: newId,
          clerkId: user.id,
          email: userEmail,
          name: pendingOrganizerInvite.name || user.firstName ? `${user.firstName} ${user.lastName}` : 'Organizer',
          role: 'ORGANIZER'
        }
      })
      await prisma.organizerInvite.delete({ where: { id: pendingOrganizerInvite.id } })
      redirect('/manage')
    }

    // Handle pending Club Master invite - redirect to onboarding to collect their details
    if (pendingClubMasterInvite && userEmail) {
      redirect('/onboarding')
    }

    // Existing user redirects
    if (existingUser) {
      // Club Master redirect
      if (existingUser.role === 'CLUB_MASTER' || existingUser.role === 'ASSISTANT_CLUB_MASTER') {
        redirect('/profile')
      }

      // Organizer/Manager redirect
      if (existingUser.role === 'ORGANIZER' || existingUser.role === 'MANAGER') {
        redirect('/manage')
      }

      // Athlete redirect
      if (existingUser.role === 'ATHLETE') {
        redirect('/profile')
      }
    } else {
      // User doesn't exist in our DB & wasn't an Admin/Invite -> New User Onboarding
      redirect('/onboarding')
    }
  }

  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  // Fetch upcoming tournaments
  const upcomingTournaments = await prisma.tournament.findMany({
    where: {
      startDate: { gte: currentDate }
    },
    orderBy: { startDate: 'asc' },
    take: 3
  })

  // Fetch ongoing tournaments (example logic: started but not extremely old? Or same as above but highlighted?)
  // For simplicity, Ongoing = Started today or recently.
  // Actually, let's just show "Upcoming Events".

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <div className="bg-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24 text-center">
          <h1 className="text-3xl font-extrabold sm:text-5xl md:text-6xl tracking-tight">
            KTM Tournament Manager
          </h1>
          <p className="mt-4 text-base sm:text-xl text-indigo-100 max-w-2xl mx-auto">
            The premier platform for Taekwondo tournament management, scoring, and rankings.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/tournaments"
              className="px-6 py-2.5 sm:px-8 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-gray-50 md:text-lg"
            >
              Browse Tournaments
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Upcoming Tournaments */}
        <section className="mb-16">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Tournaments</h2>
            <Link href="/tournaments" className="text-indigo-600 hover:text-indigo-500 font-medium">
              View All →
            </Link>
          </div>

          {upcomingTournaments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-500">No upcoming tournaments scheduled.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {upcomingTournaments.map((tournament, index) => {
                const isCancelled = tournament.status === 'CANCELLED'
                // Calculate Registration Status
                const now = new Date()
                const regStart = tournament.registrationStart ? new Date(tournament.registrationStart) : null
                const regEnd = tournament.registrationEnd ? new Date(tournament.registrationEnd) : null

                let statusBadge = null
                if (isCancelled) {
                  statusBadge = (
                    <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                      Cancelled
                    </span>
                  )
                } else if (regEnd && now > regEnd) {
                  statusBadge = (
                    <span className="bg-gray-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                      Closed
                    </span>
                  )
                } else if (regStart && now < regStart) {
                  statusBadge = (
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                      Opening Soon
                    </span>
                  )
                } else {
                  statusBadge = (
                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                      Registration Open
                    </span>
                  )
                }

                const CardContent = (
                  <>
                    <div className={`h-32 bg-gray-100 relative ${isCancelled ? 'grayscale opacity-75' : ''}`}>
                      {tournament.headerImageUrl ? (
                        <Image
                          src={tournament.headerImageUrl}
                          alt={tournament.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                          priority={index < 3}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-4xl">
                          🏆
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        {statusBadge}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className={`font-bold text-lg truncate ${isCancelled ? 'text-gray-500' : 'text-gray-900 group-hover:text-indigo-600'}`}>
                        {tournament.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-2">
                        📅 {new Date(tournament.startDate).toLocaleDateString()}
                      </p>
                      {tournament.venue && (
                        <p className="text-sm text-gray-500 mt-1">
                          📍 {tournament.venue}
                        </p>
                      )}
                    </div>
                  </>
                )

                if (isCancelled) {
                  return (
                    <div key={tournament.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden opacity-80 cursor-not-allowed">
                      {CardContent}
                    </div>
                  )
                }

                return (
                  <Link
                    key={tournament.id}
                    href={`/tournament/${tournament.id}`}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group block"
                  >
                    {CardContent}
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        {/* Rankings Preview */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Top Rankings</h2>
            <span className="text-gray-400 text-sm font-medium cursor-not-allowed">
              View Full Rankings →
            </span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-4xl mb-4">📊</p>
            <h3 className="text-lg font-medium text-gray-900">Ranking System Coming Soon</h3>
            <p className="mt-2 text-gray-500">
              Track athlete performance and club standings across all tournaments.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
