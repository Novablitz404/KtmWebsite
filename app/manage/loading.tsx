import { Skeleton } from '@/components/ui/Skeleton'

export default function ManageLoading() {
    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Skeleton className="h-9 w-64 mb-2" />
                        <Skeleton className="h-5 w-80" />
                    </div>
                    <Skeleton className="h-10 w-40 rounded-lg" />
                </header>

                {/* Stats Section */}
                <section>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                                <Skeleton className="h-8 w-16 mb-2" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tournaments Table */}
                <section className="space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-32" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-16" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-16" /></th>
                                        <th className="px-6 py-4 text-left"><Skeleton className="h-3 w-20" /></th>
                                        <th className="px-6 py-4 text-right"><Skeleton className="h-3 w-16 ml-auto" /></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-50">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4">
                                                <Skeleton className="h-5 w-48 mb-1" />
                                                <Skeleton className="h-3 w-32" />
                                            </td>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                                            <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                                            <td className="px-6 py-4 text-right">
                                                <Skeleton className="h-8 w-20 ml-auto rounded-lg" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}
