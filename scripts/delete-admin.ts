import { prisma } from '@/lib/prisma'

async function main() {
    const email = 'ericjann21@gmail.com'

    const user = await prisma.user.findUnique({
        where: { email },
        include: { club: true }
    })

    if (!user) {
        console.log('User not found')
        return
    }

    console.log(`Found user: ${user.name} (${user.id})`)

    // Delete Club
    if (user.club) {
        await prisma.club.delete({
            where: { id: user.club.id }
        })
        console.log(`Deleted Club: ${user.club.name}`)
    }

    // Delete Players
    const { count } = await prisma.player.deleteMany({
        where: { userId: user.id }
    })
    console.log(`Deleted ${count} players linked to user.`)

    // Delete User
    await prisma.user.delete({
        where: { id: user.id }
    })
    console.log(`Successfully deleted user: ${user.email}`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
