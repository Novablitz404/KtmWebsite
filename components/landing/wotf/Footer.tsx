import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-african-turquoise text-white pt-12 pb-8 md:pt-20 md:pb-10">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand / About */}
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter mb-6 text-white">
                            WOTF
                        </h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            The National Governing Body for the sport of Taekwondo in the Philippines, recognized by the Philippine Olympic Committee.
                        </p>
                        <div className="flex gap-4">
                            <Link href="#" className="text-white hover:text-dashing-yellow transition-colors"><Facebook size={20} /></Link>
                            <Link href="#" className="text-white hover:text-dashing-yellow transition-colors"><Twitter size={20} /></Link>
                            <Link href="#" className="text-white hover:text-dashing-yellow transition-colors"><Instagram size={20} /></Link>
                            <Link href="#" className="text-white hover:text-dashing-yellow transition-colors"><Youtube size={20} /></Link>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-widest mb-6 text-congo-blue">Quick Links</h3>
                        <ul className="space-y-4">
                            <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Membership</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Events & Clinics</Link></li>

                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-widest mb-6 text-congo-blue">Resources</h3>
                        <ul className="space-y-4">
                            <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Rulebook</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Referee Certification</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Club Locator</Link></li>

                            <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Contact Support</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-widest mb-6 text-congo-blue">Stay Connected</h3>
                        <p className="text-gray-400 mb-4">Subscribe to our newsletter for the latest updates.</p>
                        <form className="flex flex-col gap-3">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="bg-white/10 border border-white/20 text-white px-4 py-3 rounded-sm focus:outline-none focus:border-congo-blue"
                            />
                            <button className="bg-congo-blue text-white font-bold uppercase tracking-widest px-4 py-3 rounded-sm hover:bg-blue-600 transition-colors">
                                Subscribe
                            </button>
                        </form>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm gap-4">
                    <p>&copy; 2026 WOTF Philippines. All rights reserved.</p>
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="text-xs uppercase tracking-wider">Powered by</span>
                        <Image
                            src="/ktmnav_white.png"
                            alt="KTM"
                            width={80}
                            height={24}
                            className="opacity-60 hover:opacity-100 transition-opacity"
                        />
                    </div>
                    <div className="flex gap-6">
                        <Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
