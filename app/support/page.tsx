import { getAuthUser } from '@/lib/supabase/server'
import SupportPageClient from '@/components/support/SupportPageClient'

export default async function SupportPage() {
    const user = await getAuthUser()

    return (
        <SupportPageClient
            user={user ? { name: user.name, email: user.email } : null}
        />
    )
}
