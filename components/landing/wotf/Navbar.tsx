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
    const [openMobileGroups, setOpenMobileGroups] = useState<Record<string, boolean>>({});
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

    const navItems = [
        { name: 'Events/Camps', href: '/events' },
        { name: 'Rankings', href: '/rankings' },
        {
            name: 'Clubs & Members',
            children: [
                { name: 'Membership', href: '/membership' },
                { name: 'Club Locator', href: '/clubs' },
                { name: 'Club Affiliation', href: '/affiliation' },
            ]
        },
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
                <div className="hidden md:flex items-center gap-4 lg:gap-6">
                    {navItems.map((item) => (
                        item.children ? (
                            <div key={item.name} className="relative group py-2">
                                <button className={`flex items-center text-sm font-bold uppercase tracking-wider hover:text-dashing-yellow transition-colors ${isDark ? 'text-african-turquoise' : 'text-white'}`}>
                                    {item.name}
                                </button>
                                <div className="absolute top-[100%] right-0 mt-0 w-48 bg-white border border-gray-100 shadow-xl rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 overflow-hidden before:absolute before:-top-4 before:left-0 before:w-full before:h-4">
                                    <div className="py-2 flex flex-col">
                                        {item.children.map((child) => (
                                            <Link
                                                key={child.name}
                                                href={`${child.href}${qs}`}
                                                className="px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-gray-700 hover:bg-african-turquoise/10 hover:text-african-turquoise transition-colors"
                                            >
                                                {child.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <Link
                                key={item.name}
                                href={`${item.href}${qs}`}
                                className={`text-sm font-bold uppercase tracking-wider hover:text-dashing-yellow transition-colors ${isDark ? 'text-african-turquoise' : 'text-white'
                                    }`}
                            >
                                {item.name}
                            </Link>
                        )
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
                <div className="absolute top-full left-0 w-full bg-white shadow-lg p-6 flex flex-col gap-4 md:hidden max-h-[calc(100vh-70px)] overflow-y-auto">
                    {navItems.map((item) => (
                        item.children ? (
                            <div key={item.name} className="flex flex-col gap-3">
                                <button
                                    className="flex items-center justify-between text-black font-bold uppercase text-lg hover:text-congo-blue w-full text-left"
                                    onClick={() => setOpenMobileGroups(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                                >
                                    {item.name}
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${openMobileGroups[item.name] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </button>
                                {openMobileGroups[item.name] && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="pl-4 flex flex-col gap-3 border-l-2 border-gray-100 ml-1 overflow-hidden"
                                    >
                                        {item.children.map(child => (
                                            <Link
                                                key={child.name}
                                                href={`${child.href}${qs}`}
                                                className="text-black font-bold uppercase text-lg hover:text-congo-blue relative before:absolute before:-left-[18px] before:top-1/2 before:-translate-y-1/2 before:w-2 before:h-0.5 before:bg-gray-200"
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                {child.name}
                                            </Link>
                                        ))}
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            <Link
                                key={item.name}
                                href={`${item.href}${qs}`}
                                className="text-black font-bold uppercase text-lg hover:text-congo-blue"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                {item.name}
                            </Link>
                        )
                    ))}
                    <div className="h-px bg-gray-100 my-2"></div>
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
