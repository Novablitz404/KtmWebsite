'use client'

import { useState } from 'react'
import { completeClubMasterOnboarding } from '@/app/actions'
import { useRouter } from 'next/navigation'
import CustomSelect from '@/app/components/ui/CustomSelect'
import { toast } from 'sonner'
import Image from 'next/image'

export default function ClubMasterOnboardingForm() {
    const router = useRouter()
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')

    // Personal fields
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState('Male')
    // Belt is locked to Black for club masters
    const belt = 'Black'

    // Club fields
    const [clubName, setClubName] = useState('')

    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            const formData = new FormData()
            formData.append('firstName', firstName)
            formData.append('lastName', lastName)
            formData.append('birthDate', birthDate)
            formData.append('gender', gender)
            formData.append('belt', belt)
            formData.append('clubName', clubName)

            await completeClubMasterOnboarding(formData)
            router.push('/profile')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong')
            setSubmitting(false)
        }
    }

    return (
        <main className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="mx-auto w-24 h-24 mb-4 relative">
                    <Image
                        src="/KTMLogo.png"
                        alt="KTM Logo"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Welcome, Club Master
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Let's set up your profile and club to get started.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* Personal Information Section */}
                        <div className="border-b border-gray-200 pb-4 mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Personal Information</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                                    First Name
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="firstName"
                                        name="firstName"
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                                    Last Name
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="lastName"
                                        name="lastName"
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* BirthDate */}
                        <div>
                            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">
                                Date of Birth
                            </label>
                            <div className="mt-1">
                                <input
                                    id="birthDate"
                                    name="birthDate"
                                    type="date"
                                    required
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Gender */}
                            <div>
                                <CustomSelect
                                    label="Gender"
                                    value={gender}
                                    onChange={setGender}
                                    options={['Male', 'Female']}
                                    required
                                />
                            </div>

                            {/* Belt - Locked to Black */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Belt</label>
                                <div className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-xl text-sm text-gray-700 flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-black text-white">
                                        BLACK
                                    </span>
                                    <span className="text-gray-400 text-xs">(Default for Club Masters)</span>
                                </div>
                            </div>
                        </div>

                        {/* Club Information Section */}
                        <div className="border-b border-gray-200 pb-4 mb-4 mt-8">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Club Information</h3>
                        </div>

                        <div>
                            <label htmlFor="clubName" className="block text-sm font-medium text-gray-700">
                                Club Name
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Enter the name of your Taekwondo club.
                            </p>
                            <div className="mt-1">
                                <input
                                    id="clubName"
                                    name="clubName"
                                    type="text"
                                    required
                                    placeholder="e.g., Tiger Taekwondo Academy"
                                    value={clubName}
                                    onChange={(e) => setClubName(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                            >
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Creating Club...</span>
                                    </>
                                ) : 'Complete Registration'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    )
}
