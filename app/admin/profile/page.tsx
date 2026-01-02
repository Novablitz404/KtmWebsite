import { currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import EditProfileButton from './EditProfileButton'

export default async function AdminProfilePage() {
    const user = await currentUser()
    if (!user) redirect('/sign-in')

    const dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } })
    if (!dbUser || dbUser.role !== 'ADMIN') redirect('/')

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Profile</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Identity Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-900 to-purple-800 h-32"></div>
                        <div className="px-6 pb-6 text-center">
                            <div className="relative -mt-16 mb-4 inline-block">
                                {user.imageUrl ? (
                                    <img
                                        src={user.imageUrl}
                                        alt={dbUser.name || 'Admin'}
                                        className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                                    />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center text-6xl">
                                        🛡️
                                    </div>
                                )}
                            </div>

                            <h2 className="text-xl font-bold text-gray-900 mb-1">{dbUser.name}</h2>
                            <p className="text-gray-500 text-sm mb-4">{dbUser.email}</p>

                            <div className="flex flex-wrap justify-center gap-2 mb-6">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
                                    🛡️ Super Admin
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 shadow-sm">
                                    • Active
                                </span>
                            </div>

                            <div className="border-t border-gray-100 pt-6">
                                <EditProfileButton />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Details & Settings */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Account Details Panel */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-100 pb-2">
                            Account Information
                        </h3>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                            <div>
                                <dt className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-1">Role</dt>
                                <dd className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">Administrator</dd>
                            </div>
                            <div>
                                <dt className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-1">User ID</dt>
                                <dd className="text-gray-900 font-medium font-mono bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{dbUser.id}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-1">Email Address</dt>
                                <dd className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{dbUser.email}</dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-xs uppercase tracking-wider font-semibold text-gray-500 mb-1">Club Association</dt>
                                <dd className="text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                    {dbUser.clubName || (
                                        <span className="text-gray-400 italic">No club associated (Global Admin)</span>
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </div>

                </div>
            </div>
        </div>
    )
}
