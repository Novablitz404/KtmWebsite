"use client";

import MotionWrapper from './MotionWrapper';

import Image from 'next/image';

const partners = [
    { id: 1, name: "World Taekwondo", src: "/wotf/wotfpartners/wt.png" },
    { id: 2, name: "Philippine Sports Commission", src: "/wotf/wotfpartners/psc.png" },
    { id: 3, name: "Kukkiwon", src: "/wotf/wotfpartners/kukkiwon.png" },
    { id: 4, name: "DG", src: "/wotf/wotfpartners/dg.png" },
    { id: 5, name: "Neocolors", src: "/wotf/wotfpartners/neocolors.png" },
    { id: 6, name: "Tomatok", src: "/wotf/wotfpartners/tomatok.png" },
    { id: 7, name: "WOTF", src: "/wotf/wotfpartners/wotf.png" },
];

const PartnerLogo = ({ partner }: { partner: typeof partners[0] }) => (
    <div className="flex-shrink-0 w-40 md:w-64 h-20 md:h-28 flex items-center justify-center p-2 hover:scale-105 transition-transform duration-300 mix-blend-multiply">
        <div className="relative w-full h-full">
            <Image
                src={partner.src}
                alt={partner.name}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 160px, 256px"
            />
        </div>
    </div>
);

const PartnersSection = () => {
    return (
        <section className="py-10 md:py-14 bg-[#f5f6fa] overflow-hidden">
            <div className="container mx-auto px-6">
                <MotionWrapper className="text-center mb-10" direction="up">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-[4px] mb-2">
                        Trusted By
                    </p>
                    <h2 className="text-african-turquoise font-black text-2xl md:text-3xl lg:text-4xl uppercase tracking-tighter [-webkit-text-stroke:1px_currentColor]">
                        Our <span className="text-spanish-red">Partners</span>
                    </h2>
                </MotionWrapper>
            </div>

            {/* Marquee carousel - pure CSS, GPU-accelerated */}
            <div className="relative">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-[#f5f6fa] to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-[#f5f6fa] to-transparent z-10 pointer-events-none" />

                <div className="marquee-track flex gap-8 md:gap-16 w-max items-center">
                    {/* First set */}
                    <div className="marquee-content flex gap-8 md:gap-16 items-center shrink-0">
                        {partners.map((partner) => (
                            <PartnerLogo key={`a-${partner.id}`} partner={partner} />
                        ))}
                    </div>
                    {/* Duplicate for seamless loop */}
                    <div className="marquee-content flex gap-8 md:gap-16 items-center shrink-0" aria-hidden="true">
                        {partners.map((partner) => (
                            <PartnerLogo key={`b-${partner.id}`} partner={partner} />
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <div className="container mx-auto px-6">
                <MotionWrapper direction="up" delay={0.3}>
                    <div className="mt-10 text-center">
                        <p className="text-sm text-gray-500">
                            Interested in partnering with us?{' '}
                            <a href="#" className="text-congo-blue font-bold hover:underline transition-colors">
                                Get in touch →
                            </a>
                        </p>
                    </div>
                </MotionWrapper>
            </div>
        </section>
    );
};

export default PartnersSection;
