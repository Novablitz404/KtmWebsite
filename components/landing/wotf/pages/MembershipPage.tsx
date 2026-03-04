"use client";

import Navbar from "@/components/landing/wotf/Navbar";
import Footer from "@/components/landing/wotf/Footer";
import MotionWrapper from "@/components/landing/wotf/MotionWrapper";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Globe, Trophy, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";

// Inline AthleteCard for the showcase (simplified version from WOTF repo)
function ShowcaseAthleteCard() {
    const fullName = "FRANCESCA GEISLER";
    const athleteId = "PH-2026-0001";
    const validUntil = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const nameContainerRef = useRef<HTMLDivElement>(null);
    const nameTextRef = useRef<HTMLHeadingElement>(null);
    const [nameFontSize, setNameFontSize] = useState(28);

    useEffect(() => {
        const fitText = () => {
            const container = nameContainerRef.current;
            const text = nameTextRef.current;
            if (!container || !text) return;
            let size = 22;
            text.style.fontSize = `${size}px`;
            while (text.scrollWidth > container.clientWidth && size > 6) {
                size -= 0.5;
                text.style.fontSize = `${size}px`;
            }
            setNameFontSize(size);
        };
        const timer = setTimeout(fitText, 50);
        const observer = new ResizeObserver(fitText);
        if (nameContainerRef.current) observer.observe(nameContainerRef.current);
        return () => { clearTimeout(timer); observer.disconnect(); };
    }, []);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }} className="w-full">
            <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl shadow-gray-300/60 hover:shadow-[0_25px_60px_-10px_rgba(0,133,199,0.25)] transition-shadow duration-500" style={{ aspectRatio: '4843 / 3443' }}>
                <Image src="/wotf/athlete_card.svg" alt="Athlete Card Background" fill className="object-cover" priority />
                <div ref={nameContainerRef} className="absolute flex flex-col items-end text-right" style={{ top: '37%', left: '21%', right: '30%', gap: '2px' }}>
                    <h2 ref={nameTextRef} className="font-black text-[#0085C7] tracking-tight leading-tight whitespace-nowrap" style={{ fontSize: `${nameFontSize}px` }}>
                        {fullName}
                    </h2>
                    <p className="font-semibold text-[#333] uppercase tracking-[0.08em]" style={{ fontSize: `${nameFontSize * 0.65}px` }}>Athlete ID No.</p>
                    <p className="font-black text-[#DF0024] tracking-wide leading-tight" style={{ fontSize: `${nameFontSize * 0.9}px` }}>{athleteId}</p>
                    <p className="font-medium text-[#444] italic" style={{ fontSize: `${nameFontSize * 0.65}px` }}>Valid Until: {validUntil}</p>
                </div>
                <div className="absolute overflow-hidden bg-gray-200 rounded-lg" style={{ top: '30%', right: '3%', width: '23%', aspectRatio: '10 / 13' }}>
                    <Image src="/wotf/id_front.png" alt="Athlete Photo" fill className="object-cover" />
                </div>
            </div>
        </motion.div>
    );
}

export default function MembershipPage() {
    return (
        <main className="min-h-screen bg-white">
            <Navbar />

            {/* Hero Section */}
            <div className="relative h-[80vh] w-full overflow-hidden">
                <Image
                    src="/wotf/Torch.png"
                    alt="WOTF Athlete Action"
                    fill
                    className="object-cover object-[80%_top] md:object-right-top opacity-30 md:opacity-100 mix-blend-luminosity md:mix-blend-normal"
                    priority
                />
                <div className="absolute inset-0 bg-[#0a0a0a] md:bg-transparent -z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent md:bg-gradient-to-r md:from-black/90 md:via-black/50 md:to-transparent" />

                <div className="absolute inset-0 flex items-center">
                    <div className="container mx-auto px-6">
                        <MotionWrapper direction="up" delay={0.1} enableOnMobile>
                            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none mb-6">
                                Join the <span className="text-dashing-yellow">Elite</span>. <br />
                                Define Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-congo-blue to-cyan-400 inline-block pb-1">Legacy</span>.
                            </h1>
                            <p className="text-xl text-gray-200 font-medium max-w-xl mb-8 leading-relaxed">
                                Unlock exclusive opportunities, global recognition, and your official WOTF Philippines Athlete Identity. The journey to greatness starts here.
                            </p>
                            <Link href="/sign-up">
                                <button className="px-8 py-4 bg-spanish-red text-white font-black uppercase tracking-widest rounded-sm hover:bg-red-700 transition-all hover:scale-105 shadow-lg shadow-spanish-red/30">
                                    Become a Member
                                </button>
                            </Link>
                        </MotionWrapper>
                    </div>
                </div>
            </div>

            {/* Athlete ID Showcase Section */}
            <section className="py-24 bg-[#0F172A] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-20 w-96 h-96 bg-congo-blue/20 rounded-full blur-[100px]" />
                    <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-spanish-red/10 rounded-full blur-[100px]" />
                </div>

                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <MotionWrapper direction="right" delay={0.2} className="flex justify-center w-full">
                            <div className="group relative w-full max-w-md perspective-1000 mx-auto">
                                <div className="relative w-full transition-all duration-700 transform-style-3d md:group-hover:rotate-y-180">
                                    {/* Front */}
                                    <div className="relative w-full backface-hidden">
                                        <ShowcaseAthleteCard />
                                    </div>

                                    {/* Back */}
                                    <div className="absolute inset-0 h-full w-full rotate-y-180 backface-hidden rounded-2xl overflow-hidden shadow-2xl">
                                        <Image
                                            src="/wotf/id_back.png"
                                            alt="Athlete ID Back"
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Flip Hint - desktop only */}
                            <div className="mt-4 hidden md:flex items-center gap-2 text-white/50 text-sm font-medium animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                <span>Hover to flip</span>
                            </div>
                        </MotionWrapper>

                        <MotionWrapper direction="left" delay={0.3} className="text-white">
                            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">
                                More Than Just a Card. <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-congo-blue to-cyan-400">Your Identity.</span>
                            </h2>
                            <p className="text-gray-400 text-lg leading-relaxed mb-8">
                                The WOTF Digital Athlete ID is your passport to the global stage. It unifies your competitive history, rank certification, and membership status into a single, verifiable digital credential.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Global Recognition & Verification",
                                    "Real-time Rank & Certification Status",
                                    "Seamless Event Registration",
                                    "Trackable Competition History"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-dashing-yellow flex items-center justify-center text-black">
                                            <ShieldCheck size={14} />
                                        </div>
                                        <span className="text-gray-200 font-medium">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </MotionWrapper>
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-24 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <MotionWrapper direction="up">
                            <h2 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter mb-4">
                                Why Join <span className="text-spanish-red">WOTF Philippines?</span>
                            </h2>
                            <p className="text-gray-600 text-lg">
                                Experience a federation that prioritizes your growth, safety, and future.
                            </p>
                        </MotionWrapper>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <MotionWrapper direction="right" className="grid gap-6">
                            {[
                                {
                                    icon: <Globe className="text-congo-blue" size={32} />,
                                    title: "Global Recognition",
                                    desc: "Your rank and achievements are recognized across the WOTF international network."
                                },
                                {
                                    icon: <Trophy className="text-dashing-yellow" size={32} />,
                                    title: "Exclusive Event Access",
                                    desc: "Priority registration for Flagship Series, National Championships, and International Opens."
                                },
                                {
                                    icon: <GraduationCap className="text-spanish-red" size={32} />,
                                    title: "World-Class Education",
                                    desc: "Access to technical seminars, coaching courses, and high-performance training camps."
                                }
                            ].map((benefit, i) => (
                                <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg transition-all flex gap-6 items-start">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        {benefit.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 mb-2">{benefit.title}</h3>
                                        <p className="text-gray-600 leading-relaxed text-sm">{benefit.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </MotionWrapper>

                        <MotionWrapper direction="left" delay={0.2} className="relative h-[600px] rounded-2xl overflow-hidden shadow-2xl">
                            <Image
                                src="/wotf/member3.jpg"
                                alt="Taekwondo Competition"
                                fill
                                className="object-cover object-[70%_80%]"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            <div className="absolute left-4 bottom-4 md:left-8 md:bottom-8 p-6 md:p-8 bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl max-w-[90%] md:max-w-md shadow-2xl overflow-hidden group">
                                <div className="absolute -left-4 -top-6 text-[100px] text-white/10 font-serif leading-none font-black italic select-none">&ldquo;</div>
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-spanish-red rounded-l-2xl shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
                                <p className="font-medium text-white text-lg md:text-xl md:leading-relaxed mb-4 relative z-10 italic">
                                    &ldquo;WOTF gave me the platform to showcase my skills to the world.&rdquo;
                                </p>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-10 h-[1px] bg-dashing-yellow"></div>
                                    <p className="text-xs md:text-sm font-black text-white uppercase tracking-[3px]">
                                        National Team Member
                                    </p>
                                </div>
                            </div>
                        </MotionWrapper>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-congo-blue text-center text-white relative overflow-hidden">
                <div className="container mx-auto px-6 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-8">
                        Ready to Start Your Journey?
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/sign-up">
                            <button className="px-10 py-4 bg-dashing-yellow text-black font-black uppercase tracking-widest rounded-sm hover:bg-yellow-400 transition-colors">
                                Register Now
                            </button>
                        </Link>
                        <button className="px-10 py-4 border-2 border-white/20 text-white font-bold uppercase tracking-widest rounded-sm hover:bg-white/10 transition-colors">
                            Club Affiliation
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
