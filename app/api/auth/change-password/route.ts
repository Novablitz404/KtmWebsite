import { authenticateApi, apiError, apiResponse } from '@/lib/auth-api'
import { prisma } from '@/lib/prisma'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/auth/change-password
 * Called when a user with mustChangePassword=true chooses to either
 * keep the temporary password or set a new one.
 *
 * Body: { action: 'keep' | 'change', newPassword?: string }
 */
export async function POST(req: Request) {
    const dbUser = await authenticateApi()
    if (!dbUser) return apiError('Unauthorized', 401)

    const { action, newPassword } = await req.json()

    if (action === 'keep') {
        // Just clear the flag
        await prisma.user.update({
            where: { id: dbUser.id },
            data: { mustChangePassword: false }
        })
        return apiResponse({ success: true })
    }

    if (action === 'change') {
        if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
            return apiError('Password must be at least 6 characters.', 400)
        }

        // Update password in Supabase Auth
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        if (dbUser.clerkId) {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(
                dbUser.clerkId,
                { password: newPassword }
            )
            if (error) {
                console.error('[change-password] Error:', error.message)
                return apiError('Failed to update password.', 500)
            }
        }

        // Clear the flag
        await prisma.user.update({
            where: { id: dbUser.id },
            data: { mustChangePassword: false }
        })

        return apiResponse({ success: true })
    }

    return apiError('Invalid action. Use "keep" or "change".', 400)
}
