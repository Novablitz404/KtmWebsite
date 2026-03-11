'use client';

import { useRef, useEffect, useState } from 'react';

interface MotionWrapperProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    enableOnMobile?: boolean;
}

const MotionWrapper = ({ children, className = '', delay = 0, direction = 'up', enableOnMobile = false }: MotionWrapperProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    // Single matchMedia check — no resize listener
    const isMobile = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false;

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // On mobile, skip animation unless enableOnMobile is set
        if (isMobile && !enableOnMobile) {
            setVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '-100px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [isMobile, enableOnMobile]);

    const shouldAnimate = !isMobile || enableOnMobile;
    const dirClass = `wotf-dir-${direction}`;

    return (
        <div
            ref={ref}
            className={`${shouldAnimate ? 'wotf-reveal' : ''} ${visible ? `wotf-visible ${dirClass}` : ''} ${className}`}
            style={visible && delay > 0 ? { animationDelay: `${delay}s` } : undefined}
        >
            {children}
        </div>
    );
};

export default MotionWrapper;
