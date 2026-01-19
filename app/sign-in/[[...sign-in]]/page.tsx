import CustomSignInForm from '@/components/auth/CustomSignInForm'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function SignInPage() {
    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gray-50 md:bg-white overflow-hidden relative">
            {/* Back Button */}
            <Link
                href="/"
                className="absolute top-6 left-6 z-50 p-2 text-gray-500 hover:text-gray-900 bg-white/50 backdrop-blur-sm md:bg-transparent rounded-full hover:bg-gray-100 transition-all"
                title="Back to Home"
            >
                <ArrowLeft size={24} />
            </Link>

            {/* Left Column: Sign In Form */}
            <div className="flex flex-col items-center justify-center p-4 md:p-12 lg:p-16 overflow-y-auto">
                {/* Mobile/Tablet Logo (Only shown on small screens) */}
                <div className="md:hidden w-full max-w-md mx-auto text-center mb-8">
                    {/* The CustomSignInForm handles its own branding on mobile/default when hideBranding is false/undefined */}
                </div>

                <div className="w-full max-w-md animate-in slide-in-from-left-5 duration-500">
                    <div className="mb-8 hidden md:block">
                        <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">Welcome Back</h1>
                        <p className="text-gray-500 mt-3 text-lg">Sign in to manage your tournaments</p>
                    </div>

                    {/* 
                        On Desktop (md+): hideBranding={true} so the form is clean and integrates with our custom header above 
                        On Mobile: hideBranding={false} (default) so the form shows its internal logo/header
                    */}
                    <div className="hidden md:block">
                        <CustomSignInForm hideBranding={true} />
                    </div>
                    <div className="md:hidden">
                        <CustomSignInForm />
                    </div>
                </div>
            </div>

            {/* Right Column: Branding & Visuals (Desktop Only) */}
            <div className="hidden md:flex relative flex-col items-center justify-center bg-gray-900 overflow-hidden">
                {/* Background Image / Pattern */}
                <div className="absolute inset-0 z-0 opacity-40">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-900/50 to-gray-900/90 mix-blend-multiply" />
                    {/* You can add a real background image here using Next.js Image */}
                    {/* <Image src="/path/to/bg.jpg" alt="Background" fill className="object-cover" /> */}
                    <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center" />
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 w-full max-w-lg px-12 text-center text-white">
                    <div className="relative w-32 h-32 mx-auto mb-8 bg-white/10 backdrop-blur-md rounded-3xl p-6 shadow-2xl ring-1 ring-white/20">
                        <Image
                            src="/KTMLogo.png"
                            alt="KTM Logo"
                            fill
                            className="object-contain p-4 drop-shadow-xl"
                            priority
                        />
                    </div>



                    <p className="text-xl lg:text-2xl font-medium text-gray-200 leading-relaxed drop-shadow-md">
                        Tournament and Promotion Management System
                    </p>

                    <div className="mt-12 flex items-center justify-center gap-4 text-xs font-semibold text-gray-400 tracking-widest uppercase">
                        <span>Poomsae</span>
                        <div className="w-1 h-1 rounded-full bg-gray-600" />
                        <span>Kyorugi</span>
                        <div className="w-1 h-1 rounded-full bg-gray-600" />
                        <span>Rankings</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
