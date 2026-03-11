'use client'

import { useQuery } from '@tanstack/react-query'
import { getBalanceSheet } from '@/app/organization/actions'
import { TrendingUp, TrendingDown, DollarSign, Receipt, Clock, Minus } from 'lucide-react'

function formatCurrency(amount: number) {
    return '₱' + Math.abs(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const CATEGORY_LABELS: Record<string, string> = {
    VENUE: 'Venue',
    EQUIPMENT: 'Equipment',
    MEDALS: 'Medals / Trophies',
    TRAVEL: 'Travel',
    FOOD: 'Food',
    PRINTING: 'Printing',
    OFFICIALS: 'Officials',
    MISC: 'Miscellaneous',
}

const TYPE_LABELS: Record<string, string> = {
    tournaments: 'Tournaments',
    promotions: 'Belt Tests',
    seminars: 'Seminars',
    affiliations: 'Affiliations',
}

export default function BalanceSheetView({ primaryColor }: { primaryColor: string }) {
    const { data, isLoading } = useQuery({
        queryKey: ['balance-sheet'],
        queryFn: () => getBalanceSheet(),
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-20 text-gray-400">
                <DollarSign size={40} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium">No financial data available</p>
            </div>
        )
    }

    const isPositive = data.netPosition >= 0

    return (
        <div className="space-y-6">
            {/* Net Position Hero Card */}
            <div className={`relative overflow-hidden rounded-2xl border ${isPositive ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200'} p-6`}>
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">Net Position</p>
                        <p className={`text-4xl font-black mt-2 ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                            {isPositive ? '' : '-'}{formatCurrency(data.netPosition)}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">Revenue minus all expenses</p>
                    </div>
                    <div className={`p-3 rounded-xl ${isPositive ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {isPositive ? <TrendingUp size={28} className="text-emerald-600" /> : <TrendingDown size={28} className="text-red-600" />}
                    </div>
                </div>
            </div>

            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Income */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <TrendingUp size={18} className="text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Income</h3>
                            <p className="text-xs text-gray-500">Revenue from events & affiliations</p>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {Object.entries(data.revenue.byType).map(([type, amount]) => (
                            <div key={type} className="flex items-center justify-between px-6 py-3">
                                <span className="text-sm text-gray-600">{TYPE_LABELS[type] || type}</span>
                                <span className="text-sm font-semibold text-gray-900">{formatCurrency(amount as number)}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between px-6 py-4 bg-emerald-50/50">
                            <span className="text-sm font-bold text-gray-900">Total Revenue</span>
                            <span className="text-lg font-black text-emerald-700">{formatCurrency(data.revenue.total)}</span>
                        </div>
                    </div>
                </div>

                {/* Right: Expenses */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                            <Receipt size={18} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Expenses</h3>
                            <p className="text-xs text-gray-500">Operational costs by category</p>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {Object.entries(data.expenses.byCategory).length === 0 ? (
                            <div className="px-6 py-8 text-center text-gray-400 text-sm">
                                No expenses recorded yet
                            </div>
                        ) : (
                            <>
                                {Object.entries(data.expenses.byCategory)
                                    .sort(([, a], [, b]) => (b as number) - (a as number))
                                    .map(([category, amount]) => (
                                        <div key={category} className="flex items-center justify-between px-6 py-3">
                                            <span className="text-sm text-gray-600">{CATEGORY_LABELS[category] || category}</span>
                                            <span className="text-sm font-semibold text-red-600">-{formatCurrency(amount as number)}</span>
                                        </div>
                                    ))}
                            </>
                        )}
                        <div className="flex items-center justify-between px-6 py-4 bg-red-50/50">
                            <span className="text-sm font-bold text-gray-900">Total Expenses</span>
                            <span className="text-lg font-black text-red-600">-{formatCurrency(data.expenses.total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advance Payments Summary */}
            {(data.advancePayments.unmatchedCount > 0 || data.advancePayments.matchedCount > 0) && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Clock size={18} className="text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Advance Payments</h3>
                            <p className="text-xs text-gray-500">Pre-registration payments overview</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100">
                            <p className="text-xs font-semibold text-amber-600 uppercase">Unmatched</p>
                            <p className="text-xl font-bold text-amber-800 mt-1">{formatCurrency(data.advancePayments.totalUnmatched)}</p>
                            <p className="text-xs text-amber-500 mt-1">{data.advancePayments.unmatchedCount} payment{data.advancePayments.unmatchedCount !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-100">
                            <p className="text-xs font-semibold text-emerald-600 uppercase">Matched</p>
                            <p className="text-xl font-bold text-emerald-800 mt-1">{formatCurrency(data.advancePayments.totalMatched)}</p>
                            <p className="text-xs text-emerald-500 mt-1">{data.advancePayments.matchedCount} payment{data.advancePayments.matchedCount !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Final Summary Bar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                    <div className="flex items-center justify-between px-6 py-3">
                        <span className="text-sm text-gray-600 flex items-center gap-2"><TrendingUp size={14} className="text-emerald-500" /> Total Revenue</span>
                        <span className="font-semibold text-emerald-700">{formatCurrency(data.revenue.total)}</span>
                    </div>
                    <div className="flex items-center justify-between px-6 py-3">
                        <span className="text-sm text-gray-600 flex items-center gap-2"><Minus size={14} className="text-red-400" /> Total Expenses</span>
                        <span className="font-semibold text-red-600">-{formatCurrency(data.expenses.total)}</span>
                    </div>
                    <div className={`flex items-center justify-between px-6 py-4 ${isPositive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <span className="font-bold text-gray-900 flex items-center gap-2">
                            <DollarSign size={16} className={isPositive ? 'text-emerald-600' : 'text-red-600'} /> Net Position
                        </span>
                        <span className={`text-xl font-black ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                            {isPositive ? '' : '-'}{formatCurrency(data.netPosition)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
