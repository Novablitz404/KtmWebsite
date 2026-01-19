'use client'

import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import GuidelinesPDF from '@/components/pdf/GuidelinesPDF'
import { useState, useEffect } from 'react'

interface GuidelinesViewProps {
    tournament: {
        id: string
        name: string
        startDate: Date | string
        venue?: string | null
        headerImageUrl?: string | null
    }
    content: string
}

export default function GuidelinesView({ tournament, content }: GuidelinesViewProps) {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    return (
        <main className="min-h-screen bg-gray-50 pb-20">
            {/* Custom Header with Banner Background */}
            <div className="relative bg-indigo-900 border-b border-gray-200 overflow-hidden">
                {/* Background Image with Overlay */}
                {tournament.headerImageUrl && (
                    <div className="absolute inset-0 z-0">
                        <img
                            src={tournament.headerImageUrl}
                            alt="Tournament Banner"
                            className="w-full h-full object-cover opacity-30"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/80" />
                    </div>
                )}

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 text-white">
                    <Link href={`/tournament/${tournament.id}`} className="inline-flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                        Back to Tournament
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-md">
                                Official Guidelines
                            </h1>
                            <p className="text-xl md:text-2xl text-indigo-100 font-medium opacity-90">
                                {tournament.name}
                            </p>
                        </div>

                        {/* Download Button */}
                        {isClient && (
                            <PDFDownloadLink
                                document={<GuidelinesPDF tournament={tournament} content={content} />}
                                fileName={`${tournament.name.replace(/\s+/g, '_')}_Guidelines.pdf`}
                                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-900 hover:bg-gray-100 font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed no-underline"
                            >
                                {({ blob, url, loading, error }) => (
                                    <>
                                        <Download className="w-5 h-5" />
                                        {loading ? 'Preparing PDF...' : 'Download PDF'}
                                    </>
                                )}
                            </PDFDownloadLink>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Viewer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 md:p-12">
                    <div className="prose prose-lg max-w-none text-gray-700">
                        {/* Custom Rendering to remove Markdown artifacts but keep structure */}
                        {content.split('\n').map((line, i) => {
                            const cleanLine = line.replace(/^#+\s*/, '').trim() // Remove leading #
                            if (!cleanLine) return <div key={i} className="h-4" />

                            // Check original line for header level to apply styles
                            if (line.startsWith('# ')) {
                                return <h1 key={i} className="text-3xl font-bold text-gray-900 mt-8 mb-4 border-b pb-2">{cleanLine}</h1>
                            }
                            if (line.startsWith('## ')) {
                                return <h2 key={i} className="text-2xl font-bold text-gray-900 mt-8 mb-4">{cleanLine}</h2>
                            }
                            if (line.startsWith('### ')) {
                                return <h3 key={i} className="text-xl font-bold text-gray-800 mt-6 mb-3">{cleanLine}</h3>
                            }

                            return <p key={i} className="mb-2 leading-relaxed">{cleanLine}</p>
                        })}
                    </div>
                </div>
            </div>
        </main>
    )
}
