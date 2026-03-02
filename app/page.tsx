import { prisma } from '@/lib/prisma'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { fetchLandingPageEvents } from '@/app/actions'
import LandingPage from '@/components/LandingPage'
import { getTenant } from '@/lib/tenant'
import WOTFLandingPage from '@/components/landing/wotf/pages/LandingPage'

const ADMIN_EMAILS = ['ericjann21@gmail.com']

export default async function Home() {
  const user = await currentUser()
  const tenant = await getTenant()

  // Non-KTM tenant handling
  if (tenant.slug !== 'ktm') {
    if (user) {
      // Authenticated tenant user → redirect to their dashboard (with tenant param)
      const existingTenantUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        select: { role: true }
      })
      const tenantQs = `?tenant=${tenant.slug}`
      if (existingTenantUser?.role === 'ATHLETE') {
        redirect(`/athlete${tenantQs}`)
      } else if (existingTenantUser?.role === 'CLUB_MASTER' || existingTenantUser?.role === 'ASSISTANT_CLUB_MASTER') {
        redirect(`/club${tenantQs}`)
      }
    }
    // Unauthenticated visitor → show org-specific landing
    return <WOTFLandingPage />
  }
  if (user) {
    const userEmail = user.emailAddresses[0]?.emailAddress

    // Parallel fetch all needed data upfront
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true, role: true, imageUrl: true }
    })

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
              name: user.firstName ? `${user.firstName} ${user.lastName}` : existingByEmail.name,
              imageUrl: user.imageUrl
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
              clubName: 'KTM Admin',
              imageUrl: user.imageUrl
            }
          })
        }
      }
      redirect('/admin')
    }

    // Organizations now use approval flow instead of invites

    // New user without invite - redirect to account error page (Zombie State prevention)
    if (!existingUser) {
      redirect('/account-error')
    }


    // For existing users, redirect to their role-specific dashboard
    if (existingUser) {
      if (existingUser.role === 'ORGANIZER') {
        // Check organization status before redirecting
        const organization = await prisma.organization.findUnique({
          where: { ownerId: existingUser.id },
          select: { status: true, name: true }
        })

        if (organization?.status === 'PENDING') {
          redirect('/organization/pending')
        } else if (organization?.status === 'REJECTED') {
          redirect('/organization/rejected')
        }
        redirect('/organization')
      } else if (existingUser.role === 'CLUB_MASTER') {
        redirect('/club')
      } else if (existingUser.role === 'ATHLETE') {
        redirect('/athlete')
      } else if (existingUser.role === 'MANAGER') {
        redirect('/organization?tab=events')
      }
      // If role is user/null/etc, they stay on landing page? 
      // Or maybe redirect to onboarding if somehow roleless?
      // Assuming they stay on landing page if no specific dashboard role.
    }

  }

  const currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  // Fetch landing page data in parallel
  const [allEvents, athleteCount, tournamentCount, clubCount] = await Promise.all([
    fetchLandingPageEvents(),
    prisma.user.count(),
    prisma.tournament.count(),
    prisma.club.count(),
  ])


  // Prepare serializable user data for client component
  const userData = user ? {
    isLoggedIn: true,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl
  } : null

  return (
    <LandingPage
      upcomingTournaments={allEvents}
      user={userData}
      stats={{ athletes: athleteCount, tournaments: tournamentCount, clubs: clubCount }}
    />
  )
}
