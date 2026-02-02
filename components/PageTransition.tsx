'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function PageTransition({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    return (
        <AnimatePresence>
            <motion.div
                key={pathname}
                initial={{ opacity: 0, filter: 'blur(10px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="flex-1 w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
