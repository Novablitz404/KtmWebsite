'use client'

import { useState, useEffect } from 'react'
import { Shield, User, Lock, DollarSign, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlatformConfig, updatePlatformFee, updatePlatformBankDetails, updatePlatformCompanyDetails } from '@/app/admin/actions'
import SecurityForm from '@/app/settings/SecurityForm'
import { toast } from 'sonner'

interface AdminSettingsViewProps {
    user: {
        id: string
        name: string | null
        email: string
        role: string
        imageUrl: string | null
    }
}

type TabId = 'profile' | 'platform' | 'security'

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'platform', label: 'Platform', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
]

function PlatformSettingsContent() {
    const queryClient = useQueryClient()
    const { data: config, isLoading } = useQuery({
        queryKey: ['platform-config'],
        queryFn: () => getPlatformConfig(),
    })

    const [fee, setFee] = useState('')
    const [bankName, setBankName] = useState('')
    const [accountName, setAccountName] = useState('')
    const [accountNumber, setAccountNumber] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [companyAddress, setCompanyAddress] = useState('')

    useEffect(() => {
        if (config) {
            setFee(String(config.platformFee || ''))
            setBankName(config.bankName || '')
            setAccountName(config.accountName || '')
            setAccountNumber(config.accountNumber || '')
            setCompanyName(config.companyName || '')
            setCompanyAddress(config.companyAddress || '')
        }
    }, [config])

    const mutation = useMutation({
        mutationFn: (newFee: number) => updatePlatformFee(newFee),
        onSuccess: () => {
            toast.success('Platform fee updated')
            queryClient.invalidateQueries({ queryKey: ['platform-config'] })
            queryClient.invalidateQueries({ queryKey: ['admin-financials'] })
        },
        onError: () => toast.error('Failed to update fee'),
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const num = parseFloat(fee)
        if (isNaN(num) || num < 0) {
            toast.error('Please enter a valid fee amount')
            return
        }
        mutation.mutate(num)
    }

    const bankMutation = useMutation({
        mutationFn: (data: { bankName: string, accountName: string, accountNumber: string }) => updatePlatformBankDetails(data),
        onSuccess: () => {
            toast.success('Bank details updated')
            queryClient.invalidateQueries({ queryKey: ['platform-config'] })
        },
        onError: () => toast.error('Failed to update bank details'),
    })

    const handleBankSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        bankMutation.mutate({ bankName, accountName, accountNumber })
    }

    const companyMutation = useMutation({
        mutationFn: (data: { companyName: string, companyAddress: string }) => updatePlatformCompanyDetails(data),
        onSuccess: () => {
            toast.success('Company details updated')
            queryClient.invalidateQueries({ queryKey: ['platform-config'] })
        },
        onError: () => toast.error('Failed to update company details'),
    })

    const handleCompanySubmit = (e: React.FormEvent) => {
        e.preventDefault()
        companyMutation.mutate({ companyName, companyAddress })
    }

    if (isLoading) {
        return (
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6" />
                <div className="h-10 w-64 bg-gray-200 rounded animate-pulse" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Platform Fee</h2>
                    <p className="text-sm text-gray-500 mt-1">Set the fee charged per approved and paid registration across all event types.</p>
                </div>
                <div className="p-6 sm:p-8">
                    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Fee per Registration (₱)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₱</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={fee}
                                    onChange={(e) => setFee(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-gray-50/50 focus:bg-white text-lg font-semibold"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2">This fee applies to tournaments, seminars, promotions, and affiliations equally.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                        >
                            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Fee
                        </button>
                    </form>
                </div>
            </div>

            {/* Bank Details Card */}
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Payment Receiving Details</h2>
                    <p className="text-sm text-gray-500 mt-1">These details will be printed on the bottom of all generated invoices.</p>
                </div>
                <div className="p-6 sm:p-8">
                    <form onSubmit={handleBankSubmit} className="space-y-5 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bank Name</label>
                            <input
                                type="text"
                                value={bankName}
                                onChange={(e) => setBankName(e.target.value)}
                                placeholder="e.g. BDO Unibank"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-gray-50/50 focus:bg-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Name</label>
                            <input
                                type="text"
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                                placeholder="e.g. KTM Administration"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-gray-50/50 focus:bg-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number</label>
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="e.g. 008123456789"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-gray-50/50 focus:bg-white text-sm"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={bankMutation.isPending}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                        >
                            {bankMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Bank Details
                        </button>
                    </form>
                </div>
            </div>

            {/* Company Details Card */}
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Platform Company Details</h2>
                    <p className="text-sm text-gray-500 mt-1">This information will be displayed as the sender details on generated invoices.</p>
                </div>
                <div className="p-6 sm:p-8">
                    <form onSubmit={handleCompanySubmit} className="space-y-5 max-w-md">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="e.g. KTM Platform"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-gray-50/50 focus:bg-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Address</label>
                            <textarea
                                value={companyAddress}
                                onChange={(e) => setCompanyAddress(e.target.value)}
                                placeholder="e.g. 123 Main St, City, Country"
                                rows={3}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-gray-50/50 focus:bg-white text-sm resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={companyMutation.isPending}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50"
                        >
                            {companyMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save Company Details
                        </button>
                    </form>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-white sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">How It Works</h3>
                </div>
                <div className="p-6">
                    <ul className="space-y-3 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            The platform fee is charged for every approved and paid registration
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            Applies equally to tournaments, seminars, promotions, and club affiliations
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            Platform revenue = Platform Fee × Number of Paid Registrations
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-0.5">✓</span>
                            Changes take effect immediately in the Financials tab
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default function AdminSettingsView({ user }: AdminSettingsViewProps) {
    const [activeTab, setActiveTab] = useState<TabId>('profile')

    const profileContent = (
        <div className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                </div>
                <div className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            {user.imageUrl ? (
                                <img
                                    src={user.imageUrl}
                                    alt={user.name || 'Admin'}
                                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-gray-100 shadow-sm object-cover bg-gray-100"
                                />
                            ) : (
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border-2 border-gray-100 shadow-sm">
                                    <Shield className="w-10 h-10 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{user.name || 'Super Admin'}</h3>
                            <p className="text-gray-500 text-sm mt-1">{user.email}</p>

                            <div className="mt-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                                    Super Administrator
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Profile Details Grid */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-6">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Full Name</p>
                                <p className="text-sm font-medium text-gray-900">{user.name || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Email</p>
                                <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Role</p>
                                <p className="text-sm font-medium text-gray-900">Administrator</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">User ID</p>
                                <p className="text-sm font-medium text-gray-900 font-mono truncate" title={user.id}>{user.id}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className="space-y-6">
            {/* Sub-tab Navigation */}
            <div className="bg-white sm:rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-2 p-2">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-all
                                    ${isActive
                                        ? 'bg-gray-900 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }
                                `}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'profile' && profileContent}
                {activeTab === 'platform' && <PlatformSettingsContent />}
                {activeTab === 'security' && <SecurityForm />}
            </div>
        </div>
    )
}
