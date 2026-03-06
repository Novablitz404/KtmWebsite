"use client";

import { useState } from 'react';
import EventCard from '@/components/landing/wotf/EventCard';
import { Search, Calendar as CalendarIcon } from 'lucide-react';

interface EventData {
    id: string;
    title: string;
    type: 'competition' | 'camp';
    start: Date;
    end: Date;
    location: string;
    image: string;
    status: 'open' | 'upcoming';
    tags: string[];
    link?: string;
    tier?: string;
    dateTBA?: boolean;
}

interface WOTFEventsPageProps {
    events?: EventData[];
}

export default function WOTFEventsPage({ events = [] }: WOTFEventsPageProps) {
    const [filter, setFilter] = useState<'all' | 'competition' | 'camp'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredEvents = events.filter(event => {
        const matchesType = filter === 'all' || event.type === filter;
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || event.location.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    return (
        <section className="pt-24 md:pt-32 pb-12 relative z-20">
            <div className="container mx-auto px-6">
                <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 mb-12 flex flex-col md:flex-row items-center gap-4 justify-between">
                    <div className="flex p-1 bg-gray-100/80 rounded-xl w-full md:w-auto overflow-x-auto">
                        {['all', 'competition', 'camp'].map((tab) => (
                            <button key={tab} onClick={() => setFilter(tab as any)} className={`flex-shrink-0 md:flex-none px-4 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold capitalize transition-all duration-200 ${filter === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}>
                                {tab === 'all' ? 'All Events' : `${tab}s`}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Search events or locations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-congo-blue/20 focus:border-congo-blue transition-all" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredEvents.map((event, index) => (
                        <EventCard key={event.id} event={event as any} index={index} />
                    ))}
                </div>

                {filteredEvents.length === 0 && (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <CalendarIcon size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No events found</h3>
                        <p className="text-gray-500">
                            {events.length === 0
                                ? 'There are no upcoming events at the moment. Check back soon!'
                                : 'Try adjusting your search or filters.'
                            }
                        </p>
                        {events.length > 0 && (
                            <button onClick={() => { setFilter('all'); setSearchQuery(''); }} className="mt-4 text-congo-blue font-bold text-sm hover:underline">
                                Clear all filters
                            </button>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
}
