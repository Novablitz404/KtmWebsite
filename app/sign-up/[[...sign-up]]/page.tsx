import CustomSignUpForm from '../../../components/auth/CustomSignUpForm'
import Image from 'next/image'

export default async function SignUpPage() {
    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gray-50 md:bg-white overflow-hidden">
            {/* Left Column: Sign Up Form */}
            <div className="flex flex-col items-center justify-center p-4 md:p-12 lg:p-16 overflow-y-auto max-h-screen">
                <div className="w-full max-w-md animate-in slide-in-from-left-5 duration-500 my-auto">
                    <div className="hidden md:block">
                        <CustomSignUpForm headerMode="desktop" />
                    </div>
                    <div className="md:hidden">
                        <CustomSignUpForm headerMode="mobile" />
                    </div>
                </div>
            </div>

            {/* Right Column: Branding & Visuals (Desktop Only) */}
            <div className="hidden md:flex relative flex-col items-center justify-center bg-gray-900 overflow-hidden">
                {/* Background Image / Pattern */}
                <div className="absolute inset-0 z-0 opacity-40">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-900/50 to-gray-900/90 mix-blend-multiply" />
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
