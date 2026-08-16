'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, ArrowLeft, LifeBuoy } from 'lucide-react'
import { useTenant } from '@/app/providers/TenantProvider'
import NewTicketForm from './NewTicketForm'
import SupportPanel from './SupportPanel'

interface SupportPageClientProps {
    user: { name: string | null; email: string } | null
}

export default function SupportPageClient({ user }: SupportPageClientProps) {
    const tenant = useTenant()
    const [submitted, setSubmitted] = useState(false)

    return (
        <main className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-12">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <Link href="/">
                        {tenant.logoUrl ? (
                            <Image
                                src={tenant.logoUrl}
                                alt={tenant.name}
                                width={64}
                                height={64}
                                className="mx-auto mb-4 rounded-xl object-contain"
                            />
                        ) : (
                            <div
                                className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: tenant.primaryColor }}
                            >
                                <LifeBuoy className="w-8 h-8 text-white" />
                            </div>
                        )}
                    </Link>
                    <h1 className="text-2xl font-black text-gray-900">Support</h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        Having trouble? Let us know and we'll help you out.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
                    {user ? (
                        <SupportPanel userName={user.name} userEmail={user.email} />
                    ) : submitted ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="w-14 h-14 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-7 h-7 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">We've received your request</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Check your email for a confirmation — we'll get back to you soon.
                                </p>
                            </div>
                            <Link
                                href="/"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
                            >
                                <ArrowLeft size={14} /> Back to home
                            </Link>
                        </div>
                    ) : (
                        <NewTicketForm mode="guest" onSuccess={() => setSubmitted(true)} />
                    )}
                </div>
            </div>
        </main>
    )
}
