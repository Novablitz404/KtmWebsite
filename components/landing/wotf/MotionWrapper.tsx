'use client';

import { useRef, useEffect, useState } from 'react';

interface MotionWrapperProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    enableOnMobile?: boolean;
}

const MotionWrapper = ({ children, className = '', delay = 0, direction = 'up' }: MotionWrapperProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // Respect user's motion preferences
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setVisible(true);
            return;
        }

        // Use a smaller trigger margin on mobile for earlier reveal
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: isMobile ? '-40px' : '-100px' }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const dirClass = `wotf-dir-${direction}`;

    return (
        <div
            ref={ref}
            className={`wotf-reveal ${visible ? `wotf-visible ${dirClass}` : ''} ${className}`}
            style={visible && delay > 0 ? { animationDelay: `${delay}s` } : undefined}
        >
            {children}
        </div>
    );
};

export default MotionWrapper;
