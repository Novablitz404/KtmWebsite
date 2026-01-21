import Image from 'next/image'
import Link from 'next/link'

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-white">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 py-20">
                <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }} />
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl sm:text-5xl font-black text-white">About KTM</h1>
                    <p className="mt-4 text-lg text-red-100 max-w-2xl mx-auto">
                        Empowering the Taekwondo community with professional tournament management tools.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Mission */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Our Mission</h2>
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                        <p className="text-gray-600 text-lg leading-relaxed">
                            KTM Taekwondo Manager is designed to streamline the entire tournament experience -
                            from athlete registration and bracket generation to real-time scoring and results tracking.
                            We aim to provide organizers, clubs, and athletes with a seamless, professional platform
                            that elevates the standard of Taekwondo competitions.
                        </p>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="mb-16">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">What We Offer</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                                <span className="text-2xl">🏆</span>
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">Tournament Management</h3>
                            <p className="text-gray-500 text-sm">
                                Create and manage tournaments with automated bracket generation and scheduling.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                                <span className="text-2xl">⚡</span>
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">Real-time Scoring</h3>
                            <p className="text-gray-500 text-sm">
                                Live score updates with instant bracket progression for Kyorugi and Poomsae.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                                <span className="text-2xl">👥</span>
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">Club Management</h3>
                            <p className="text-gray-500 text-sm">
                                Register athletes, manage club profiles, and track team performance across events.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                                <span className="text-2xl">📊</span>
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">Analytics & Reports</h3>
                            <p className="text-gray-500 text-sm">
                                Comprehensive statistics, billing statements, and exportable data for analysis.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Contact */}
                <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                        <p className="text-gray-600 mb-6">
                            Have questions or want to organize a tournament? We'd love to hear from you.
                        </p>
                        <a
                            href="mailto:contact@ktm.com"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                        >
                            Contact Us
                        </a>
                    </div>
                </section>
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
