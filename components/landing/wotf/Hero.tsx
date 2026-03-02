'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

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

            {/* Content */}
            <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="-mt-8 sm:-mt-12 md:-mt-16 mb-4 sm:mb-6 md:mb-8 relative z-20 flex flex-col items-center md:gap-2"
                >
                    <div className="relative w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48 lg:w-56 lg:h-56">
                        <Image
                            src="/wotf/logo_image.png"
                            alt="WOTF Icon"
                            fill
                            className="object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.15)]"
                        />
                    </div>
                    <div className="relative h-16 w-64 sm:h-20 sm:w-72 md:h-20 md:w-80 lg:h-24 lg:w-96 mt-2">
                        <Image
                            src="/wotf/wotf_logo_word.png"
                            alt="WOTF Word"
                            fill
                            className="object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.15)]"
                        />
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                >
                    <p className="text-sm sm:text-lg md:text-2xl text-white font-bold uppercase tracking-widest mb-6 md:mb-10 max-w-2xl drop-shadow-md px-2">
                        Official Home of Future Olympians
                    </p>
                </motion.div>

                <motion.div
                    className="flex flex-col md:flex-row gap-4 w-full md:w-auto"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.7 }}
                >
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
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 hidden md:block"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 10, 0] }}
                transition={{
                    opacity: { delay: 1, duration: 1 },
                    y: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                }}
            >
                <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center p-1">
                    <div className="w-1 h-2 bg-white rounded-full animate-scroll"></div>
                </div>
            </motion.div>
        </section>
    );
};

export default Hero;
