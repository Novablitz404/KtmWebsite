"use client";

import { MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';
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

const EventCard = ({ event, index }: { event: EventCardProps; index: number }) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const isCompetition = event.type === 'competition';
    const accentColor = isCompetition ? 'text-spanish-red' : 'text-african-turquoise';
    const bgColor = isCompetition ? 'bg-spanish-red' : 'bg-african-turquoise';
    const borderColor = isCompetition ? 'border-spanish-red' : 'border-african-turquoise';

    const formatDate = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatTime = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden h-full"
        >
            {/* Image / Banner Area */}
            <div className={`h-48 ${event.image.startsWith('bg-') ? event.image : 'bg-gray-100'} relative overflow-hidden`}>
                {/* Real image if URL provided */}
                {!event.image.startsWith('bg-') && (
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
                )}
                {/* Overlay Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent`} />

                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                    <span className={`
                        px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm
                        ${event.status === 'open' ? 'bg-emerald-400 text-white' : ''}
                        ${event.status === 'upcoming' ? 'bg-amber-400 text-white' : ''}
                        ${event.status === 'sold-out' ? 'bg-gray-200 text-gray-500' : ''}
                        ${event.status === 'completed' ? 'bg-gray-200 text-gray-500' : ''}
                    `}>
                        {event.status.replace('-', ' ')}
                    </span>
                </div>

                {/* Date Badge */}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-2 text-center min-w-[60px] shadow-sm">
                    <span className={`block text-xs font-black uppercase tracking-wider ${accentColor}`}>
                        {startDate.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="block text-2xl font-black text-gray-900 leading-none mt-0.5">
                        {startDate.getDate()}
                    </span>
                </div>

                {/* Type Tag */}
                <div className="absolute bottom-4 left-4">
                    <span className={`text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5`}>
                        <span className={`w-2 h-2 rounded-full ${bgColor}`}></span>
                        {event.type}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-black text-gray-900 leading-tight mb-3 group-hover:text-congo-blue transition-colors">
                    {event.title}
                </h3>

                <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                        <MapPin size={16} className="text-gray-400" />
                        <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                        <Clock size={16} className="text-gray-400" />
                        <span>{formatDate(startDate)} — {formatDate(endDate)}</span>
                    </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {event.tags.map((tag, i) => (
                        <span key={i} className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md uppercase tracking-wide">
                            {tag}
                        </span>
                    ))}
                </div>

                {/* Footer / Action */}
                <div className="mt-auto pt-6 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Registration</span>
                        {/* Removed Price Display */}
                    </div>

                    {event.link ? (
                        <Link href={event.link} className={`
                            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                            ${event.status === 'open' ? `${bgColor} text-white shadow-md hover:scale-110` : 'bg-gray-100 text-gray-400'}
                        `}>
                            <ArrowRight size={20} />
                        </Link>
                    ) : (
                        <button className={`
                            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                            ${event.status === 'open' ? `${bgColor} text-white shadow-md shadow-${isCompetition ? 'spanish-red' : 'african-turquoise'}/20 hover:scale-110` : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                        `}>
                            <ArrowRight size={20} />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default EventCard;
