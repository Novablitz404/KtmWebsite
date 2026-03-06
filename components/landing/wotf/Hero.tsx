'use client';

import Link from 'next/link';
import Image from 'next/image';

const Hero = () => {
    return (
        <section className="relative h-screen w-full overflow-hidden">
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
                <Image
                    src="/wotf/hero1.png"
                    alt="Hero Background"
                    fill
                    className="object-cover object-[25%_center] md:object-center"
                    priority
                    sizes="100vw"
                />
                <div className="absolute inset-0 bg-white/25"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-african-turquoise/80 via-transparent to-transparent"></div>
            </div>

            {/* Content — CSS animations only, no framer-motion */}
            <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4">
                <div className="-mt-24 sm:-mt-20 md:-mt-16 mb-4 sm:mb-6 md:mb-8 relative z-20 flex flex-col items-center md:gap-2 animate-hero-fade-in">
                    <div className="relative w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 lg:w-56 lg:h-56">
                        <Image
                            src="/wotf/logo_image.png"
                            alt="WOTF Icon"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <div className="relative h-16 w-64 sm:h-20 sm:w-72 md:h-20 md:w-80 lg:h-24 lg:w-96 mt-2">
                        <Image
                            src="/wotf/wotf_logo_word.png"
                            alt="WOTF Word"
                            fill
                            className="object-contain"
                        />
                    </div>
                </div>

                <div className="animate-hero-fade-in-delayed-1">
                    <p className="text-sm sm:text-lg md:text-2xl text-white font-bold uppercase tracking-widest mb-6 md:mb-10 max-w-2xl drop-shadow-md px-2">
                        Official Home of Future Olympians
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto animate-hero-fade-in-delayed-2">
                    <Link
                        href="#"
                        className="bg-spanish-red text-white px-8 py-4 rounded-full text-sm md:text-base font-bold uppercase tracking-widest hover:bg-white hover:text-spanish-red transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
                    >
                        2026 Events
                    </Link>
                    <Link
                        href="#"
                        className="bg-transparent border-2 border-white rounded-full text-white px-8 py-4 text-sm md:text-base font-bold uppercase tracking-widest hover:bg-white hover:text-congo-blue transition-all duration-300 transform hover:-translate-y-1"
                    >
                        Join Team Philippines
                    </Link>
                </div>
            </div>

            {/* Scroll indicator — desktop only */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 hidden md:block animate-hero-fade-in-delayed-2">
                <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center p-1">
                    <div className="w-1 h-2 bg-white rounded-full animate-bounce"></div>
                </div>
            </div>

            {/* CSS Keyframe Animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes heroFadeOnly {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes heroSlideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-hero-fade-in {
                    animation: heroFadeOnly 0.6s ease-out both;
                }
                .animate-hero-fade-in-delayed-1 {
                    animation: heroSlideUp 0.5s ease-out 0.3s both;
                }
                .animate-hero-fade-in-delayed-2 {
                    animation: heroSlideUp 0.5s ease-out 0.5s both;
                }
            `}} />
        </section>
    );
};

export default Hero;
