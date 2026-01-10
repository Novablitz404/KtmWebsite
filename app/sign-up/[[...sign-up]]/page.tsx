import { prisma } from '@/lib/prisma'
import CustomSignUpForm from '../../../components/auth/CustomSignUpForm'

export default async function SignUpPage() {
    // Fetch clubs for the dropdown (sorted alphabetically)
    const clubs = await prisma.club.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    })

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <CustomSignUpForm clubs={clubs} />
        </div>
    )
}
