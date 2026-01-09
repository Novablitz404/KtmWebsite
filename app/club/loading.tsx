import { Skeleton } from '@/components/ui/Skeleton'

export default function ClubLoading() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        {/* Club Logo */}
                        <Skeleton className="w-16 h-16 rounded-xl" />
                        <div>
                            <Skeleton className="h-8 w-48 mb-2" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>

                {/* My Tournaments Section */}
                <section>
                    <div className="flex items-center gap-2 mb-6">
                        <Skeleton className="h-7 w-40" />
                        <Skeleton className="h-5 w-8 rounded-full" />
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-24" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-12" /></th>
                                        <th className="px-6 py-4 text-center"><Skeleton className="h-3 w-24 mx-auto" /></th>
                                        <th className="px-6 py-4 text-center"><Skeleton className="h-3 w-16 mx-auto" /></th>
                                        <th className="px-6 py-4 text-right"><Skeleton className="h-3 w-16 ml-auto" /></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {[1, 2, 3].map((i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4">
                                                <Skeleton className="h-5 w-48 mb-2" />
                                                <Skeleton className="h-4 w-20" />
                                            </td>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-3">
                                                    <Skeleton className="h-6 w-8" />
                                                    <Skeleton className="h-6 w-8" />
                                                    <Skeleton className="h-6 w-8" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-8 mx-auto rounded-full" /></td>
                                            <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* Registrations Section */}
                <section>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <Skeleton className="h-7 w-36 mb-2" />
                            <Skeleton className="h-4 w-72" />
                        </div>
                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            <Skeleton className="h-9 w-16 rounded-lg" />
                            <Skeleton className="h-9 w-20 rounded-lg ml-1" />
                            <Skeleton className="h-9 w-24 rounded-lg ml-1" />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4"><Skeleton className="h-4 w-4" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-16" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-24" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-16" /></th>
                                        <th className="px-6 py-4 text-center"><Skeleton className="h-3 w-16 mx-auto" /></th>
                                        <th className="px-6 py-4 text-right"><Skeleton className="h-3 w-16 ml-auto" /></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-4" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-9 w-9 rounded-full" />
                                                    <div>
                                                        <Skeleton className="h-4 w-32 mb-1" />
                                                        <Skeleton className="h-3 w-16" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Skeleton className="h-4 w-36 mb-1" />
                                                <Skeleton className="h-3 w-24" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <Skeleton className="h-3 w-20 mb-1" />
                                                <Skeleton className="h-3 w-24" />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Skeleton className="h-6 w-20 mx-auto rounded-full" />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Skeleton className="h-7 w-20 rounded-lg" />
                                                    <Skeleton className="h-7 w-16 rounded-lg" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
