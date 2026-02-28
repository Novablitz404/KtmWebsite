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
            organization: { select: { name: true, logoUrl: true, defaultBeltFees: true } },
            registrations: {
                where: { status: { in: ['APPROVED', 'PASSED', 'FAILED'] } },
                orderBy: { createdAt: 'asc' }
            }
        }
    })

    if (!promotionTest) return notFound()

    // Examiner link expires 3 days after the test date
    const testDate = new Date(promotionTest.testDate)
    const expirationDate = new Date(testDate)
    expirationDate.setDate(expirationDate.getDate() + 3)

    if (new Date() > expirationDate) {
        return (
            <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Link Expired</h1>
                    <p className="text-gray-500 mb-6">
                        This examiner link for <span className="font-semibold text-gray-700">{promotionTest.name}</span> has expired.
                        Examiner links are only valid for 3 days after the test date ({testDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}).
                    </p>
                    <p className="text-sm text-gray-400">
                        Please contact your organization if you need further access.
                    </p>
                </div>
            </main>
        )
    }

    return (
        <ExaminerView
            promotionTest={JSON.parse(JSON.stringify(promotionTest))}
        />
    )
}
