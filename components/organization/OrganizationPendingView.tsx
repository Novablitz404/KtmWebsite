'use client'

import React from 'react'
import { SignOutButton } from '@clerk/nextjs'
import { Building2 } from 'lucide-react'

interface OrganizationPendingViewProps {
    organizationName: string
    userEmail: string
}

export default function OrganizationPendingView({ organizationName, userEmail }: OrganizationPendingViewProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-red-600" />
                    </div>
                </div>

                <h2 className="text-center text-3xl font-bold text-gray-900">
                    Pending Approval
                </h2>
                <p className="mt-3 text-center text-gray-600">
                    Your organization registration is under review
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-6 shadow-lg sm:rounded-2xl border border-gray-100">
                    <div className="space-y-6">
                        {/* Organization Info */}
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full text-red-700 font-semibold text-sm mb-4">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                Awaiting Admin Approval
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-1">{organizationName}</h3>
                            <p className="text-sm text-gray-500">{userEmail}</p>
                        </div>

                        {/* Info Box */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-2">What happens next?</h4>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 font-bold">1.</span>
                                    Our admin team will review your registration
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 font-bold">2.</span>
                                    You'll receive an email once approved
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-red-500 font-bold">3.</span>
                                    Sign in again to access your dashboard
                                </li>
                            </ul>
                        </div>

                        {/* Estimated Time */}
                        <div className="text-center py-3 bg-blue-50 rounded-xl border border-blue-100">
                            <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold mb-1">Typical Review Time</p>
                            <p className="text-lg font-bold text-blue-900">24-48 hours</p>
                        </div>

                        {/* Log Out Button */}
                        <SignOutButton>
                            <button className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-sm transition-colors">
                                Log Out
                            </button>
                        </SignOutButton>
                    </div>
                </div>
            </div>
        </div>
    )
}
