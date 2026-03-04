'use client'

import { useState } from 'react'
import { Search, Building2, User, Globe } from 'lucide-react'
import { searchOrganizations, requestAffiliation } from '@/app/organization/actions'
import { toast } from 'sonner'

interface OrganizationResult {
    id: string
    name: string
    logoUrl: string | null
    chairman: string | null
}

export default function NetworkSettingsContent() {
    const [query, setQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState<OrganizationResult[]>([])
    const [hasSearched, setHasSearched] = useState(false)
    const [requestingId, setRequestingId] = useState<string | null>(null)

    const handleSearch = async () => {
        if (query.length < 2) {
            toast.error('Please enter at least 2 characters')
            return
        }

        setIsLoading(true)
        try {
            const orgs = await searchOrganizations(query)
            setResults(orgs)
            setHasSearched(true)
        } catch {
            toast.error('Failed to search organizations')
        } finally {
            setIsLoading(false)
        }
    }

    const handleRequest = async (orgId: string) => {
        setRequestingId(orgId)
        try {
            const result = await requestAffiliation(orgId)
            if (result.success) {
                toast.success('Affiliation request sent successfully!')
            } else {
                toast.error(result.error || 'Failed to send request')
            }
        } catch {
            toast.error('An error occurred')
        } finally {
            setRequestingId(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Search Card */}
            <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Connect with Organization</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Search and request affiliation with a parent organization to join their network.
                    </p>
                </div>
                <div className="p-6 sm:p-8">
                    {/* Search Input */}
                    <div className="flex gap-3 max-w-lg">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search organizations by name..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all focus:bg-white"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isLoading}
                            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results */}
            {(hasSearched || results.length > 0) && (
                <div className="bg-white sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">
                            {results.length > 0
                                ? `${results.length} organization${results.length !== 1 ? 's' : ''} found`
                                : 'No results'
                            }
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {results.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Globe className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-1">No Organizations Found</h3>
                                <p className="text-sm text-gray-500">Try a different search term.</p>
                            </div>
                        ) : (
                            results.map((org) => (
                                <div key={org.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                            {org.logoUrl ? (
                                                <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-6 h-6 text-gray-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{org.name}</p>
                                            {org.chairman && (
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <User className="w-3 h-3" /> {org.chairman}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRequest(org.id)}
                                        disabled={requestingId === org.id}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
                                    >
                                        {requestingId === org.id ? 'Sending...' : 'Request Affiliation'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
