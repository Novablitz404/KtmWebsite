'use client'

import React from 'react'
import { useAuth } from '@/app/providers/AuthProvider'

interface ClubPendingViewProps {
    organizationName?: string
    userEmail: string
}

export default function ClubPendingView({ organizationName, userEmail }: ClubPendingViewProps) {
    const { signOut } = useAuth()
    // Calculate 4 hours from now
    const now = new Date()
    const futureDate = new Date(now.getTime() + 4 * 60 * 60 * 1000)

    // Format Date: e.g., "Monday, July 12 2026"
    const dateString = futureDate.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    // Format Time: e.g., "2:30 PM"
    const timeString = futureDate.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    })

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center text-6xl mb-4">
                    ⏳
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Waiting for Approval
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Your club registration has been submitted.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
                    <div className="space-y-6">
                        <div className="text-center">
                            <p className="text-gray-700 text-lg mb-4">
                                Waiting for approval from <span className="font-bold text-indigo-600">{organizationName || 'the Organization'}</span>.
                            </p>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 my-6">
                                <p className="text-sm text-blue-800 mb-1 font-medium">Estimated Review Time</p>
                                <p className="text-blue-900 text-sm">
                                    Please sign in again around<br />
                                    <span className="font-bold text-lg">{timeString}</span> on <span className="font-medium">{dateString}</span>.
                                </p>
                            </div>


                        </div>

                        <div className="mt-6">
                            <button
                                onClick={() => signOut()}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
