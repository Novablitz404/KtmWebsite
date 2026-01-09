import { Skeleton } from '@/components/ui/Skeleton'

export default function TournamentsLoading() {
    return (
        <main className="min-h-[calc(100vh-4rem)] bg-gray-50 pb-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
                {/* Header */}
                <header className="mb-8">
                    <Skeleton className="h-9 w-64 mb-2" />
                    <Skeleton className="h-5 w-80" />
                </header>

                {/* Tournament Cards */}
                <div className="space-y-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        {/* Title */}
                                        <Skeleton className="h-6 w-56 mb-2" />
                                        {/* Date */}
                                        <Skeleton className="h-4 w-48 mb-3" />
                                        {/* Categories count */}
                                        <Skeleton className="h-4 w-36" />
                                    </div>
                                    {/* Register Button */}
                                    <Skeleton className="h-10 w-24 rounded-lg ml-4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}
