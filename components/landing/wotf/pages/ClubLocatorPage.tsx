'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, User, Mail, Phone, ExternalLink, ShieldCheck, Clock } from 'lucide-react'
import Navbar from '@/components/landing/wotf/Navbar'
import Footer from '@/components/landing/wotf/Footer'
import Image from 'next/image'

interface ClubProps {
    id: string
    name: string
    masterName: string
    address: string
    contactEmail?: string
    phone: string
    logoUrl?: string | null
    isActiveAffiliate: boolean
    latitude?: number | null
    longitude?: number | null
}

interface ClubLocatorPageProps {
    clubs: ClubProps[]
    tenantName: string
}

export default function ClubLocatorPage({ clubs, tenantName }: ClubLocatorPageProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedClub, setSelectedClub] = useState<ClubProps | null>(null)

    const filteredClubs = clubs.filter(club =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.masterName.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Generate Google Maps Embed URL — use exact coordinates when available, fallback to address search
    const getGoogleMapsUrl = (club: ClubProps) => {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (club.latitude && club.longitude) {
            return `https://maps.google.com/maps?q=${club.latitude},${club.longitude}&z=17&ie=UTF8&iwloc=&output=embed`
        }
        const encoded = encodeURIComponent(club.address !== 'Address not provided' ? club.address : `${club.name} Taekwondo Philippines`)
        return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encoded}&zoom=15`
    }

    return (
        <main className="min-h-screen bg-white">
            <Navbar animate={false} />

            {/* Header Section */}
            <section className="pt-32 pb-16 bg-gradient-to-br from-african-turquoise/10 to-transparent">
                <div className="container mx-auto px-4 md:px-6 text-center max-w-4xl">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-black text-black uppercase tracking-tight mb-6"
                    >
                        {tenantName} <span className="text-african-turquoise">Club Locator</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-gray-600 mb-8"
                    >
                        Find an officially recognized Taekwondo club near you. Search by club name, master name, or location.
                    </motion.p>

                    {/* Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative max-w-2xl mx-auto"
                    >
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search clubs, locations, or instructors..."
                            className="block w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-african-turquoise focus:border-transparent transition-shadow shadow-sm text-gray-900 text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </motion.div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-12 bg-gray-50 border-t border-gray-100">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left Side: List of Clubs */}
                        <div className="w-full lg:w-1/2 flex flex-col gap-4 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
                            <AnimatePresence>
                                {filteredClubs.length > 0 ? (
                                    filteredClubs.map((club, index) => (
                                        <motion.div
                                            key={club.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => club.isActiveAffiliate && setSelectedClub(club)}
                                            className={`p-6 rounded-2xl border-2 transition-all ${!club.isActiveAffiliate
                                                ? 'cursor-default bg-gray-50 border-gray-200'
                                                : selectedClub?.id === club.id
                                                    ? 'border-african-turquoise bg-white shadow-md cursor-pointer'
                                                    : 'border-transparent bg-white shadow-sm hover:shadow-md hover:border-african-turquoise/30 cursor-pointer'
                                                }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                {/* Logo */}
                                                <div className={`w-16 h-16 shrink-0 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 ${!club.isActiveAffiliate ? 'opacity-40 grayscale' : ''}`}>
                                                    {club.logoUrl ? (
                                                        <Image
                                                            src={club.logoUrl}
                                                            alt={club.name}
                                                            width={64}
                                                            height={64}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    ) : (
                                                        <span className="text-2xl text-gray-400 font-bold">
                                                            {club.name.charAt(0)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h3 className={`text-xl font-bold ${!club.isActiveAffiliate ? 'text-gray-400' : 'text-gray-900'}`}>{club.name}</h3>
                                                        {club.isActiveAffiliate ? (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                                                                <ShieldCheck size={14} /> Official
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold border border-yellow-200">
                                                                <Clock size={14} /> Affiliation Processing
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className={`space-y-2 mt-3 ${!club.isActiveAffiliate ? 'opacity-40' : ''}`}>
                                                        <p className="flex items-start text-sm text-gray-600 gap-2">
                                                            <User className="w-4 h-4 shrink-0 text-gray-400 mt-0.5" />
                                                            <span>Instructor: <span className="font-semibold text-gray-900">{club.masterName}</span></span>
                                                        </p>
                                                        <p className="flex items-start text-sm text-gray-600 gap-2 line-clamp-2">
                                                            <MapPin className="w-4 h-4 shrink-0 text-gray-400 mt-0.5" />
                                                            <span>{club.address}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900">No clubs found</h3>
                                        <p className="text-gray-500 mt-2">Try adjusting your search criteria.</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Right Side: Map or Detail View */}
                        <div className="w-full lg:w-1/2 hidden lg:flex flex-col h-[800px] sticky top-24">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1 relative flex flex-col">
                                {selectedClub ? (
                                    <>
                                        {/* Detail Header in Map View */}
                                        <div className="p-6 border-b border-gray-100 bg-white shrink-0">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                                                    {selectedClub.logoUrl ? (
                                                        <Image src={selectedClub.logoUrl} alt={selectedClub.name} width={48} height={48} className="object-cover" />
                                                    ) : (
                                                        <span className="text-lg text-gray-400 font-bold">{selectedClub.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{selectedClub.name}</h3>
                                                    <div className="flex gap-4 mt-2 text-sm text-gray-500">
                                                        {selectedClub.phone !== 'Phone not provided' && (
                                                            <span className="flex items-center gap-1.5"><Phone size={14} /> {selectedClub.phone}</span>
                                                        )}
                                                        {selectedClub.contactEmail && (
                                                            <span className="flex items-center gap-1.5"><Mail size={14} /> {selectedClub.contactEmail}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Map Iframe */}
                                        <div className="flex-1 w-full bg-gray-50 relative">
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                style={{ border: 0 }}
                                                referrerPolicy="no-referrer-when-downgrade"
                                                src={getGoogleMapsUrl(selectedClub)}
                                                allowFullScreen
                                            ></iframe>
                                            {/* Get Directions Button */}
                                            <a
                                                href={selectedClub.latitude && selectedClub.longitude
                                                    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedClub.latitude},${selectedClub.longitude}`
                                                    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedClub.address)}`
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 px-4 py-3 bg-african-turquoise text-white font-semibold rounded-xl shadow-lg hover:brightness-110 transition-all text-sm"
                                            >
                                                <ExternalLink size={16} /> Get Directions in Google Maps
                                            </a>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center flex-1 p-12 text-center bg-gray-50/50">
                                        <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6 border border-gray-200">
                                            <MapPin className="w-8 h-8 text-african-turquoise" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-2">Select a club</h3>
                                        <p className="text-gray-500 max-w-sm">
                                            Click on any club from the list to view its precise location on the map and contact details.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mobile Selected Club Modal/Overlay could be added here later if needed, but for now we rely on the list view. */}

            <Footer />
        </main>
    )
}
