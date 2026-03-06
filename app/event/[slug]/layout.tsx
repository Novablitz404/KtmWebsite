import '@/app/globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

/**
 * Standalone layout for event landing pages.
 * No main site navigation, no auth provider — guests can access freely.
 */
export default function EventLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className={`${inter.className} min-h-screen bg-gray-50`}>
            {children}
        </div>
    )
}
