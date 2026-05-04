import { getTenant } from '@/lib/tenant'
import WotfGlobalPrivacyPage from '@/components/landing/wotf-global/pages/PrivacyPage'

export default async function PrivacyPolicyPage() {
    const tenant = await getTenant()

    if (tenant.slug === 'wotf-global') {
        return <WotfGlobalPrivacyPage />
    }

    return (
        <main className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-black text-white">Privacy Policy</h1>
                    <p className="mt-4 text-red-100">Last updated: January 2026</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="prose prose-gray max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
                        <p className="text-gray-600 mb-4">
                            When you use KTM Taekwondo Manager, we collect information that you provide directly to us, including:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>Account information (name, email address)</li>
                            <li>Profile information (club affiliation, belt rank)</li>
                            <li>Tournament registration data</li>
                            <li>Contact information for club management</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
                        <p className="text-gray-600 mb-4">
                            We use the information we collect to:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Process tournament registrations and manage events</li>
                            <li>Communicate with you about tournaments and updates</li>
                            <li>Generate brackets, schedules, and results</li>
                            <li>Ensure fair competition through athlete verification</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
                        <p className="text-gray-600 mb-4">
                            We may share your information in the following circumstances:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>With tournament organizers for event management purposes</li>
                            <li>Publicly displaying athlete names and results during and after tournaments</li>
                            <li>With your club master for team management</li>
                            <li>When required by law or to protect our rights</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
                        <p className="text-gray-600">
                            We implement appropriate technical and organizational measures to protect your personal information
                            against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission
                            over the Internet is 100% secure.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Your Rights</h2>
                        <p className="text-gray-600 mb-4">
                            You have the right to:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>Access and update your personal information</li>
                            <li>Request deletion of your account and data</li>
                            <li>Opt out of marketing communications</li>
                            <li>Export your data in a portable format</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Contact Us</h2>
                        <p className="text-gray-600">
                            If you have any questions about this Privacy Policy, please contact us at{' '}
                            <a href="mailto:privacy@ktm.com" className="text-red-600 hover:text-red-700">privacy@ktm.com</a>.
                        </p>
                    </section>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} KTM Taekwondo Manager. Built for the Taekwondo community.
                    </p>
                </div>
            </footer>
        </main>
    )
}
