'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Shield, Target, Trophy, Users, BookOpen, CheckCircle } from 'lucide-react'
import Navbar from '@/components/landing/wotf/Navbar'
import Footer from '@/components/landing/wotf/Footer'
import Link from 'next/link'

import { useSearchParams } from 'next/navigation'

interface ClubAffiliationPageProps {
    tenantName: string
}

export default function ClubAffiliationPage({ tenantName }: ClubAffiliationPageProps) {
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    const benefits = [
        {
            title: "Official Recognition",
            description: `Earn official recognition as an affiliated club under ${tenantName}, elevating your club's prestige and credibility in the Taekwondo community.`,
            icon: Shield
        },
        {
            title: "Tournament Access",
            description: "Gain exclusive or early access to regional and national tournaments, ensuring your athletes can compete at the highest levels.",
            icon: Trophy
        },
        {
            title: "Grading Authority",
            description: "Receive the necessary authority to conduct official promotion tests and award recognized belts to your students.",
            icon: Target
        },
        {
            title: "Seminars & Training",
            description: "Participate in exclusive seminars, referee courses, and instructor training programs led by international masters.",
            icon: BookOpen
        },
        {
            title: "Network & Community",
            description: "Join a thriving network of club managers and instructors. Share resources, practice sessions, and grow together.",
            icon: Users
        }
    ]

    return (
        <main className="min-h-screen bg-white">
            <Navbar animate={false} />

            {/* Hero Section */}
            <section className="relative pt-32 pb-24 bg-gradient-to-br from-african-turquoise/10 to-transparent overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none opacity-20">
                    <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-african-turquoise/30 blur-3xl"></div>
                    <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 rounded-full bg-spanish-red/20 blur-3xl"></div>
                </div>

                <div className="container mx-auto px-4 md:px-6 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-6xl font-black text-black uppercase tracking-tight mb-6 leading-tight"
                        >
                            Elevate Your Club with <br className="hidden md:block" />
                            <span className="text-african-turquoise">{tenantName} Affiliation</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto"
                        >
                            Join our prestigious federation and unlock exclusive benefits for your club, instructors, and athletes. Empower your journey in Taekwondo today.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col sm:flex-row justify-center items-center gap-4"
                        >
                            <Link href={`/sign-up${qs}`} className="w-full sm:w-auto px-8 py-4 bg-spanish-red text-white text-lg font-bold uppercase tracking-widest rounded-sm hover:bg-red-700 transition-colors shadow-lg shadow-spanish-red/30">
                                Apply for Affiliation
                            </Link>
                            <Link href={`/clubs${qs}`} className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 border border-gray-200 text-lg font-bold uppercase tracking-widest rounded-sm hover:bg-gray-50 transition-colors shadow-sm">
                                View Affiliated Clubs
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Benefits Grid */}
            <section className="py-24 bg-gray-50 relative border-t border-gray-100 border-b">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tight mb-4">Why Affiliate With Us?</h2>
                        <div className="w-24 h-1 bg-african-turquoise mx-auto"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {benefits.map((benefit, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-100px" }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all hover:border-african-turquoise/30 flex flex-col group"
                            >
                                <div className="w-16 h-16 rounded-xl bg-african-turquoise/10 flex items-center justify-center mb-6 text-african-turquoise group-hover:scale-110 transition-transform">
                                    <benefit.icon size={32} strokeWidth={1.5} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
                                <p className="text-gray-600 leading-relaxed flex-1">
                                    {benefit.description}
                                </p>
                            </motion.div>
                        ))}

                        {/* Special Callout CTA in Grid */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: benefits.length * 0.1 }}
                            className="bg-spanish-red p-8 rounded-2xl shadow-lg flex flex-col justify-center items-center text-center text-white"
                        >
                            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Ready to step up?</h3>
                            <p className="text-red-100 mb-8 max-w-xs mx-auto">
                                Secure your club's future with the leading Taekwondo manager.
                            </p>
                            <Link href="/sign-up" className="px-6 py-3 bg-white text-spanish-red font-bold uppercase tracking-widest rounded-sm hover:bg-gray-100 transition-colors flex items-center gap-2">
                                Get Started <CheckCircle size={18} />
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    )
}
