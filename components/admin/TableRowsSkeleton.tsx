import { Skeleton } from "@/components/ui/Skeleton"

interface TableRowsSkeletonProps {
    columns: number
    rows?: number
}

export default function TableRowsSkeleton({ columns, rows = 10 }: TableRowsSkeletonProps) {
    return (
        <>
            {[...Array(rows)].map((_, i) => (
                <tr key={i} className="animate-pulse border-b border-gray-100 last:border-0">
                    {[...Array(columns)].map((_, j) => (
                        <td key={j} className="px-6 py-4 whitespace-nowrap">
                            <Skeleton className="h-5 w-full rounded" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    )
}
