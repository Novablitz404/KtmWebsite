'use client'

import { useState } from 'react'

interface UserAvatarProps {
    src?: string | null
    name?: string | null
    size?: number       // px — controls width/height
    className?: string
    textClassName?: string
}

/**
 * Renders a circular avatar.
 * - If `src` is provided and loads successfully → shows the image.
 * - If `src` is missing, broken, or fails to load → shows the user's
 *   initials (up to 2 chars) on a coloured background.
 */
export default function UserAvatar({
    src,
    name,
    size = 40,
    className = '',
    textClassName = '',
}: UserAvatarProps) {
    const [imgError, setImgError] = useState(false)

    const initials = name
        ? name
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join('')
        : '?'

    // Deterministic hue from name so each user gets a consistent colour
    const hue = name
        ? [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 360
        : 200

    const showImage = src && !imgError

    return (
        <div
            className={`relative flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center select-none ${className}`}
            style={{
                width: size,
                height: size,
                background: showImage ? 'transparent' : `hsl(${hue} 55% 55%)`,
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
                <span
                    className={`font-semibold text-white leading-none select-none ${textClassName}`}
                    style={{ fontSize: Math.max(size * 0.38, 11) }}
                >
                    {initials}
                </span>
            )}
        </div>
    )
}
