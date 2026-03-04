"use client";

import { ArrowRight, Shield, Globe, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MotionWrapper from './MotionWrapper';

const AffiliationCTA = () => {
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';
    return (
        <section className="relative py-16 md:py-24 overflow-hidden bg-congo-blue">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-full h-full" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255, 255, 255, 0.1) 35px, rgba(255, 255, 255, 0.1) 36px)`
                }} />
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto text-center">
                    <MotionWrapper direction="up">
                        <p className="text-dashing-yellow text-xs font-black uppercase tracking-[6px] mb-4">
                            Join the Federation
                        </p>
                        <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tighter leading-none mb-6">
                            Be Part of Something<br />
                            <span className="text-dashing-yellow">Greater</span>
                        </h2>
                        <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
                            Whether you&apos;re an athlete, coach, or club owner — WOTF provides the platform,
                            recognition, and community to elevate your taekwondo journey.
                        </p>
                    </MotionWrapper>

                    {/* Feature Pills */}
                    <MotionWrapper direction="up" delay={0.15}>
                        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-10">
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-full">
                                <Shield size={16} className="text-dashing-yellow" />
                                Official Athlete ID Card
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-full">
                                <Trophy size={16} className="text-dashing-yellow" />
                                Tournament Access
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-full">
                                <Globe size={16} className="text-dashing-yellow" />
                                International Recognition
                            </div>
                        </div>
                    </MotionWrapper>

                    {/* CTA Buttons */}
                    <MotionWrapper direction="up" delay={0.25}>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link
                                href={`/sign-up${qs}`}
                                className="inline-flex items-center gap-2 bg-dashing-yellow text-congo-blue font-black text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:bg-yellow-300 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                            >
                                Register Now
                                <ArrowRight size={16} />
                            </Link>
                            <Link
                                href={`/membership${qs}`}
                                className="inline-flex items-center gap-2 bg-transparent border-2 border-white/30 text-white font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:bg-white/10 transition-all duration-300"
                            >
                                Learn More
                            </Link>
                        </div>
                    </MotionWrapper>
                </div>
            </div>
        </section>
    );
};

export default AffiliationCTA;
