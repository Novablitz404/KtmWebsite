'use client'

import { useState } from 'react'
import { Category, Match } from '@prisma/client'
import BracketView from './BracketView'
import GenerateBracketButton from './GenerateBracketButton'

interface BracketListProps {
    categories: (Category & { matches: Match[] })[]
}

export default function BracketList({ categories }: BracketListProps) {
    if (categories.length === 0) {
        return <p className="text-gray-500">Add categories to generate brackets.</p>
    }

    return (
        <div className="space-y-4">
            {categories.map((cat) => (
                <CollapsibleBracket key={cat.id} category={cat} />
            ))}
        </div>
    )
}

function CollapsibleBracket({ category }: { category: Category & { matches: Match[] } }) {
    const [isOpen, setIsOpen] = useState(false)
    const [court, setCourt] = useState(category.court || '')

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div
                className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <button className="text-gray-400 hover:text-gray-600 focus:outline-none">
                        <svg className={`w-5 h-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <h3 className="font-bold text-lg text-gray-800">{category.name}</h3>
                    <span className="text-xs text-gray-500 font-medium bg-white px-2 py-0.5 rounded border border-gray-200">
                        {category.matches.length} Matches
                    </span>
                    {category.court && (
                        <span className="text-xs text-orange-700 bg-orange-50 font-mono px-2 py-0.5 rounded border border-orange-100">
                            Court {category.court}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center bg-white rounded-lg border border-gray-200 px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all shadow-sm">
                        <span className="text-[10px] text-gray-400 font-bold mr-2 uppercase tracking-wider">Court</span>
                        <input
                            type="text"
                            className="w-12 text-sm font-bold text-gray-700 outline-none bg-transparent placeholder-gray-300"
                            placeholder="#"
                            value={court}
                            onChange={(e) => setCourt(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <GenerateBracketButton categoryId={category.id} court={court} />
                </div>
            </div>

            {isOpen && (
                <div className="p-6 border-t border-gray-100">
                    <div className="overflow-x-auto">
                        <BracketView matches={category.matches} />
                    </div>
                </div>
            )}
        </div>
    )
}
