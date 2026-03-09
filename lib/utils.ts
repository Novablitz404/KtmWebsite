import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function toTitleCase(str: string) {
    if (!str) return ''
    // Roman numeral patterns to preserve
    const romanNumerals = /^(I{1,3}|IV|VI{0,3}|IX|XI{0,3}|XX)$/
    return str
        .trim()
        .replace(/\s+/g, ' ')                           // collapse multiple spaces
        .replace(/\.(?=\p{L})/gu, '. ')                  // add space after period if missing
        .split(/\s+/)                                    // split into words
        .map(word =>
            word.split('-')                              // handle hyphens
                .map(part => {
                    if (romanNumerals.test(part)) return part.toUpperCase()
                    if (!part) return part
                    return part.charAt(0).toUpperCase() + part.substring(1).toLowerCase()
                })
                .join('-')
        )
        .join(' ')
}
