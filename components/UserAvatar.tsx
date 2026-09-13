'use client'

import { useState } from 'react'
import { User } from 'lucide-react'

interface UserAvatarProps {
    src?: string | null
    name?: string | null
    size?: number       // px — controls width/height
    // Corner shape — defaults to a full circle. Pass e.g. 'xl'/'2xl' to match
    // a square/rounded-square avatar slot instead.
    rounded?: 'full' | 'md' | 'lg' | 'xl' | '2xl'
    className?: string
    textClassName?: string
}

const ROUNDED_CLASS: Record<NonNullable<UserAvatarProps['rounded']>, string> = {
    full: 'rounded-full',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
}

/**
 * Renders an avatar (circular by default; pass `rounded` for a square slot).
 * - If `src` is provided and loads successfully → shows the image.
 * - If `src` is missing, broken, or fails to load → shows a generic person
 *   icon on a neutral background.
 */
export default function UserAvatar({
    src,
    name,
    size = 40,
    rounded = 'full',
    className = '',
    textClassName = '',
}: UserAvatarProps) {
    const [imgError, setImgError] = useState(false)

    const showImage = src && !imgError

    return (
        <div
            className={`relative flex-shrink-0 ${ROUNDED_CLASS[rounded]} overflow-hidden flex items-center justify-center select-none ${className}`}
            style={{
                width: size,
                height: size,
                background: showImage ? 'transparent' : '#9ca3af',
            }}
        >
            {showImage ? (
                <img
                    src={src}
                    alt={name ?? 'avatar'}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                />
            ) : (
                <User
                    className={`text-white ${textClassName}`}
                    style={{ width: size * 0.58, height: size * 0.58 }}
                    strokeWidth={2}
                />
            )}
        </div>
    )
}
