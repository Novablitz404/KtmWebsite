import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { fetchLandingPageEvents } from '@/app/actions'
import HomeClient from './HomeClient'

const ADMIN_EMAILS = ['ericjann21@gmail.com']

export default async function Home() {
  const user = await currentUser()

  // Role-based redirects for logged-in users
  if (user) {
    const userEmail = user.emailAddresses[0]?.emailAddress

    // Parallel fetch all needed data upfront
    const [existingUser, pendingOrganizerInvite] = await Promise.all([
      prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true }
      }),
      userEmail ? prisma.organizationInvite.findUnique({ where: { email: userEmail } }) : null
    ])

    // Admin setup (whitelist based) - still redirect admins to admin panel
    if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
      if (!existingUser || existingUser.role !== 'ADMIN') {
        // Check if a user with this email already exists (might have different clerkId)
        const existingByEmail = await prisma.user.findUnique({ where: { email: userEmail } })

        if (existingByEmail) {
          // Update existing user's clerkId and role
          await prisma.user.update({
            where: { email: userEmail },
            data: {
              clerkId: user.id,
              role: 'ADMIN',
              name: user.firstName ? `${user.firstName} ${user.lastName}` : existingByEmail.name
            }
          })
        } else {
          // Generate unique ID for new admin
          const generateId = () => String(Math.floor(10000 + Math.random() * 90000))
          let adminId = generateId()
          while (await prisma.user.findUnique({ where: { id: adminId } })) {
            adminId = generateId()
          }

          await prisma.user.create({
            data: {
              id: adminId,
              clerkId: user.id,
              email: userEmail,
              name: user.firstName ? `${user.firstName} ${user.lastName}` : 'Super Admin',
              role: 'ADMIN',
              clubName: 'KTM Admin'
            }
          })
        }
      }
      redirect('/admin')
    }

    // Handle pending organizer invite - auto-create user and redirect
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
      await prisma.organizationInvite.delete({ where: { id: pendingOrganizerInvite.id } })
      redirect('/organizer-tournaments')
    }

    // New user without invite - redirect to onboarding
    if (!existingUser) {
      redirect('/onboarding')
    }


    // For existing users, redirect to their role-specific dashboard
    if (existingUser) {
      if (existingUser.role === 'ORGANIZER') {
        redirect('/organization')
      } else if (existingUser.role === 'CLUB_MASTER') {
        redirect('/club')
      } else if (existingUser.role === 'ATHLETE') {
        redirect('/athlete')
      } else if (existingUser.role === 'MANAGER') {
        redirect('/organizer-tournaments')
      }
      // If role is user/null/etc, they stay on landing page? 
      // Or maybe redirect to onboarding if somehow roleless?
      // Assuming they stay on landing page if no specific dashboard role.
    }

  }

  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  // Fetch upcoming events via server action (for TanStack Query hydration)
  const allEvents = await fetchLandingPageEvents()


  // Prepare serializable user data for client component
  const userData = user ? {
    isLoggedIn: true,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl
  } : null

  return (
    <HomeClient upcomingTournaments={allEvents} user={userData} />
  )
}
