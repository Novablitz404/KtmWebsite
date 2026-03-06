import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/organizations/[id]/payment-config
 * 
 * Returns the affiliation payment configuration for an organization.
 * Used during onboarding so the club master can pay before the club is created.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const org = await prisma.organization.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                affiliationFee: true,
                affiliationPaymentMethod: true,
                affiliationQrCodeUrl: true,
                affiliationBankName: true,
                affiliationBankAccountNo: true,
                affiliationBankAccountName: true,
                affiliationInstructions: true,
                affiliationPaymentMethods: true,
            }
        })

        if (!org) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }

        // No fee = no payment needed
        if (!org.affiliationFee || org.affiliationFee <= 0) {
            return NextResponse.json({
                hasFee: false,
                fee: 0,
                organizationName: org.name,
                paymentConfig: null,
            })
        }

        // Build payment methods array — prefer new JSON, fall back to legacy fields
        const paymentMethods = (org as any)?.affiliationPaymentMethods || []
        const legacyMethod = org.affiliationBankName ? [{
            id: 'legacy',
            label: org.affiliationBankName,
            bankName: org.affiliationBankName,
            accountNo: org.affiliationBankAccountNo || '',
            accountName: org.affiliationBankAccountName || '',
            qrCodeUrl: org.affiliationQrCodeUrl || null,
        }] : []

        return NextResponse.json({
            hasFee: true,
            fee: org.affiliationFee,
            organizationName: org.name,
            paymentConfig: {
                paymentMethod: org.affiliationPaymentMethod || 'manual',
                paymentMethods: paymentMethods.length > 0 ? paymentMethods : legacyMethod,
                instructions: org.affiliationInstructions,
            }
        })
    } catch (error) {
        console.error('Payment config fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
