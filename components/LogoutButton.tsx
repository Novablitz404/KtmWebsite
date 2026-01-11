'use client'

import { SignOutButton } from '@clerk/nextjs'

export default function LogoutButton() {
    return (
        <SignOutButton redirectUrl="/sign-in">
            <button className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-50 text-red-600 font-medium text-sm hover:bg-red-100 active:scale-[0.98] transition-all border border-red-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
            </button>
        </SignOutButton>
    )
}
