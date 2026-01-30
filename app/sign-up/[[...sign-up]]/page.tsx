import { prisma } from '@/lib/prisma'
import CustomSignUpForm from '../../../components/auth/CustomSignUpForm'
import Image from 'next/image'

export default async function SignUpPage() {
    // Fetch clubs for the dropdown (sorted alphabetically)
    const clubs = await prisma.club.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    })

    // Fetch organizations for the dropdown
    const organizations = await prisma.organization.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    })

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gray-50 md:bg-white overflow-hidden">
            {/* Left Column: Sign Up Form */}
            <div className="flex flex-col items-center justify-center p-4 md:p-12 lg:p-16 overflow-y-auto max-h-screen">
                {/* Mobile/Tablet Logo (Only shown on small screens) */}
                <div className="md:hidden w-full max-w-md mx-auto text-center mb-8">
                    {/* The CustomSignUpForm handles its own branding on mobile/default when hideBranding is false/undefined */}
                </div>

                <div className="w-full max-w-md animate-in slide-in-from-left-5 duration-500 my-auto">
                    <div className="mb-5 hidden md:block">
                        <h1 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tight">Create Account</h1>
                        <p className="text-gray-500 mt-3 text-lg">Join us to manage or participate in upcoming tournaments</p>
                    </div>

                    {/* 
                        On Desktop (md+): hideBranding={true} so the form is clean and integrates with our custom header above 
                        On Mobile: hideBranding={false} (default) so the form shows its internal logo/header
                    */}
                    <div className="hidden md:block">
                        <CustomSignUpForm clubs={clubs} organizations={organizations} hideBranding={true} />
                    </div>
                    <div className="md:hidden">
                        <CustomSignUpForm clubs={clubs} organizations={organizations} />
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
                    <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1555597408-26bc8e548a46?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center" />
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
