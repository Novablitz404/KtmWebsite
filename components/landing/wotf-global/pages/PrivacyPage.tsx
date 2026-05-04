"use client";

import { I18nProvider, useI18n } from '../i18n';
import GlobalNavbar from '../GlobalNavbar';
import GlobalFooter from '../GlobalFooter';

function PrivacyPageInner() {
    const { t } = useI18n();

    return (
        <main className="min-h-screen bg-white" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            <GlobalNavbar />

            {/* Page Header */}
            <section className="pt-28 pb-16 md:pt-36 md:pb-20 bg-[#0A0A0A] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-[#0A0A0A]" />
                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-white uppercase tracking-wider animate-hero-fade-in-delayed-1">
                        Privacy Policy
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Information We Collect</h2>
                        <p className="text-gray-600 mb-4">
                            When you use the World Olympics Taekwondo Federation (WOTF) Global platform, we collect information that you provide directly to us, including:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>Account information (name, email address)</li>
                            <li>Profile information (club affiliation, belt rank, country)</li>
                            <li>Event registration data (seminars and tournaments)</li>
                            <li>Contact information for membership management</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. How We Use Your Information</h2>
                        <p className="text-gray-600 mb-4">
                            We use the information we collect to:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>Provide, maintain, and improve our services and global network</li>
                            <li>Process event registrations and manage memberships</li>
                            <li>Communicate with you about WOTF updates, events, and announcements</li>
                            <li>Verify athlete credentials and maintain a global registry</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Information Sharing</h2>
                        <p className="text-gray-600 mb-4">
                            We may share your information in the following circumstances:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>With national chapters and member organizations for coordination</li>
                            <li>Publicly displaying athlete names and results during international events</li>
                            <li>When required by law or to protect our rights</li>
                        </ul>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Security</h2>
                        <p className="text-gray-600">
                            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Contact Us</h2>
                        <p className="text-gray-600">
                            If you have any questions about this Privacy Policy, please contact us at{' '}
                            <a href="mailto:wotf.global@gmail.com" className="text-[#0085C7] hover:underline">wotf.global@gmail.com</a>.
                        </p>
                    </section>
                </div>
            </div>

            <GlobalFooter />
        </main>
    );
}

export default function PrivacyPage() {
    return (
        <I18nProvider>
            <PrivacyPageInner />
        </I18nProvider>
    );
}
