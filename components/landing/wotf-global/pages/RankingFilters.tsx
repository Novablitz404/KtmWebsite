'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { ChevronDown, ChevronUp } from 'lucide-react';

export default function RankingFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Local state for the form so it only updates on "Search"
    const [type, setType] = useState(searchParams.get('type') || 'KYORUGI');
    const [division, setDivision] = useState(searchParams.get('division') || '');
    const [weightCategory, setWeightCategory] = useState(searchParams.get('weightCategory') || '');
    const [belt, setBelt] = useState(searchParams.get('belt') || '');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [isExpanded, setIsExpanded] = useState(false);

    const types = ['KYORUGI', 'POOMSAE'];
    const divisions = ['Grade School', 'Cadet', 'Junior', 'Senior'];
    const belts = ['White', 'Yellow', 'Orange', 'Green', 'Purple', 'Blue', 'Red', 'Maroon', 'Brown', 'Black'];

    const categoryMap: Record<string, string[]> = {
        'Grade School': ['Under 112cm', 'Under 120cm', 'Under 128cm', 'Under 136cm', 'Under 144cm', 'Under 152cm', 'Under 160cm', 'Under 168cm', 'Over 168cm'],
        'Cadet': ['Fin', 'Fly', 'Bantam', 'Feather', 'Light', 'Welter', 'Lt Middle', 'Middle', 'Lt Heavy', 'Heavy'],
        'Junior': ['Fin', 'Fly', 'Bantam', 'Feather', 'Light', 'Welter', 'Lt Middle', 'Middle', 'Lt Heavy', 'Heavy'],
        'Senior': ['Under 54kg', 'Under 58kg', 'Under 63kg', 'Under 68kg', 'Under 74kg', 'Under 80kg', 'Under 87kg', 'Over 87kg', 'Under 46kg', 'Under 49kg', 'Under 53kg', 'Under 57kg', 'Under 62kg', 'Under 67kg', 'Under 73kg', 'Over 73kg'],
    };

    const handleSearch = () => {
        const params = new URLSearchParams();
        if (type) params.set('type', type);
        if (division) params.set('division', division);

        // Only set weightCategory if Kyorugi, Belt if Poomsae
        if (type === 'KYORUGI' && weightCategory) params.set('weightCategory', weightCategory);
        if (type === 'POOMSAE' && belt) params.set('belt', belt);

        if (searchQuery) params.set('search', searchQuery);

        router.push(`/rankings?${params.toString()}`);
    };

    const handleClear = () => {
        setType('KYORUGI');
        setDivision('');
        setWeightCategory('');
        setBelt('');
        setSearchQuery('');
        router.push('/rankings?type=KYORUGI');
    };

    const selectClass = "w-full rounded-lg border border-white/20 bg-[#111] text-white px-4 py-3 text-sm focus:border-white focus:ring-1 focus:ring-white outline-none transition-all appearance-none";
    const labelClass = "block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider";

    return (
        <div className="bg-[#0A0A0A] mb-8 p-6 md:p-8 rounded-2xl border border-white/10 shadow-xl">
            <div 
                className="flex items-center justify-between cursor-pointer group"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                    Global Rankings Search
                </h2>
                <button className="text-gray-400 group-hover:text-white transition-colors">
                    {isExpanded ? <ChevronUp /> : <ChevronDown />}
                </button>
            </div>

            {isExpanded && (
                <div className="mt-6 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                        {/* Select Ranking Category */}
                        <div>
                            <label className={labelClass}>Select Category</label>
                            <div className="relative">
                                <select
                                    value={type}
                                    onChange={(e) => {
                                        setType(e.target.value);
                                        setWeightCategory('');
                                        setBelt('');
                                    }}
                                    className={selectClass}
                                >
                                    {types.map(t => (
                                        <option key={t} value={t}>Olympic {t} Rankings</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        {/* Select Division */}
                        <div>
                            <label className={labelClass}>Select Division</label>
                            <div className="relative">
                                <select
                                    value={division}
                                    onChange={(e) => {
                                        setDivision(e.target.value);
                                        setWeightCategory('');
                                    }}
                                    className={selectClass}
                                >
                                    <option value="">All Divisions</option>
                                    {divisions.map(d => (
                                        <option key={d} value={d}>Olympic {d} Division</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        {/* Select Sub Category (Weight/Belt) */}
                        <div>
                            <label className={labelClass}>Select Sub Category</label>
                            <div className="relative">
                                {type === 'KYORUGI' ? (
                                    <select
                                        value={weightCategory}
                                        onChange={(e) => setWeightCategory(e.target.value)}
                                        disabled={!division}
                                        className={`${selectClass} ${!division ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="">All Weights</option>
                                        {(categoryMap[division] || []).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <select
                                        value={belt}
                                        onChange={(e) => setBelt(e.target.value)}
                                        className={selectClass}
                                    >
                                        <option value="">All Belts</option>
                                        {belts.map(b => (
                                            <option key={b} value={b}>{b} Belt</option>
                                        ))}
                                    </select>
                                )}
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        {/* Athlete Search */}
                        <div>
                            <label className={labelClass}>Athlete Name</label>
                            <input
                                type="text"
                                placeholder="Search by name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-white/20 bg-[#111] text-white px-4 py-3 text-sm focus:border-white focus:ring-1 focus:ring-white outline-none transition-all placeholder:text-gray-600 font-medium"
                            />
                        </div>

                        {/* Country (Dummy as per image) */}
                        <div>
                            <label className={labelClass}>Country / Organization</label>
                            <div className="relative">
                                <select disabled className={`${selectClass} opacity-50 cursor-not-allowed`}>
                                    <option>World Olympic Taekwondo Federation - Global</option>
                                </select>
                            </div>
                        </div>

                        {/* Year (Dummy as per image) */}
                        <div>
                            <label className={labelClass}>Year</label>
                            <div className="relative">
                                <select disabled className={`${selectClass} opacity-50 cursor-not-allowed`}>
                                    <option>{new Date().getFullYear()}</option>
                                </select>
                            </div>
                        </div>

                    </div>

                    {/* Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 pt-6 border-t border-white/10">
                        <button
                            onClick={handleSearch}
                            className="w-full sm:w-auto px-10 py-3 bg-white text-black font-black rounded-lg shadow-lg hover:bg-gray-200 transition-all text-sm uppercase tracking-wider"
                        >
                            Search
                        </button>
                        <button
                            onClick={handleClear}
                            className="w-full sm:w-auto px-10 py-3 bg-transparent border border-white/30 text-white font-bold rounded-lg hover:bg-white/5 transition-all text-sm uppercase tracking-wider"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
