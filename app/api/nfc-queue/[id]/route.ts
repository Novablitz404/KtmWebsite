import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/nfc-queue/[id]  { status: "written" | "skipped" }
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const { status } = await req.json()

        if (!['written', 'skipped'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        const updated = await prisma.nfcQueue.update({
            where: { id },
            data: {
                status,
                writtenAt: status === 'written' ? new Date() : undefined,
            },
        })

        return NextResponse.json(updated)
    } catch (err) {
        console.error('[nfc-queue PATCH]', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
