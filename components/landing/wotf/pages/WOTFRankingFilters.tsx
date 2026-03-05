'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import GlobalDropdown from '@/components/GlobalDropdown';

export default function WOTFRankingFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Local state for the form so it only updates on "Search"
    const [type, setType] = useState(searchParams.get('type') || 'KYORUGI');
    const [division, setDivision] = useState(searchParams.get('division') || '');
    const [weightCategory, setWeightCategory] = useState(searchParams.get('weightCategory') || '');
    const [belt, setBelt] = useState(searchParams.get('belt') || '');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

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

    return (
        <div className="bg-transparent mb-8">
            <h2 className="text-xl font-black text-gray-900 mb-6 pb-2 border-b border-gray-200 uppercase tracking-tight">
                World Taekwondo Rankings
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                {/* Select Ranking Category */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Ranking Category</label>
                    <GlobalDropdown
                        label="Category"
                        value={type}
                        onChange={(val) => {
                            setType(val);
                            setWeightCategory('');
                            setBelt('');
                        }}
                        options={types.map(t => ({ label: `Olympic ${t} Rankings`, value: t }))}
                        className="w-full"
                        fullWidth
                    />
                </div>

                {/* Select Division */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Division</label>
                    <GlobalDropdown
                        label="Division"
                        value={division}
                        onChange={(val) => {
                            setDivision(val);
                            setWeightCategory('');
                        }}
                        options={[
                            { label: 'All Divisions', value: '' },
                            ...divisions.map(d => ({ label: `Olympic ${d} Division`, value: d }))
                        ]}
                        className="w-full"
                        fullWidth
                    />
                </div>

                {/* Select Sub Category (Weight/Belt) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Sub Category</label>
                    {type === 'KYORUGI' ? (
                        <GlobalDropdown
                            label="Weight Category"
                            value={weightCategory}
                            onChange={(val) => setWeightCategory(val)}
                            options={[
                                { label: 'All Weights', value: '' },
                                ...(categoryMap[division] || []).map(c => ({ label: c, value: c }))
                            ]}
                            className="w-full"
                            fullWidth
                            trigger={
                                <button
                                    type="button"
                                    disabled={!division}
                                    className={`inline-flex justify-between items-center rounded-lg border border-gray-200 shadow-sm px-4 py-3 bg-white text-sm font-medium transition-all w-full ${!division ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                    <span className="truncate">{weightCategory || 'All Weights'}</span>
                                    <svg className="ml-2 h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            }
                        />
                    ) : (
                        <GlobalDropdown
                            label="Belt Category"
                            value={belt}
                            onChange={(val) => setBelt(val)}
                            options={[
                                { label: 'All Belts', value: '' },
                                ...belts.map(b => ({ label: `${b} Belt`, value: b }))
                            ]}
                            className="w-full"
                            fullWidth
                        />
                    )}
                </div>

                {/* Athlete Search */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Athlete</label>
                    <input
                        type="text"
                        placeholder="Search by name"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 shadow-sm px-4 py-3 text-sm focus:border-congo-blue focus:ring-congo-blue outline-none transition-all placeholder:text-gray-400 font-medium"
                    />
                </div>

                {/* Country (Dummy as per image) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Country / Organization</label>
                    <select disabled className="w-full rounded-lg border border-gray-200 shadow-sm px-4 py-3 text-sm bg-gray-50 text-gray-500 font-medium appearance-none cursor-not-allowed">
                        <option>World Olympic Taekwondo Federation - Philippines Only</option>
                    </select>
                </div>

                {/* Year (Dummy as per image) */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Year</label>
                    <select disabled className="w-full rounded-lg border border-gray-200 shadow-sm px-4 py-3 text-sm bg-gray-50 text-gray-500 font-medium appearance-none cursor-not-allowed">
                        <option>{new Date().getFullYear()}</option>
                    </select>
                </div>

            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-100">
                <button
                    onClick={handleSearch}
                    className="px-8 py-2.5 bg-congo-blue text-white font-bold rounded shadow-md shadow-congo-blue/20 hover:bg-blue-700 transition-all text-sm uppercase tracking-wider"
                >
                    Search
                </button>
                <button
                    onClick={handleClear}
                    className="px-8 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded shadow-sm hover:bg-gray-50 transition-all text-sm uppercase tracking-wider"
                >
                    Start Over
                </button>
            </div>
        </div>
    );
}
