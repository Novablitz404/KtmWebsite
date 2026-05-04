"use client";

import { I18nProvider, useI18n } from '../i18n';
import GlobalNavbar from '../GlobalNavbar';
import GlobalFooter from '../GlobalFooter';

function TermsPageInner() {
    const { t } = useI18n();

    return (
        <main className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            <GlobalNavbar />

            {/* Page Header */}
            <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-[#0A0A0A] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-[#0A0A0A]" />
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-wider animate-hero-fade-in-delayed-1">
                        Terms of Service
                    </h1>
                    <p className="mt-4 text-gray-400 text-sm md:text-base max-w-lg mx-auto">
                        Last updated: January 2026
                    </p>
                </div>
            </section>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="prose prose-gray max-w-none">
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-600">
                            By accessing or using the World Olympics Taekwondo Federation (WOTF) Global platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
                        <p className="text-gray-600">
                            WOTF Global provides a platform for managing Taekwondo events, international memberships, club affiliations, and athlete registrations across the globe.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
                        <p className="text-gray-600 mb-4">
                            To access certain features, you must create an account. You agree to:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>Provide accurate, current, and complete information</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Notify us immediately of any unauthorized use of your account</li>
                            <li>Accept responsibility for all activities under your account</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Event Participation</h2>
                        <p className="text-gray-600 mb-4">
                            By registering for seminars and tournaments through our platform:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>You confirm that all athlete and participant information is accurate</li>
                            <li>You agree to comply with WOTF international rules and regulations</li>
                            <li>You acknowledge that registration fees may be non-refundable according to the specific event's policy</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Intellectual Property</h2>
                        <p className="text-gray-600">
                            The Service and its original content, features, and functionality are owned by WOTF and are protected by international copyright, trademark, and other intellectual property laws.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Contact Us</h2>
                        <p className="text-gray-600">
                            If you have any questions about these Terms of Service, please contact us at{' '}
                            <a href="mailto:wotf.global@gmail.com" className="text-[#0085C7] hover:underline">wotf.global@gmail.com</a>.
                        </p>
                    </section>
                </div>
            </div>

            <GlobalFooter />
        </main>
    );
}

export default function TermsPage() {
    return (
        <I18nProvider>
            <TermsPageInner />
        </I18nProvider>
    );
}
