
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Admin User...')

    const adminUser = await prisma.user.upsert({
        where: { clerkId: 'user_38YIHcNTE1dMciTuKf9K83wd8Z3' },
        update: {
            role: 'ADMIN', // Ensure this matches your Enum or String logic
            name: 'Erich Jann Liwag',
            email: 'ericjann21@gmail.com'
        },
        create: {
            id: Math.floor(10000 + Math.random() * 90000).toString(), // Generate 5-digit ID
            clerkId: 'user_38YIHcNTE1dMciTuKf9K83wd8Z3',
            name: 'Erich Jann Liwag',
            email: 'ericjann21@gmail.com',
            role: 'ADMIN',
            clubName: 'KTM Admin', // Default field required?
            belt: 'Black',
            gender: 'Male',
            weight: 0,
            birthDate: new Date('2000-01-01') // Placeholder
        },
    })

    console.log('Admin User Seeded:', adminUser)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
