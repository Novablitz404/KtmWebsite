import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { completeOnboarding } from '@/app/actions'

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const role = searchParams.get('role')

    if (code) {
        const cookieStore = await cookies()
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll()
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, { ...options })
                            )
                        } catch {
                            // The `setAll` method was called from a Server Component.
                            // This can be ignored if you have middleware refreshing user sessions.
                        }
                    },
                },
            }
        )

        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            // If a role was passed as a URL param, complete onboarding with that role
            if (role) {
                try {
                    const formData = new FormData()
                    formData.append('role', role)
                    await completeOnboarding(formData)
                } catch (e) {
                    console.error('Error completing onboarding after email confirmation:', e)
                }
            }

            // Redirect to onboarding or home
            const redirectTo = role ? '/onboarding/complete-profile' : '/'
            return NextResponse.redirect(`${origin}${redirectTo}`)
        }
    }

    // Return to sign-in on error
    return NextResponse.redirect(`${origin}/sign-in`)
}
