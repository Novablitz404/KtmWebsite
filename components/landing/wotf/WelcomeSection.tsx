"use client";

import Image from "next/image";
import MotionWrapper from "./MotionWrapper";

const WelcomeSection = () => {
    return (
        <section className="py-16 md:py-24 bg-gray-50 border-b border-gray-100 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-congo-blue/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full border border-gray-100 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-spanish-red/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 rounded-full border border-gray-100 pointer-events-none" />

            <div className="container mx-auto px-6 relative z-10">
                <MotionWrapper className="text-center mb-16" direction="up">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-[4px] mb-3">
                        Leadership
                    </p>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-african-turquoise uppercase tracking-tighter [-webkit-text-stroke:1px_currentColor]">
                        Welcome to <span className="text-congo-blue">WOTF Philippines</span>
                    </h2>
                </MotionWrapper>

                <div className="flex flex-col gap-24 lg:gap-32 mt-8">
                    {/* Master Moon Message */}
                    <MotionWrapper direction="up" delay={0.1}>
                        <div className="w-full relative group">
                            <div className="block lg:float-left w-full lg:w-[45%] mr-0 lg:mr-16 mb-8 lg:mb-4 rounded-xl overflow-hidden relative h-[400px] md:h-[500px] shadow-2xl">
                                <Image
                                    src="/wotf/master_moon.webp"
                                    alt="Master Moon Dae-Sung"
                                    fill
                                    className="object-cover object-top"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>

                            <div className="prose prose-base md:prose-lg max-w-none text-gray-700 italic leading-relaxed text-justify relative">
                                <div className="hidden lg:block absolute -top-12 -left-6 text-[150px] text-gray-100 font-serif leading-none font-black opacity-40 -z-10 select-none">
                                    "
                                </div>
                                <p className="mb-6 font-medium text-gray-900 not-italic text-xl">To the WOTF Philippines Family,</p>
                                <p className="mb-6">
                                    I am <strong className="font-bold text-gray-900">Moon Dae-Sung</strong>, President of the World Olympic Taekwondo Federation. It is my genuine pleasure to lead our mission for the strategic growth and propagation of Taekwondo culture throughout the Philippines.
                                </p>
                                <p className="mb-6">
                                    We are committed to making Taekwondo accessible to everyone, ensuring that all can learn and grow without limitations. By focusing on technical excellence and shared values, we aim to unite the nation through discipline and peace.
                                </p>
                                <p className="mb-10">
                                    The WOTF will continue to provide the systems and support necessary to empower our Filipino practitioners. Together, let us build a strong, dignified, and forward-looking community.
                                </p>

                                <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-8">
                                    <div>
                                        <p className="font-medium text-gray-500 mb-2 not-italic text-sm uppercase tracking-widest">In the spirit of Taekwondo,</p>
                                        <p className="font-black text-congo-blue not-italic text-2xl uppercase tracking-tighter">Master Moon Dae-Sung</p>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest not-italic mt-1">Olympic Gold Medalist (Athens 2004) President and Founder World Olympics Taekwondo Federation</p>
                                    </div>
                                    <div className="w-16 h-1 bg-spanish-red rounded-full opacity-50"></div>
                                </div>
                            </div>
                            <div className="clear-both"></div>
                        </div>
                    </MotionWrapper>

                    {/* Master Donnie Message */}
                    <MotionWrapper direction="up" delay={0.2}>
                        <div className="w-full relative group">
                            <div className="block lg:float-right w-full lg:w-[45%] ml-0 lg:ml-16 mb-8 lg:mb-4 rounded-xl overflow-hidden relative h-[400px] md:h-[500px] shadow-2xl">
                                <Image
                                    src="/wotf/master_donnie.webp"
                                    alt="Master Donnie"
                                    fill
                                    className="object-cover object-top"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>

                            <div className="prose prose-base md:prose-lg max-w-none text-gray-700 italic leading-relaxed text-justify relative">
                                <div className="hidden lg:block absolute -top-12 -right-6 text-[150px] text-gray-100 font-serif leading-none font-black opacity-40 -z-10 select-none">
                                    "
                                </div>
                                <p className="mb-6 font-medium text-gray-900 not-italic text-xl">Fellow Practitioners,</p>
                                <p className="mb-6">
                                    On behalf of the World Olympic Taekwondo Federation Philippines, I am honored to lead our mission for the strategic growth and expansion of our organization across the nation.
                                </p>
                                <p className="mb-6">
                                    Our focus is to cultivate a community rooted in the core values of Taekwondo: Courtesy, Integrity, Perseverance, Self-control, and Indomitable Spirit. We are dedicated to providing a platform where every Filipino practitioner can thrive, ensuring athlete welfare and upholding the highest standards of technical excellence.
                                </p>
                                <p className="mb-10">
                                    As we expand our reach, our goal remains to unite our practitioners and prepare the next generation to lead with honor on the world stage. Let us work together to build a lasting legacy of discipline and unity throughout the Philippines.
                                </p>

                                <div className="mt-12 flex items-center justify-between border-t border-gray-200 pt-8">
                                    <div>
                                        <p className="font-medium text-gray-500 mb-2 not-italic text-sm uppercase tracking-widest">With respect and gratitude,</p>
                                        <p className="font-black text-spanish-red not-italic text-2xl uppercase tracking-tighter">MASTER DONALD DAVID GEISLER III, OLY</p>
                                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest not-italic mt-1">Two-Time Olympian, Chairman & President World Olympics Taekwondo Federation -Philippines, Vice President World Olympics Taekwondo Federation</p>
                                    </div>
                                    <div className="w-16 h-1 bg-congo-blue rounded-full opacity-50"></div>
                                </div>
                            </div>
                            <div className="clear-both"></div>
                        </div>
                    </MotionWrapper>
                </div>
            </div>
        </section>
    );
};

export default WelcomeSection;
