"use client";

import Navbar from "@/components/landing/wotf/Navbar";
import Footer from "@/components/landing/wotf/Footer";
import MotionWrapper from "@/components/landing/wotf/MotionWrapper";
import Image from "next/image";
import { ShieldCheck, Users, Globe, Award, Heart } from "lucide-react";

export default function WOTFAboutPage() {
    return (
        <main className="min-h-screen bg-white">
            <Navbar />

            {/* Hero Section */}
            <div className="relative h-[85vh] w-full overflow-hidden">
                <Image
                    src="/wotf/About1.jpg"
                    alt="WOTF Athlete in Action"
                    fill
                    className="object-cover object-center"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-congo-blue/90 to-black/60" />

                <div className="absolute inset-0 flex items-center">
                    <div className="container mx-auto px-6">
                        <MotionWrapper direction="up" delay={0.1} enableOnMobile>
                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white uppercase tracking-tighter leading-none mb-6">
                                WOTF <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-dashing-yellow to-amber-500">Philippines</span>
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-200 font-medium max-w-2xl border-l-4 border-dashing-yellow pl-6">
                                A Mandate Rooted in Olympism. <br />
                                Built for Athletes.
                            </p>
                        </MotionWrapper>
                    </div>
                </div>
            </div>

            {/* The Mandate Section */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <MotionWrapper direction="right" delay={0.2}>
                            <div className="relative h-[600px] w-full rounded-2xl overflow-hidden shadow-2xl shadow-congo-blue/20">
                                <Image
                                    src="/wotf/about2.jpg"
                                    alt="Taekwondo Training"
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                <div className="absolute bottom-8 left-8 right-8">
                                    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-xl">
                                        <p className="text-white font-bold italic text-lg">
                                            &quot;Elevate Taekwondo beyond medals and podiums.&quot;
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </MotionWrapper>

                        <MotionWrapper direction="left" delay={0.3}>
                            <h2 className="text-4xl md:text-5xl font-black text-congo-blue uppercase tracking-tighter mb-8">
                                The <span className="text-spanish-red">Mandate</span>
                            </h2>
                            <div className="space-y-6 text-gray-600 text-lg leading-relaxed">
                                <p>
                                    The <span className="font-bold text-gray-900">World Olympics Taekwondo Federation</span> is not simply an organizing body. It is a governance mandate.
                                </p>
                                <p>
                                    WOTF exists to elevate Taekwondo beyond medals and podiums to <span className="font-bold text-spanish-red">protect athletes</span>, uphold integrity, and restore purpose to competition.
                                </p>
                                <p>
                                    In a sporting landscape where events often prioritize scale and spectacle, WOTF prioritizes <span className="font-bold text-congo-blue">stewardship</span>. Athlete welfare supersedes brackets, medals, and scheduling. Youth protection is non-negotiable.
                                </p>
                            </div>
                        </MotionWrapper>
                    </div>
                </div>
            </section>

            {/* Core Pillars Section */}
            <section className="py-24 bg-[#f8f9fc] relative">
                <div className="container mx-auto px-6">
                    <MotionWrapper direction="up" className="text-center mb-16">
                        <p className="text-spanish-red font-bold uppercase tracking-widest text-sm mb-3">Our Framework</p>
                        <h2 className="text-4xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter">
                            Principled <span className="text-congo-blue">Leadership</span>
                        </h2>
                    </MotionWrapper>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: <Heart size={32} />, title: "Athlete-First Decision Making", desc: "Every policy and event is designed with the athlete's well-being as the primary consideration." },
                            { icon: <ShieldCheck size={32} />, title: "Integrity in Governance", desc: "Transparent, principled, and accountable leadership that restores trust in the sport." },
                            { icon: <Users size={32} />, title: "Youth Protection & Welfare", desc: "Creating a safe environment where the protection of young athletes is non-negotiable." },
                            { icon: <Award size={32} />, title: "Structured Olympic Pathway", desc: "Clear, fair, and professional development routes for aspiring Olympians." },
                            { icon: <Globe size={32} />, title: "Grassroots Access", desc: "Providing world-class experience and opportunities to athletes at all levels." }
                        ].map((item, index) => (
                            <MotionWrapper key={index} delay={index * 0.1} direction="up" className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                <div className="w-14 h-14 bg-congo-blue/5 rounded-xl flex items-center justify-center text-congo-blue mb-6 group-hover:bg-congo-blue group-hover:text-white transition-colors duration-300">
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-congo-blue transition-colors">{item.title}</h3>
                                <p className="text-gray-500 leading-relaxed text-sm">{item.desc}</p>
                            </MotionWrapper>
                        ))}

                        <MotionWrapper delay={0.5} direction="up" className="bg-congo-blue p-8 rounded-2xl shadow-xl flex items-center justify-center relative overflow-hidden group">
                            <div className="relative z-10 text-center">
                                <div className="w-20 h-20 mx-auto mb-4 relative drop-shadow-2xl">
                                    <Image src="/wotf/WOTF-Logo-Hero.svg" alt="WOTF Logo" fill className="object-contain" />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-wider">WOTF Philippines</h3>
                            </div>
                        </MotionWrapper>
                    </div>
                </div>
            </section>

            {/* Grassroots Access Section */}
            <section className="py-24 bg-white overflow-hidden">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <MotionWrapper direction="right" delay={0.2} className="order-2 lg:order-1">
                            <h2 className="text-4xl md:text-5xl font-black text-congo-blue uppercase tracking-tighter mb-6">
                                Grassroots <span className="text-dashing-yellow">Access</span> to World-Class Experience
                            </h2>
                            <p className="text-gray-600 text-lg leading-relaxed mb-8">
                                Talent is everywhere, but opportunity is not. We bridge that gap.
                            </p>
                            <p className="text-gray-600 text-lg leading-relaxed mb-8">
                                WOTF is committed to democratizing access to high-level training. By bringing Olympic-standard coaching and technical seminars to local communities, we ensure that every aspiring athlete has a fair shot at greatness.
                            </p>
                            <div className="flex gap-4 flex-wrap">
                                <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold uppercase tracking-wider">Regional Camps</span>
                                <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold uppercase tracking-wider">Talent ID</span>
                                <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold uppercase tracking-wider">Coaching Seminars</span>
                            </div>
                        </MotionWrapper>

                        <MotionWrapper direction="left" delay={0.3} className="order-1 lg:order-2 flex justify-center">
                            <div className="relative w-[350px] md:w-[500px] aspect-square">
                                <div className="absolute inset-4 border border-congo-blue/20 rounded-full" />
                                <div className="absolute inset-8 rounded-full overflow-hidden shadow-2xl shadow-dashing-yellow/20 border-8 border-white">
                                    <Image src="/wotf/about3.jpg" alt="Grassroots Taekwondo" fill className="object-cover" />
                                </div>
                            </div>
                        </MotionWrapper>
                    </div>
                </div>
            </section>

            {/* Flagship Series Section */}
            <section className="py-24 bg-[#0F172A] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-congo-blue/10 skew-x-12 translate-x-32" />
                <div className="container mx-auto px-6 relative z-10">
                    <div className="max-w-4xl mx-auto text-center">
                        <MotionWrapper direction="up">
                            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-8">
                                The WOTF <span className="text-dashing-yellow">Flagship Series</span>
                            </h2>
                            <p className="text-xl text-gray-300 leading-relaxed mb-12 font-light">
                                &quot;The WOTF Flagship Series embodies this mandate — connecting continents under one unified championship structure anchored in Olympic values and technical excellence.&quot;
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button className="px-8 py-4 bg-spanish-red text-white font-black uppercase tracking-widest rounded-sm hover:bg-red-700 transition-colors">
                                    Join the Movement
                                </button>
                                <button className="px-8 py-4 border border-white/20 text-white font-bold uppercase tracking-widest rounded-sm hover:bg-white/10 transition-colors">
                                    Explore Events
                                </button>
                            </div>
                        </MotionWrapper>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
