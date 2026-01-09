'use client'

interface SkeletonProps {
    className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gray-200 rounded ${className}`}
        />
    )
}

// Pre-built skeleton patterns for common use cases
export function SkeletonText({ lines = 1, className = '' }: { lines?: number, className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={`h-4 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
                />
            ))}
        </div>
    )
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-20 h-20'
    }
    return <Skeleton className={`${sizeClasses[size]} rounded-full`} />
}

export function SkeletonCard() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
            </div>
        </div>
    )
}

export function SkeletonTournamentCard() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Image placeholder */}
            <Skeleton className="h-40 w-full rounded-none" />
            {/* Content */}
            <div className="p-5 space-y-4">
                {/* Title */}
                <Skeleton className="h-5 w-4/5" />
                {/* Date */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                </div>
                {/* Venue */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-40" />
                </div>
            </div>
        </div>
    )
}

export function SkeletonHero() {
    return (
        <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    {/* Logo placeholder */}
                    <div className="flex justify-center mb-8">
                        <Skeleton className="w-32 h-32 rounded-full bg-red-500/30" />
                    </div>
                    {/* Title */}
                    <Skeleton className="h-12 w-80 mx-auto mb-6 bg-red-500/30" />
                    {/* Subtitle */}
                    <Skeleton className="h-6 w-96 mx-auto bg-red-500/30" />
                    {/* Button */}
                    <div className="mt-10 flex justify-center">
                        <Skeleton className="h-14 w-48 rounded-xl bg-white/20" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export function SkeletonPageHeader() {
    return (
        <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <Skeleton className="h-10 w-48 mx-auto mb-4 bg-red-500/30" />
                <Skeleton className="h-5 w-72 mx-auto bg-red-500/30" />
            </div>
        </div>
    )
}
