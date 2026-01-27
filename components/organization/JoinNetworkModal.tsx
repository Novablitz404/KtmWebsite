'use client'

import { useState } from 'react'
import { Search, Building2, User, X } from "lucide-react"
import { searchOrganizations, requestAffiliation } from "@/app/organization/actions"
import { toast } from "sonner"

interface OrganizationResult {
    id: string
    name: string
    logoUrl: string | null
    chairman: string | null
}

export function JoinNetworkModal() {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [results, setResults] = useState<OrganizationResult[]>([])
    const [hasSearched, setHasSearched] = useState(false)
    const [requestingId, setRequestingId] = useState<string | null>(null)

    const handleSearch = async () => {
        if (query.length < 2) {
            toast.error("Please enter at least 2 characters")
            return
        }

        setIsLoading(true)
        try {
            const orgs = await searchOrganizations(query)
            setResults(orgs)
            setHasSearched(true)
        } catch (error) {
            toast.error("Failed to search organizations")
        } finally {
            setIsLoading(false)
        }
    }

    const handleRequest = async (orgId: string) => {
        setRequestingId(orgId)
        try {
            const result = await requestAffiliation(orgId)
            if (result.success) {
                toast.success("Request sent successfully!")
                setIsOpen(false)
            } else {
                toast.error(result.error || "Failed to send request")
            }
        } catch (error) {
            toast.error("An error occurred")
        } finally {
            setRequestingId(null)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <Building2 className="w-4 h-4" />
                Connect with Organization
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal Panel */}
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-lg font-semibold text-gray-900">Join Network</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Search by name..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={isLoading}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {isLoading ? "..." : <Search className="w-4 h-4" />}
                                    </button>
                                </div>

                                <div className="space-y-2 min-h-[200px] max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {isLoading && <div className="text-center text-gray-500 py-8">Searching...</div>}

                                    {!isLoading && hasSearched && results.length === 0 && (
                                        <div className="text-center text-gray-500 py-8">No organizations found.</div>
                                    )}

                                    {!isLoading && results.map((org) => (
                                        <div key={org.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                                    {org.logoUrl ? (
                                                        <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Building2 className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900">{org.name}</p>
                                                    {org.chairman && (
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                                            <User className="w-3 h-3" /> {org.chairman}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRequest(org.id)}
                                                disabled={requestingId === org.id}
                                                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors disabled:opacity-50"
                                            >
                                                {requestingId === org.id ? "Sending..." : "Request"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
