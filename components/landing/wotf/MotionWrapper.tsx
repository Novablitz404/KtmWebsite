'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface MotionWrapperProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
    enableOnMobile?: boolean;
}

const MotionWrapper = ({ children, className = '', delay = 0, direction = 'up', enableOnMobile = false }: MotionWrapperProps) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => window.innerWidth < 768;
        setIsMobile(checkMobile());

        const handleResize = () => setIsMobile(checkMobile());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getVariants = () => {
        const distance = 50;
        const variants = {
            hidden: {
                opacity: 0,
                y: direction === 'up' ? distance : direction === 'down' ? -distance : 0,
                x: direction === 'left' ? distance : direction === 'right' ? -distance : 0,
            },
            visible: {
                opacity: 1,
                y: 0,
                x: 0,
                transition: {
                    duration: 0.8,
                    delay: delay,
                    ease: "easeOut"
                }
            }
        };
        return variants as any;
    };

    const shouldAnimate = !isMobile || enableOnMobile;

    return (
        <motion.div
            ref={ref}
            variants={getVariants()}
            initial={shouldAnimate ? "hidden" : "visible"}
            animate={shouldAnimate ? (isInView ? "visible" : "hidden") : "visible"}
            className={className}
        >
            {children}
        </motion.div>
    );
};

export default MotionWrapper;
