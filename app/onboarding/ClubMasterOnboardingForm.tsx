'use client'

import { useState } from 'react'
import { completeClubMasterOnboarding } from '@/app/actions'
import { useRouter } from 'next/navigation'
import CustomSelect from '@/app/components/ui/CustomSelect'
import { toast } from 'sonner'
import Image from 'next/image'

interface Organization {
    id: string
    name: string
}

interface ClubMasterOnboardingFormProps {
    organizations: Organization[]
}

export default function ClubMasterOnboardingForm({ organizations }: ClubMasterOnboardingFormProps) {
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

    // Organization fields
    const [organizationId, setOrganizationId] = useState('')
    const [orgSearch, setOrgSearch] = useState('')
    const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false)

    const [submitting, setSubmitting] = useState(false)

    // Filter orgs logic
    const filteredOrgs = organizations.filter(org =>
        org.name.toLowerCase().includes(orgSearch.toLowerCase())
    )

    // Handle selecting an org
    const handleSelectOrg = (org: Organization) => {
        setOrganizationId(org.id)
        setOrgSearch(org.name)
        setIsOrgDropdownOpen(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            if (!organizationId) {
                throw new Error('Please select an Organization')
            }

            const formData = new FormData()
            formData.append('firstName', firstName)
            formData.append('lastName', lastName)
            formData.append('birthDate', birthDate)
            formData.append('gender', gender)
            formData.append('belt', belt)
            formData.append('clubName', clubName)
            formData.append('organizationId', organizationId)

            await completeClubMasterOnboarding(formData)
            router.push('/settings')
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
                    <br />
                    <a href="/onboarding" className="text-orange-600 hover:text-orange-500 font-medium">
                        Looking to join a club? Register here
                    </a>
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

                        {/* Organization Selection */}
                        <div className="relative">
                            <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">
                                Organization <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Select the organization your club is affiliated with.
                            </p>

                            <div className="relative">
                                <input
                                    type="text"
                                    className="block w-full bg-white border border-gray-300 rounded-xl shadow-sm pl-3 pr-10 py-2 text-left focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder="Select an organization..."
                                    value={orgSearch}
                                    onChange={(e) => {
                                        setOrgSearch(e.target.value)
                                        setOrganizationId('') // Clear text based search not allowed for ID binding unless exact
                                        setIsOrgDropdownOpen(true)
                                    }}
                                    onClick={() => setIsOrgDropdownOpen(true)}
                                    onBlur={() => {
                                        // Optional: delay close to allow click
                                        setTimeout(() => setIsOrgDropdownOpen(false), 200)
                                    }}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>

                            {isOrgDropdownOpen && (
                                <div className="absolute z-20 mt-1 w-full bg-white shadow-lg max-h-60 rounded-xl py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                    {filteredOrgs.length === 0 ? (
                                        <div className="text-gray-500 px-4 py-2 text-sm">No organizations found.</div>
                                    ) : (
                                        filteredOrgs.map((org) => (
                                            <div
                                                key={org.id}
                                                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50 ${organizationId === org.id ? 'bg-indigo-50 text-indigo-900' : 'text-gray-900'}`}
                                                onMouseDown={(e) => {
                                                    // use onMouseDown to fire before onBlur
                                                    e.preventDefault()
                                                    handleSelectOrg(org)
                                                }}
                                            >
                                                <span className={`block truncate ${organizationId === org.id ? 'font-semibold' : 'font-normal'}`}>
                                                    {org.name}
                                                </span>
                                                {organizationId === org.id && (
                                                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
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
