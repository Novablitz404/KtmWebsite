'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavbarProps {
    variant?: 'default' | 'dark';
    animate?: boolean;
}

const Navbar = ({ variant = 'default', animate: shouldAnimate = false }: NavbarProps) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const tenantParam = searchParams.get('tenant');
    const qs = tenantParam ? `?tenant=${tenantParam}` : '';

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isDark = true;

    const navLinks = [
        { name: 'Events/Camps', href: '/events' },
        { name: 'Membership', href: '/membership' },
        { name: 'About', href: '/about' },
    ];

    return (
        <motion.nav
            initial={shouldAnimate ? { y: -100 } : false}
            animate={shouldAnimate ? { y: 0 } : false}
            transition={shouldAnimate ? { duration: 0.6, ease: "easeOut" } : undefined}
            className={`fixed top-0 w-full z-[100] transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-md py-2' : 'bg-white shadow-md py-2'
                }`}
        >
            <div className="container mx-auto px-3 md:px-6 flex justify-between items-center">
                {/* Logo */}
                <Link href={`/${qs}`} className="flex items-center gap-3">
                    {/* Logo Icon */}
                    <div className="relative h-12 w-12 md:h-16 md:w-16">
                        <Image
                            src="/wotf/logo_image.png"
                            alt="WOTF Icon"
                            fill
                            className="object-contain drop-shadow-[0_0_6px_rgba(0,0,0,0.15)]"
                        />
                    </div>
                    {/* Logo Word */}
                    <div className="relative h-8 w-32 md:h-10 md:w-48 mt-3">
                        <Image
                            src="/wotf/wotf_logo_word.png"
                            alt="WOTF Word"
                            fill
                            className={`object-contain object-left drop-shadow-[0_0_6px_rgba(0,0,0,0.15)] ${!isDark && pathname !== '/' ? 'brightness-0 invert' : ''}`}
                        />
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={`${link.href}${qs}`}
                            className={`text-sm font-bold uppercase tracking-wider hover:text-dashing-yellow transition-colors ${isDark ? 'text-african-turquoise' : 'text-white'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <Link
                        href={`/sign-in${qs}`}
                        className={`text-sm font-bold uppercase tracking-wider hover:text-dashing-yellow transition-colors ${isDark ? 'text-african-turquoise' : 'text-white'
                            }`}
                    >
                        Sign In
                    </Link>
                    <Link
                        href={`/sign-up${qs}`}
                        className="bg-spanish-red text-white px-5 py-2 rounded-sm text-sm font-bold uppercase tracking-widest hover:bg-red-700 transition-colors"
                    >
                        Register
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-2xl"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? (
                        <X className={isDark ? 'text-black' : 'text-black'} />
                    ) : (
                        <Menu className={isDark ? 'text-black' : 'text-black'} />
                    )}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="absolute top-full left-0 w-full bg-white shadow-lg p-6 flex flex-col gap-4 md:hidden">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={`${link.href}${qs}`}
                            className="text-black font-bold uppercase text-lg hover:text-congo-blue"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <Link
                        href={`/sign-in${qs}`}
                        className="text-black font-bold uppercase text-lg hover:text-congo-blue"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Sign In
                    </Link>
                    <Link
                        href={`/sign-up${qs}`}
                        className="bg-spanish-red text-white px-5 py-3 rounded-sm text-center text-sm font-bold uppercase tracking-widest hover:bg-red-700 transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Register
                    </Link>
                </div>
            )}
        </motion.nav>
    );
};

export default Navbar;
