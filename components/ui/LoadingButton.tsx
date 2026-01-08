'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean
    loadingText?: string
    children: ReactNode
    variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning'
}

const variantStyles = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-sm',
    warning: 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm',
}

export default function LoadingButton({
    isLoading = false,
    loadingText = 'Loading...',
    children,
    variant = 'primary',
    className = '',
    disabled,
    ...props
}: LoadingButtonProps) {
    return (
        <button
            disabled={isLoading || disabled}
            className={`
                inline-flex items-center justify-center gap-2
                px-4 py-2.5 rounded-xl font-medium
                transition-all duration-200
                disabled:opacity-70 disabled:cursor-not-allowed
                ${variantStyles[variant]}
                ${className}
            `}
            {...props}
        >
            {isLoading ? (
                <>
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <span>{loadingText}</span>
                </>
            ) : (
                children
            )}
        </button>
    )
}
