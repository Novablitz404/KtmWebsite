"use client";

import { useEffect, useState, useRef } from 'react';
import MotionWrapper from './MotionWrapper';

interface StatsSectionProps {
    stats?: { athletes: number; clubs: number; events: number };
}

// Native IntersectionObserver-based useInView hook (replaces framer-motion's)
function useInView(ref: React.RefObject<HTMLElement | null>, options?: { once?: boolean; margin?: string }) {
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    if (options?.once !== false) observer.disconnect();
                }
            },
            { rootMargin: options?.margin || '0px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [options?.once, options?.margin]);

    return isInView;
}

const Counter = ({ value, duration = 2 }: { value: number, duration?: number }) => {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true, margin: "-20px" });

    useEffect(() => {
        if (!isInView) return;

        let startTime: number;
        let animationFrame: number;

        const updateCount = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            const percentage = Math.min(progress / (duration * 1000), 1);

            // Easing function for smooth deceleration
            const easeOutQuart = 1 - Math.pow(1 - percentage, 4);

            setCount(Math.floor(easeOutQuart * value));

            if (percentage < 1) {
                animationFrame = requestAnimationFrame(updateCount);
            }
        };

        animationFrame = requestAnimationFrame(updateCount);

        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration, isInView]);

    return <span ref={ref}>{count.toLocaleString()}</span>;
};

const StatsSection = ({ stats }: StatsSectionProps) => {
    const statItems = [
        {
            id: 1,
            value: stats?.athletes ?? 0,
            label: "Active Athletes",
            suffix: "+",
            color: "text-congo-blue",
        },
        {
            id: 2,
            value: stats?.clubs ?? 0,
            label: "Member Clubs",
            suffix: "+",
            color: "text-spanish-red",
        },
        {
            id: 3,
            value: stats?.events ?? 0,
            label: "Events Hosted",
            suffix: "+",
            color: "text-african-turquoise",
        },
    ];

    return (
        <section className="py-10 md:py-16 bg-white border-b border-gray-100">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                    {statItems.map((stat, index) => (
                        <MotionWrapper
                            key={stat.id}
                            delay={index * 0.1}
                            direction="up"
                            className="text-center"
                        >
                            <div className="flex flex-col items-center">
                                <h3 className={`text-4xl md:text-5xl font-black ${stat.color} mb-2 tracking-tight`}>
                                    <Counter value={stat.value} />
                                    {stat.suffix}
                                </h3>
                                <p className="text-sm md:text-base font-bold text-gray-500 uppercase tracking-widest">
                                    {stat.label}
                                </p>
                            </div>
                        </MotionWrapper>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default StatsSection;
