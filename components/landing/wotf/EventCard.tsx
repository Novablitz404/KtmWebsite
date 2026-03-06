"use client";

import { MapPin, Calendar, Clock, ArrowRight, Trophy, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface EventCardProps {
    id: string | number;
    title: string;
    type: 'competition' | 'camp';
    start: Date;
    end: Date;
    location: string;
    image: string; // URL or placeholder color class
    status: 'open' | 'upcoming' | 'sold-out' | 'completed';
    price?: string;
    tags: string[];
    link?: string;
}

function formatMonth(dateStr: string | Date) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function formatDay(dateStr: string | Date) {
    return new Date(dateStr).getDate();
}

function formatFullDate(dateStr: string | Date) {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

const EventCard = ({ event, index }: { event: EventCardProps; index: number }) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const isTournament = event.type === 'competition';

    // Olympic ring colors: Blue, Yellow, Black, Green, Red
    const olympicPalette = [
        { accent: 'text-[#0085C7]', bg: 'bg-[#0085C7]', bgLight: 'bg-[#0085C7]/10', border: 'border-[#0085C7]/20' },
        { accent: 'text-[#F4C300]', bg: 'bg-[#F4C300]', bgLight: 'bg-[#F4C300]/10', border: 'border-[#F4C300]/20' },
        { accent: 'text-[#1A1A1A]', bg: 'bg-[#1A1A1A]', bgLight: 'bg-[#1A1A1A]/10', border: 'border-[#1A1A1A]/20' },
        { accent: 'text-[#009F3D]', bg: 'bg-[#009F3D]', bgLight: 'bg-[#009F3D]/10', border: 'border-[#009F3D]/20' },
        { accent: 'text-[#DF0024]', bg: 'bg-[#DF0024]', bgLight: 'bg-[#DF0024]/10', border: 'border-[#DF0024]/20' },
    ];
    const palette = olympicPalette[index % olympicPalette.length];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: (index % 10) * 0.1 }}
            className={`group relative bg-white rounded-2xl border ${palette.border} shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden h-full`}
        >
            {/* Banner Image Area */}
            <div className={`relative overflow-hidden ${event.image.startsWith('bg-') ? `h-48 ${event.image}` : ''}`}>
                {!event.image.startsWith('bg-') && (
                    <img
                        src={event.image}
                        alt={event.title}
                        className="w-full h-auto block group-hover:scale-105 transition-transform duration-500"
                    />
                )}
                {/* No overlay — show banner at full brightness */}


            </div>

            {/* Top Accent Bar under image */}
            <div className={`h-1.5 ${palette.bg}`} />

            {/* Content Header: Date Badge + Type/Title */}
            <div className="p-5 pb-0 flex items-start gap-4">
                {/* Date Badge */}
                <div className={`${palette.bgLight} rounded-xl p-3 text-center min-w-[64px] flex-shrink-0`}>
                    <span className={`block text-xs font-black uppercase tracking-wider ${palette.accent}`}>
                        {formatMonth(startDate)}
                    </span>
                    <span className="block text-3xl font-black text-gray-900 leading-none mt-0.5">
                        {formatDay(startDate)}
                    </span>
                </div>

                {/* Type Badge & Title */}
                <div className="flex-1 min-w-0 pt-1">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${palette.accent}`}>
                        {isTournament ? <Trophy size={12} /> : <GraduationCap size={12} />}
                        {event.type}
                    </span>
                    <h3 className="text-lg font-black text-gray-900 leading-snug mt-1 group-hover:text-congo-blue transition-colors line-clamp-2">
                        {event.title}
                    </h3>
                </div>
            </div>

            {/* Details */}
            <div className="p-5 pt-4 flex-1 flex flex-col">
                <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                        <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                        <span>
                            {formatFullDate(startDate)}
                            {startDate.getTime() !== endDate.getTime() && ` — ${formatFullDate(endDate)}`}
                        </span>
                    </div>
                    {event.location && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                        </div>
                    )}
                </div>

                {/* Tags */}
                {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                        {event.tags.map((tag, i) => (
                            <span key={i} className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-md uppercase tracking-wide">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Footer Action */}
                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className={`text-xs font-bold ${event.status === 'open' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {event.status === 'open' ? 'Registration Open' : 'Upcoming'}
                    </span>

                    {event.link ? (
                        <Link
                            href={event.link}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform ${event.status === 'open' || event.status === 'upcoming' ? palette.bg : 'bg-gray-300'}`}
                        >
                            <ArrowRight size={16} />
                        </Link>
                    ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 text-gray-300">
                            <ArrowRight size={16} />
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default EventCard;
