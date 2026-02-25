'use client'

import { Calendar, MapPin, DollarSign, Users, Settings } from 'lucide-react'
import Link from 'next/link'

const statusConfig: Record<string, { bg: string, text: string }> = {
    UPCOMING: { bg: 'bg-blue-50', text: 'text-blue-700' },
    OPEN: { bg: 'bg-green-50', text: 'text-green-700' },
    CLOSED: { bg: 'bg-gray-100', text: 'text-gray-700' },
    COMPLETED: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
    CANCELLED: { bg: 'bg-red-50', text: 'text-red-700' }
}

interface PromotionTest {
    id: string
    name: string
    description?: string | null
    testDate: string | Date
    venue?: string | null
    fee?: number | null
    status: string
    _count: {
        registrations: number
    }
}

interface PromotionsListProps {
    promotionTests: PromotionTest[]
}

export default function PromotionsList({ promotionTests }: PromotionsListProps) {
    return (
        <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                    <th className="px-6 py-4">Test Name</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Venue</th>
                    <th className="px-6 py-4">Fee</th>
                    <th className="px-6 py-4">Registrations</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {promotionTests.length === 0 ? (
                    <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                                <p className="text-gray-500 font-medium">No promotion tests scheduled yet.</p>
                                <p className="text-sm text-gray-400 mt-1">Click "Create" to add a new promotion test.</p>
                            </div>
                        </td>
                    </tr>
                ) : (
                    promotionTests.map((test) => {
                        const config = statusConfig[test.status] || statusConfig.UPCOMING
                        return (
                            <tr key={test.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-semibold text-gray-900">{test.name}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-600 text-sm">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        {new Date(test.testDate).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600 text-sm">
                                    {test.venue ? (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            {test.venue}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-600 text-sm">
                                    {test.fee ? (
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="w-4 h-4 text-gray-400" />
                                            ₱{test.fee.toFixed(0)}
                                        </div>
                                    ) : (
                                        <span className="text-green-600 font-medium">Free</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        {test._count.registrations}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
                                        {test.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        href={`/promotions/${test.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm group"
                                    >
                                        <Settings className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                        Manage
                                    </Link>
                                </td>
                            </tr>
                        )
                    })
                )}
            </tbody>
        </table>
    )
}
