import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await getAuthUser()
    if (!user) redirect('/sign-in')

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (dbUser?.role !== 'ADMIN') redirect('/')

    return (
        <>
            {children}
        </>
    )
}
