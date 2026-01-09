export default function TermsOfServicePage() {
    return (
        <main className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-black text-white">Terms of Service</h1>
                    <p className="mt-4 text-red-100">Last updated: January 2026</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="prose prose-gray max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-600">
                            By accessing or using KTM Tournament Manager ("the Service"), you agree to be bound by these
                            Terms of Service. If you do not agree to these terms, please do not use the Service.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
                        <p className="text-gray-600">
                            KTM Tournament Manager provides a platform for Taekwondo tournament management, including but not
                            limited to athlete registration, bracket generation, real-time scoring, and results publication.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
                        <p className="text-gray-600 mb-4">
                            To access certain features, you must create an account. You agree to:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>Provide accurate and complete information</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Notify us immediately of any unauthorized use</li>
                            <li>Accept responsibility for all activities under your account</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. User Conduct</h2>
                        <p className="text-gray-600 mb-4">
                            You agree not to:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>Provide false or misleading athlete information</li>
                            <li>Interfere with or disrupt the Service</li>
                            <li>Attempt to gain unauthorized access to any systems</li>
                            <li>Use the Service for any unlawful purpose</li>
                            <li>Harass, abuse, or harm other users</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Tournament Participation</h2>
                        <p className="text-gray-600 mb-4">
                            By registering for tournaments through our platform:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>You confirm that all athlete information is accurate</li>
                            <li>You agree to comply with tournament rules and regulations</li>
                            <li>You acknowledge that registration fees may be non-refundable</li>
                            <li>You consent to results being publicly displayed</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual Property</h2>
                        <p className="text-gray-600">
                            The Service and its original content, features, and functionality are owned by KTM Tournament Manager
                            and are protected by international copyright, trademark, and other intellectual property laws.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Limitation of Liability</h2>
                        <p className="text-gray-600">
                            KTM Tournament Manager shall not be liable for any indirect, incidental, special, consequential,
                            or punitive damages resulting from your use or inability to use the Service, including but not
                            limited to tournament scheduling conflicts, scoring errors, or data loss.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Changes to Terms</h2>
                        <p className="text-gray-600">
                            We reserve the right to modify these terms at any time. We will notify users of significant changes
                            by posting a notice on our platform. Continued use of the Service after changes constitutes acceptance
                            of the new terms.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact Us</h2>
                        <p className="text-gray-600">
                            If you have any questions about these Terms of Service, please contact us at{' '}
                            <a href="mailto:legal@ktm.com" className="text-red-600 hover:text-red-700">legal@ktm.com</a>.
                        </p>
                    </section>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 py-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-400 text-sm">
                        © {new Date().getFullYear()} KTM Tournament Manager. Built for the Taekwondo community.
                    </p>
                </div>
            </footer>
        </main>
    )
}
