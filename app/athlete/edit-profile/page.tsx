
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import ProfileEditForm from '@/app/settings/ProfileEditForm'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default async function EditProfilePage() {
    const clerkUser = await currentUser()
    if (!clerkUser) redirect('/')

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: {
            id: true,
            name: true,
            email: true,
            clubName: true,
            belt: true,
            gender: true,
            weight: true,
            height: true,
            birthDate: true,
            role: true,
        },
    })

    if (!dbUser) redirect('/')

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 h-16 flex items-center justify-between shadow-sm">
                <Link href="/athlete/dashboard?tab=settings" className="p-2 -ml-2 hover:bg-gray-50 rounded-full text-gray-600">
                    <ChevronLeft size={24} />
                </Link>
                <h1 className="text-lg font-bold text-gray-900">Edit Profile</h1>
                <div className="w-10" /> {/* Spacer for centering */}
            </div>

            <div className="max-w-lg mx-auto p-6 md:p-8">
                <ProfileEditForm
                    user={dbUser}
                    initialImageUrl={clerkUser.imageUrl}
                    redirectOnSuccess="/athlete/dashboard?tab=settings"
                />
            </div>
        </div>
    )
}
