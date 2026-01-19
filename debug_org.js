const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    console.log("Fetching users with role ORGANIZER...")
    const organizers = await prisma.user.findMany({
        where: { role: 'ORGANIZER' },
        include: { organization: true }
    })

    console.log(`Found ${organizers.length} organizers.`)

    organizers.forEach(u => {
        console.log(`- User: ${u.email}`)
        console.log(`  Internal ID: ${u.id}`)
        console.log(`  Clerk ID:    ${u.clerkId}`)
        console.log(`  Organization: ${u.organization ? u.organization.name : 'NULL'}`)
        console.log('---')
    })
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
