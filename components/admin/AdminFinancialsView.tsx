'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminFinancials, getBillingOrgsForMonth, sendInvoiceEmail, getPlatformInvoices, markInvoiceAsPaid, getPlatformConfig } from '@/app/admin/actions'
import { DollarSign, TrendingUp, TrendingDown, Users, Award, GraduationCap, Trophy, X, Search, ArrowUpRight, ArrowDownRight, Building2, Calendar, ChevronLeft, ChevronRight, Download, Mail, CheckCircle2, FileText, Check } from 'lucide-react'
import { useMemo, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { generateInvoicePDF } from '@/lib/generateInvoicePDF'

type FinancialData = NonNullable<Awaited<ReturnType<typeof getAdminFinancials>>>
type EventItem = FinancialData['events'][0]

function formatCurrency(amount: number) {
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Event Details Modal ─────────────────────────────────────────
function EventDetailsModal({ event, onClose }: {
    event: EventItem,
    onClose: () => void
}) {
    const [search, setSearch] = useState('')
    const filteredRegs = useMemo(() => {
        if (!search.trim()) return event.registrations
        const q = search.toLowerCase()
        return event.registrations.filter(r =>
            r.playerName.toLowerCase().includes(q) ||
            r.clubName.toLowerCase().includes(q)
        )
    }, [event.registrations, search])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className={`p-2 rounded-lg ${event.type === 'tournament' ? 'bg-red-50' : event.type === 'promotion' ? 'bg-blue-50' : event.type === 'affiliation' ? 'bg-violet-50' : 'bg-amber-50'}`}>
                                {event.type === 'tournament'
                                    ? <Trophy size={20} className="text-red-500" />
                                    : event.type === 'promotion'
                                        ? <Award size={20} className="text-blue-500" />
                                        : event.type === 'affiliation'
                                            ? <Building2 size={20} className="text-violet-500" />
                                            : <GraduationCap size={20} className="text-amber-500" />
                                }
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{event.name}</h2>
                        </div>
                        <p className="text-sm text-gray-500 ml-11">{formatDate(event.date)} • {event.organization} • {event.totalRegistrations} Registrations</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Summary Ribbon */}
                <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                    <div className="p-4 text-center">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Paid Registrations</p>
                        <p className="text-lg font-black text-gray-900">{event.paidCount} / {event.totalRegistrations}</p>
                    </div>
                    <div className="p-4 text-center">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Platform Revenue</p>
                        <p className="text-lg font-black text-emerald-600">{formatCurrency(event.totalCollected)}</p>
                    </div>
                </div>

                {event.registrations.length > 3 && (
                    <div className="px-6 py-3 border-b border-gray-100">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by player or club..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {filteredRegs.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{search ? 'No Matches Found' : 'No Registrations'}</h3>
                        </div>
                    ) : (
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Player</th>
                                        <th className="px-6 py-4">Club</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Platform Fee</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRegs.map((reg) => (
                                        <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-gray-900">{reg.playerName}</td>
                                            <td className="px-6 py-4 text-gray-600">{reg.clubName}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${reg.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                    {reg.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-gray-600">{formatCurrency(reg.amountPaid)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-gray-200 font-bold text-gray-900">
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-right text-gray-500 uppercase text-xs tracking-wider">Total Revenue</td>
                                        <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(event.totalCollected)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Pure CSS Donut Chart ────────────────────────────────────────
function DonutChart({ data }: {
    data: { label: string; value: number; color: string }[]
}) {
    const total = data.reduce((s, d) => s + d.value, 0)
    if (total === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col items-center justify-center h-full min-h-[280px]">
                <div className="w-32 h-32 rounded-full border-[12px] border-gray-100 mb-4" />
                <p className="text-sm text-gray-400">No revenue data yet</p>
            </div>
        )
    }

    let cumulative = 0
    const segments = data.filter(d => d.value > 0).map(d => {
        const pct = (d.value / total) * 100
        const start = cumulative
        cumulative += pct
        return { ...d, pct, start }
    })

    const gradientParts = segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(', ')

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-full flex flex-col">
            <h3 className="font-bold text-gray-900 text-lg mb-6 flex-shrink-0">Revenue Distribution</h3>
            <div className="flex flex-col items-center justify-center gap-6 flex-1">
                <div className="relative w-40 h-40 flex-shrink-0">
                    <div className="w-full h-full rounded-full" style={{ background: `conic-gradient(${gradientParts})` }} />
                    <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-xs text-gray-400 font-medium">Total</p>
                            <p className="text-sm font-black text-gray-900">{formatCurrency(total)}</p>
                        </div>
                    </div>
                </div>
                <div className="w-full flex justify-center flex-wrap gap-4 mt-auto">
                    {segments.map(s => (
                        <div key={s.label} className="flex items-center gap-2.5">
                            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-600">{s.label}</span>
                                <span className="text-xs font-bold text-gray-900">{formatCurrency(s.value)}</span>
                                <span className="text-[10px] text-gray-400">({Math.round(s.pct)}%)</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Bar Chart ───────────────────────────────────────────────────
function BarChart({ data }: {
    data: { month: string; tournaments: number; promotions: number; seminars: number; affiliations: number }[]
}) {
    const maxValue = Math.max(...data.map(d => d.tournaments + d.promotions + d.seminars + d.affiliations), 1)
    const yAxisLabels = Array.from({ length: 5 }, (_, i) => {
        const val = maxValue * (i / 4)
        return val >= 1000 ? `₱${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k` : `₱${Math.round(val)}`
    }).reverse()

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm h-full flex flex-col">
            <h3 className="font-bold text-gray-900 text-lg mb-6">Monthly Platform Revenue</h3>
            <div className="flex gap-4 flex-1 min-h-[220px]">
                <div className="flex flex-col justify-between items-end text-[10px] text-gray-400 font-medium py-1 w-10 shrink-0 pb-6">
                    {yAxisLabels.map((lbl, i) => (<span key={i} className="leading-none">{lbl}</span>))}
                </div>
                <div className="flex-1 relative">
                    <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none pb-6">
                        {[0, 1, 2, 3, 4].map(i => (<div key={i} className="w-full border-b border-gray-100/50 border-dashed" />))}
                    </div>
                    <div className="absolute inset-x-0 inset-y-0 flex items-end gap-1.5 pb-6">
                        {data.map((d, i) => {
                            const total = d.tournaments + d.promotions + d.seminars + d.affiliations
                            const barHeight = total > 0 ? (total / maxValue) * 100 : 0
                            const hasData = total > 0

                            return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full group relative z-10">
                                    {hasData && (
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none shadow-lg font-bold">
                                            {formatCurrency(total)}
                                        </div>
                                    )}
                                    <div className="w-full flex items-end justify-center pb-1 h-[calc(100%-1.25rem)]">
                                        <div
                                            className="w-[90%] rounded-t-sm transition-all duration-500 ease-out hover:opacity-80"
                                            style={{
                                                height: `${Math.max(barHeight, hasData ? 4 : 0)}%`,
                                                backgroundColor: '#DC2626',
                                                minHeight: hasData ? '3px' : '0px'
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium leading-none absolute -bottom-5 text-center w-full">{d.month}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── YoY Comparison Banner ───────────────────────────────────────
function YoYBanner({ yoy }: { yoy: FinancialData['yoy'] }) {
    const isUp = yoy.changePercent >= 0
    const hasLastYear = yoy.lastYear > 0

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isUp ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {isUp ? <TrendingUp size={18} className="text-emerald-600" /> : <TrendingDown size={18} className="text-red-600" />}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Year-over-Year</p>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-gray-900">{formatCurrency(yoy.thisYear)}</span>
                            <span className="text-xs text-gray-400">in {yoy.currentYear}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {hasLastYear && (
                        <div className="text-right">
                            <p className="text-xs text-gray-400">{yoy.currentYear - 1}</p>
                            <p className="text-sm font-bold text-gray-600">{formatCurrency(yoy.lastYear)}</p>
                        </div>
                    )}
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        {Math.abs(yoy.changePercent)}%
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Monthly Invoicing ───────────────────────────────────────────
function MonthlyInvoicing() {
    const [activeTab, setActiveTab] = useState<'generate' | 'tracking'>('generate')

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col mt-6">
            {/* Header & Tabs */}
            <div className="border-b border-gray-100 bg-gray-50/50">
                <div className="px-6 py-5 pb-3">
                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 mb-1">
                        <FileText size={20} className="text-gray-400" />
                        Monthly Invoices
                    </h3>
                    <p className="text-sm text-gray-500">Manage, generate, and track platform billing invoices for organizations.</p>
                </div>

                <div className="px-6 flex items-center gap-6 mt-2">
                    <button
                        onClick={() => setActiveTab('generate')}
                        className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'generate' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Generate Invoices
                        {activeTab === 'generate' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-t-full" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('tracking')}
                        className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'tracking' ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Invoice Tracking
                        {activeTab === 'tracking' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-900 rounded-t-full" />}
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-0">
                {activeTab === 'generate' ? <GenerateInvoicesTab /> : <InvoiceTrackingTab />}
            </div>
        </div>
    )
}

function GenerateInvoicesTab() {
    const [date, setDate] = useState(() => new Date())
    const year = date.getFullYear()
    const month = date.getMonth()
    const queryClient = useQueryClient()

    const { data: orgs, isLoading } = useQuery({
        queryKey: ['billing-orgs', year, month],
        queryFn: () => getBillingOrgsForMonth(year, month),
    })

    const { data: config } = useQuery({
        queryKey: ['platform-config'],
        queryFn: getPlatformConfig,
    })

    const [sendingOrgId, setSendingOrgId] = useState<string | null>(null)

    const handleSendInvoice = async (org: any) => {
        setSendingOrgId(org.id)
        try {
            const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            const pdfBase64 = generateInvoicePDF({
                orgDetails: {
                    name: org.name,
                    address: org.address,
                    contactPhone: org.contactPhone,
                    contactEmail: org.contactEmail,
                },
                monthLabel,
                events: org.events,
                totalAmountDue: org.totalAmountDue,
                bankDetails: {
                    bankName: config?.bankName || '',
                    accountName: config?.accountName || '',
                    accountNumber: config?.accountNumber || ''
                },
                companyDetails: {
                    companyName: config?.companyName || '',
                    companyAddress: config?.companyAddress || ''
                }
            })

            if (!org.contactEmail) {
                toast.error(`Cannot send to ${org.name} - no email address on file.`)
                setSendingOrgId(null)
                return
            }

            await sendInvoiceEmail(org.id, org.contactEmail, org.name, monthLabel, org.totalAmountDue, pdfBase64)
            toast.success(`Invoice sent to ${org.name}`)
            queryClient.invalidateQueries({ queryKey: ['platform-invoices'] })
        } catch (error: any) {
            toast.error(error.message || 'Failed to send invoice')
        } finally {
            setSendingOrgId(null)
        }
    }

    const handleDownloadPDF = (org: any) => {
        const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        const pdfBase64 = generateInvoicePDF({
            orgDetails: {
                name: org.name,
                address: org.address,
                contactPhone: org.contactPhone,
                contactEmail: org.contactEmail,
            },
            monthLabel,
            events: org.events,
            totalAmountDue: org.totalAmountDue,
            bankDetails: {
                bankName: config?.bankName || '',
                accountName: config?.accountName || '',
                accountNumber: config?.accountNumber || ''
            },
            companyDetails: {
                companyName: config?.companyName || '',
                companyAddress: config?.companyAddress || ''
            }
        })

        const link = document.createElement('a')
        link.href = pdfBase64
        link.download = `${org.name.replace(/\s+/g, '-')}-Invoice-${monthLabel.replace(/\s+/g, '-')}.pdf`
        link.click()
    }

    const prevMonth = () => setDate(new Date(year, month - 1, 1))
    const nextMonth = () => setDate(new Date(year, month + 1, 1))
    const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    return (
        <div className="flex flex-col">
            <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white text-sm">
                <span className="text-gray-500 font-medium">Select a month to bill organizations for their paid platform events.</span>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1 shadow-sm">
                    <button onClick={prevMonth} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md transition-colors"><ChevronLeft size={16} /></button>
                    <span className="text-xs font-semibold text-gray-900 w-32 text-center">{monthLabel}</span>
                    <button onClick={nextMonth} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md transition-colors"><ChevronRight size={16} /></button>
                </div>
            </div>

            <div className="p-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
                        <p className="text-sm text-gray-500">Loading organizations...</p>
                    </div>
                ) : !orgs || orgs.length === 0 ? (
                    <div className="p-12 text-center">
                        <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-1">No Bills for {monthLabel}</h3>
                        <p className="text-sm text-gray-500">There were no paid events or affiliations during this period.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                                    <th className="px-6 py-3">Organization</th>
                                    <th className="px-6 py-3 text-center">Events</th>
                                    <th className="px-6 py-3 text-right">Amount Due</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {orgs.map((org: any) => (
                                    <tr key={org.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{org.name}</p>
                                            {org.contactEmail ? (
                                                <p className="text-xs text-gray-500">{org.contactEmail}</p>
                                            ) : (
                                                <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded inline-block mt-1 border border-amber-200">No Email</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                                                {org.events.length}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-emerald-600">
                                            {formatCurrency(org.totalAmountDue)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleDownloadPDF(org)}
                                                    className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="Download PDF"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleSendInvoice(org)}
                                                    disabled={!org.contactEmail || sendingOrgId === org.id}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {sendingOrgId === org.id ? (
                                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <Mail size={14} />
                                                    )}
                                                    Email Invoice
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

function InvoiceTrackingTab() {
    const queryClient = useQueryClient()
    const { data: invoices, isLoading } = useQuery({
        queryKey: ['platform-invoices'],
        queryFn: getPlatformInvoices,
    })

    const markPaidMutation = useMutation({
        mutationFn: markInvoiceAsPaid,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-invoices'] })
            toast.success('Invoice marked as paid')
        },
        onError: (err: any) => {
            toast.error(err.message || 'Failed to update invoice status')
        }
    })

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mb-4" />
                <p className="text-sm text-gray-500">Loading invoices...</p>
            </div>
        )
    }

    if (!invoices || invoices.length === 0) {
        return (
            <div className="p-12 text-center bg-white">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Invoices Yet</h3>
                <p className="text-sm text-gray-500">Invoices will appear here once they are generated and emailed to organizations.</p>
            </div>
        )
    }

    return (
        <div className="bg-white overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
                        <th className="px-6 py-3">Organization</th>
                        <th className="px-6 py-3">Billing Month</th>
                        <th className="px-6 py-3 text-right">Amount Due</th>
                        <th className="px-6 py-3">Sent On</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {invoices.map((inv: any) => {
                        const isPaid = inv.status === 'PAID'
                        return (
                            <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <p className="font-semibold text-gray-900">{inv.organization.name}</p>
                                    <p className="text-xs text-gray-500">{inv.organization.contactEmail || 'No Email'}</p>
                                </td>
                                <td className="px-6 py-4 text-gray-900">{inv.billingMonth}</td>
                                <td className="px-6 py-4 text-right font-black text-gray-900">
                                    {formatCurrency(inv.amountDue)}
                                </td>
                                <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                                    {new Date(inv.sentAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-amber-50 text-amber-700 border border-amber-200/60'}`}>
                                        {inv.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {!isPaid ? (
                                        <button
                                            onClick={() => markPaidMutation.mutate(inv.id)}
                                            disabled={markPaidMutation.isPending}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                                        >
                                            <Check size={14} />
                                            Mark Paid
                                        </button>
                                    ) : (
                                        <span className="text-xs text-gray-400 font-medium">
                                            Paid on {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : 'N/A'}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function AdminFinancialsView() {
    const [filter, setFilter] = useState<'all' | 'tournament' | 'promotion' | 'seminar' | 'affiliation'>('all')
    const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
    const [eventPage, setEventPage] = useState(1)
    const [mainTab, setMainTab] = useState<'overview' | 'monthly_invoice'>('overview')

    const { data, isLoading } = useQuery({
        queryKey: ['admin-financials'],
        queryFn: () => getAdminFinancials(),
        staleTime: 1000 * 60 * 5,
    })

    const filteredEvents = useMemo(() => {
        if (!data?.events) return []
        if (filter === 'all') return data.events
        return data.events.filter(e => e.type === filter)
    }, [data?.events, filter])

    useEffect(() => { setEventPage(1) }, [filter])

    const EVENTS_PER_PAGE = 10
    const eventTotalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE)
    const paginatedEvents = filteredEvents.slice((eventPage - 1) * EVENTS_PER_PAGE, eventPage * EVENTS_PER_PAGE)

    // Loading skeleton
    if (isLoading) {
        const skeletonCards = [
            { label: 'Total Revenue', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'Tournaments', icon: Trophy, color: 'bg-red-50 text-red-600' },
            { label: 'Seminars', icon: GraduationCap, color: 'bg-amber-50 text-amber-600' },
            { label: 'Promotions', icon: Award, color: 'bg-blue-50 text-blue-600' },
            { label: 'Registrations', icon: Users, color: 'bg-gray-100 text-gray-600' },
        ]
        return (
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {skeletonCards.map((card, i) => {
                        const Icon = card.icon
                        return (
                            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-lg ${card.color}`}><Icon size={18} /></div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</span>
                                </div>
                                <div className="h-8 w-28 bg-gray-200 rounded-lg animate-pulse" />
                            </div>
                        )
                    })}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-6" />
                        <div className="flex items-end gap-1.5 h-52">
                            {[40, 65, 30, 55, 75, 45, 60, 35, 70, 50, 25, 55].map((h, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                                    <div className="flex-1 w-full flex items-end justify-center">
                                        <div className="w-[90%] rounded-t-sm bg-gray-200 animate-pulse" style={{ height: `${h}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="h-6 w-44 bg-gray-200 rounded animate-pulse mb-6" />
                        <div className="flex justify-center">
                            <div className="w-36 h-36 rounded-full bg-gray-200 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">No Financial Data</h2>
                    <p className="text-gray-500">Data will appear once events have paid registrations.</p>
                </div>
            </div>
        )
    }

    const { summary, monthlyData, revenueByType, yoy } = data

    const donutData = [
        { label: 'Tournaments', value: revenueByType.tournaments, color: '#DC2626' },
        { label: 'Promotions', value: revenueByType.promotions, color: '#3B82F6' },
        { label: 'Seminars', value: revenueByType.seminars, color: '#FBBF24' },
        { label: 'Affiliations', value: revenueByType.affiliations, color: '#8B5CF6' },
    ]

    const summaryCards = [
        {
            label: 'Total Revenue',
            value: formatCurrency(summary.totalCollected),
            icon: DollarSign,
            color: 'bg-emerald-50 text-emerald-600',
            borderColor: 'border-emerald-100',
        },
        {
            label: 'Tournaments',
            value: formatCurrency(revenueByType.tournaments),
            icon: Trophy,
            color: 'bg-red-50 text-red-600',
            borderColor: 'border-red-100',
        },
        {
            label: 'Seminars',
            value: formatCurrency(revenueByType.seminars),
            icon: GraduationCap,
            color: 'bg-amber-50 text-amber-600',
            borderColor: 'border-amber-100',
        },
        {
            label: 'Promotions',
            value: formatCurrency(revenueByType.promotions),
            icon: Award,
            color: 'bg-blue-50 text-blue-600',
            borderColor: 'border-blue-100',
        },
        {
            label: 'Paid Registrations',
            value: summary.totalPaidRegistrations.toLocaleString(),
            icon: Users,
            color: 'bg-gray-100 text-gray-600',
            borderColor: 'border-gray-200',
            extra: <span className="text-[10px] text-gray-400 mt-0.5">of {summary.totalRegistrations.toLocaleString()} total</span>,
        },
    ]

    return (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 overflow-y-auto h-[calc(100vh-5rem)] pb-24 md:pb-6">
            {/* Main Tabs */}
            <div className="bg-white sm:rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-2 p-2">
                    <button
                        onClick={() => setMainTab('overview')}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${mainTab === 'overview' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <TrendingUp size={16} /> Overview
                    </button>
                    <button
                        onClick={() => setMainTab('monthly_invoice')}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all ${mainTab === 'monthly_invoice' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <FileText size={16} /> Monthly Invoices
                    </button>
                </div>
            </div>

            {mainTab === 'monthly_invoice' ? (
                <MonthlyInvoicing />
            ) : (
                <div className="space-y-6">
                    {/* Platform Fee Banner */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 shadow-sm flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <DollarSign size={18} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform Fee</p>
                                <p className="text-lg font-black">{formatCurrency(data.platformFee)} <span className="text-sm font-normal text-gray-400">per approved registration</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        {summaryCards.map((card, i) => {
                            const Icon = card.icon
                            return (
                                <div key={i} className={`bg-white rounded-xl border ${card.borderColor} p-5 shadow-sm ${i === 0 ? 'col-span-2 lg:col-span-1' : ''}`}>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`p-2 rounded-lg ${card.color}`}><Icon size={18} /></div>
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</span>
                                    </div>
                                    <p className="text-2xl font-black text-gray-900">{card.value}</p>
                                    {(card as any).extra}
                                </div>
                            )
                        })}
                    </div>

                    {/* YoY */}
                    <YoYBanner yoy={yoy} />

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                        <div className="lg:col-span-2 h-full">
                            <BarChart data={monthlyData} />
                        </div>
                        <div className="lg:col-span-1 h-full">
                            <DonutChart data={donutData} />
                        </div>
                    </div>

                    {/* Monthly Invoicing moved to tab */}

                    {/* Events Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <h3 className="font-bold text-gray-900 text-lg">Event Breakdown</h3>
                            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                                {(['all', 'tournament', 'promotion', 'seminar', 'affiliation'] as const).map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${filter === f
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {f === 'all' ? 'All' : f === 'tournament' ? 'Tournaments' : f === 'promotion' ? 'Promotions' : f === 'seminar' ? 'Seminars' : 'Affiliations'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {filteredEvents.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 text-sm">
                                No events found for this filter.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                            <th className="px-6 py-3">Event</th>
                                            <th className="px-6 py-3">Organization</th>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3 text-center">Paid / Total</th>
                                            <th className="px-6 py-3 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {paginatedEvents.map((event) => (
                                            <tr
                                                key={event.id}
                                                onClick={() => setSelectedEvent(event)}
                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${event.type === 'tournament' ? 'bg-red-50' : event.type === 'promotion' ? 'bg-blue-50' : event.type === 'affiliation' ? 'bg-violet-50' : 'bg-amber-50'}`}>
                                                            {event.type === 'tournament'
                                                                ? <Trophy size={16} className="text-red-500" />
                                                                : event.type === 'promotion'
                                                                    ? <Award size={16} className="text-blue-500" />
                                                                    : event.type === 'affiliation'
                                                                        ? <Building2 size={16} className="text-violet-500" />
                                                                        : <GraduationCap size={16} className="text-amber-500" />
                                                            }
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900 truncate max-w-[200px]">{event.name}</p>
                                                            <p className="text-xs text-gray-400 capitalize">{event.type === 'tournament' ? 'Tournament' : event.type === 'promotion' ? 'Belt Test' : event.type === 'affiliation' ? 'Club Affiliation' : 'Seminar'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 text-sm">{event.organization}</td>
                                                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{formatDate(event.date)}</td>
                                                <td className="px-6 py-4 text-center text-gray-600">{event.paidCount} / {event.totalRegistrations}</td>
                                                <td className="px-6 py-4 text-right font-black text-emerald-600">{event.totalCollected > 0 ? formatCurrency(event.totalCollected) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-50 border-t border-gray-200">
                                            <td colSpan={3} className="px-6 py-3 font-bold text-gray-900 text-right">Totals</td>
                                            <td className="px-6 py-3 text-center font-bold text-gray-900">{filteredEvents.reduce((s, e) => s + e.paidCount, 0)} / {filteredEvents.reduce((s, e) => s + e.totalRegistrations, 0)}</td>
                                            <td className="px-6 py-3 text-right font-black text-emerald-700">{formatCurrency(filteredEvents.reduce((s, e) => s + e.totalCollected, 0))}</td>
                                        </tr>
                                    </tfoot>
                                </table>

                                {eventTotalPages > 1 && (
                                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs text-gray-500">
                                            Showing {((eventPage - 1) * EVENTS_PER_PAGE) + 1}–{Math.min(eventPage * EVENTS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => setEventPage(p => Math.max(1, p - 1))} disabled={eventPage <= 1}
                                                className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-30">Prev</button>
                                            <span className="text-xs font-semibold text-gray-700 px-2">{eventPage} / {eventTotalPages}</span>
                                            <button onClick={() => setEventPage(p => Math.min(eventTotalPages, p + 1))} disabled={eventPage >= eventTotalPages}
                                                className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-30">Next</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {selectedEvent && (
                <EventDetailsModal
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                />
            )}
        </div>
    )
}
