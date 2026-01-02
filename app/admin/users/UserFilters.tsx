'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function UserFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const currentStatus = searchParams.get('status') || 'ALL'
    const currentRole = searchParams.get('role') || 'ALL'
    const currentQuery = searchParams.get('q') || ''

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value === 'ALL') {
            params.delete(key)
        } else {
            params.set(key, value)
        }
        router.push(`/admin/users?${params.toString()}`)
    }

    const handleSearch = (term: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (!term) {
            params.delete('q')
        } else {
            params.set('q', term)
        }
        router.replace(`/admin/users?${params.toString()}`)
    }

    return (
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto bg-gray-50 p-1.5 rounded-xl border border-gray-200">
            <select
                value={currentStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="bg-white border text-sm border-gray-200 text-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
            </select>

            <select
                value={currentRole}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="bg-white border text-sm border-gray-200 text-gray-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
                <option value="ALL">All Roles</option>
                <option value="ATHLETE">Athlete</option>
                <option value="CLUB_MASTER">Club Master</option>
                <option value="ORGANIZER">Organizer</option>
                <option value="ADMIN">Admin</option>
            </select>

            <div className="relative flex-1 sm:w-64">
                <input
                    defaultValue={currentQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search name, email..."
                    className="w-full bg-white pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
                <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
            </div>
        </div>
    )
}
