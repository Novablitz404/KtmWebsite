import { getTenant } from '@/lib/tenant'

export default async function SeminarsLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const tenant = await getTenant()

    // Non-KTM tenants: wrap with a background color, but no Navbar/Footer here.
    // The Navbar and Footer are conditionally rendered in the page.tsx so they don't cover the manager view.
    if (tenant.slug !== 'ktm') {
        return (
            <div className="min-h-screen bg-gray-50/50">
                {children}
            </div>
        )
    }

    // KTM: just render children (KTM has its own Header in root layout)
    return <>{children}</>
}
