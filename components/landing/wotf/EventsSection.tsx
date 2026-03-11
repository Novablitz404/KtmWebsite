"use client";

import { Calendar, MapPin, ArrowRight, Trophy, GraduationCap } from 'lucide-react';
import MotionWrapper from './MotionWrapper';
import Link from 'next/link';

interface EventsSectionProps {
    events?: { id: string; name: string; type: string; date: string; venue: string | null }[];
    qs?: string;
}

function formatMonth(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function formatDay(dateStr: string) {
    return new Date(dateStr).getDate();
}

function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

const EventsSection = ({ events, qs = '' }: EventsSectionProps) => {
    const hasEvents = events && events.length > 0;

    return (
        <section className="py-12 md:py-20 bg-white">
            <div className="container mx-auto px-6">
                <MotionWrapper className="text-center mb-8 md:mb-16" direction="up">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-african-turquoise uppercase tracking-tighter mb-4 [-webkit-text-stroke:1px_currentColor]">
                        Upcoming <span className="text-spanish-red">Events</span>
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Join the action. Compete against the best. Witness history.
                    </p>
                </MotionWrapper>

                {hasEvents ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {events.map((event, index) => {
                            const isTournament = event.type === 'Tournament';

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
                                <MotionWrapper key={event.id} delay={index * 0.1} direction="up">
                                    <div className={`group relative bg-white rounded-2xl border ${palette.border} shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden h-full flex flex-col`}>
                                        {/* Top Accent Bar */}
                                        <div className={`h-1.5 ${palette.bg}`} />

                                        {/* Date Badge + Type Header */}
                                        <div className="p-5 pb-0 flex items-start gap-4">
                                            {/* Date Badge */}
                                            <div className={`${palette.bgLight} rounded-xl p-3 text-center min-w-[64px] flex-shrink-0`}>
                                                <span className={`block text-xs font-black uppercase tracking-wider ${palette.accent}`}>
                                                    {formatMonth(event.date)}
                                                </span>
                                                <span className="block text-3xl font-black text-gray-900 leading-none mt-0.5">
                                                    {formatDay(event.date)}
                                                </span>
                                            </div>

                                            {/* Type Badge */}
                                            <div className="flex-1 min-w-0 pt-1">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${palette.accent}`}>
                                                    {isTournament
                                                        ? <Trophy size={12} />
                                                        : <GraduationCap size={12} />
                                                    }
                                                    {event.type}
                                                </span>
                                                <h3 className="text-lg font-black text-gray-900 leading-snug mt-1 group-hover:text-congo-blue transition-colors line-clamp-2">
                                                    {event.name}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div className="p-5 pt-4 flex-1 flex flex-col">
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                                    <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                                                    <span>{formatFullDate(event.date)}</span>
                                                </div>
                                                {event.venue && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                                                        <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{event.venue}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer */}
                                            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Open</span>
                                                <Link
                                                    href={isTournament ? `/tournament/${event.id}${qs}` : `/seminars/${event.id}${qs}`}
                                                    className={`w-9 h-9 rounded-full flex items-center justify-center ${palette.bg} text-white shadow-md hover:scale-110 transition-transform`}
                                                >
                                                    <ArrowRight size={16} />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </MotionWrapper>
                            );
                        })}
                    </div>
                ) : (
                    <MotionWrapper direction="up" delay={0.1}>
                        <div className="text-center py-16 bg-gray-50 rounded-xl border border-gray-100">
                            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-bold text-gray-400 mb-2">No Upcoming Events</h3>
                            <p className="text-gray-400 text-sm">Check back soon for upcoming tournaments and seminars.</p>
                        </div>
                    </MotionWrapper>
                )}

                {/* CTA */}
                <MotionWrapper direction="up" delay={0.3}>
                    <div className="mt-12 text-center">
                        <Link
                            href={`/events${qs}`}
                            className="inline-flex items-center gap-2 bg-congo-blue text-white font-bold text-sm uppercase tracking-widest px-8 py-4 rounded-full hover:bg-congo-blue/90 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                        >
                            View All Events
                            <ArrowRight size={16} />
                        </Link>
                        <p className="mt-4 text-sm text-gray-500">
                            Want to compete?{' '}
                            <Link href={`/membership${qs}`} className="text-spanish-red font-bold hover:underline">
                                Become a Member →
                            </Link>
                        </p>
                    </div>
                </MotionWrapper>
            </div>
        </section>
    );
};

export default EventsSection;
