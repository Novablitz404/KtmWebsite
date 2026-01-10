import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import HomeClient from './HomeClient'

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

    // Existing user - let them view the home page
    if (!existingUser) {
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
    take: 6
  })

  return (
    <HomeClient upcomingTournaments={upcomingTournaments} user={user} />
  )
}
