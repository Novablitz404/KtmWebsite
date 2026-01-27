import { currentUser } from '@clerk/nextjs/server'
import { SignOutButton } from '@clerk/nextjs'
import Image from 'next/image'

export default async function AccountErrorPage() {
    const user = await currentUser()

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto w-24 h-24 mb-4 relative">
                    <Image
                        src="/KTMLogo.png"
                        alt="KTM Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Account Status Verification
                </h2>
                <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
                    <div className="rounded-full bg-yellow-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>

                    <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Not Found</h3>

                    <p className="text-sm text-gray-600 mb-6">
                        We detected a login session ({user?.emailAddresses?.[0]?.emailAddress}), but your user profile is missing from our database.
                    </p>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        <p className="text-xs text-gray-500 font-bold uppercase mb-2">Why am I seeing this?</p>
                        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                            <li>The signup process was interrupted.</li>
                            <li>The system database was recently reset.</li>
                            <li>Your account uses a specialized role requiring manual activation.</li>
                        </ul>
                    </div>

                    <p className="text-sm text-gray-900 font-bold mb-6">
                        Please contact the system administrator to reset or restore your account.
                    </p>

                    <div className="flex justify-center">
                        <SignOutButton>
                            <button className="text-red-600 font-bold hover:text-red-800 text-sm flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
                                Sign Out
                            </button>
                        </SignOutButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
