'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SyncUrlParams({ params }: { params: Record<string, string> }) {
    const router = useRouter()

    useEffect(() => {
        const search = new URLSearchParams(params).toString()
        router.replace(`/rankings?${search}`, { scroll: false })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return null
}
