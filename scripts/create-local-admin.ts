/**
 * Link an existing Supabase Auth user to a Prisma User row as ADMIN.
 *
 * Usage: npx tsx scripts/create-local-admin.ts <email> <supabase-auth-user-id>
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = process.argv[2]
    const authUserId = process.argv[3]

    if (!email || !authUserId) {
        console.error('Usage: npx tsx scripts/create-local-admin.ts <email> <supabase-auth-user-id>')
        process.exit(1)
    }

    const existingDbUser = await prisma.user.findFirst({
        where: { OR: [{ email }, { clerkId: authUserId }] },
    })

    if (existingDbUser) {
        const updated = await prisma.user.update({
            where: { id: existingDbUser.id },
            data: { role: 'ADMIN', clerkId: authUserId, email },
        })
        console.log('Promoted existing DB user to ADMIN:', updated.id)
    } else {
        const id = Math.floor(100000000 + Math.random() * 900000000).toString()
        const created = await prisma.user.create({
            data: {
                id,
                clerkId: authUserId,
                email,
                role: 'ADMIN',
            },
        })
        console.log('Created new ADMIN DB user:', created.id)
    }
}

main()
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
