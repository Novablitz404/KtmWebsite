import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ExaminerView from './ExaminerView'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ExaminerPage({ params }: PageProps) {
    const { id } = await params

    const promotionTest = await prisma.promotionTest.findUnique({
        where: { id },
        include: {
            organization: { select: { name: true, logoUrl: true } },
            registrations: {
                where: { status: { in: ['APPROVED', 'PASSED', 'FAILED'] } },
                orderBy: { createdAt: 'asc' }
            }
        }
    })

    if (!promotionTest) return notFound()

    return (
        <ExaminerView
            promotionTest={JSON.parse(JSON.stringify(promotionTest))}
        />
    )
}
