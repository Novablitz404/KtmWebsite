
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Cleaning up old guideline templates...')

    // The one we want to keep
    const keepName = 'Tap Elite Unified 2026'

    // Find all templates that are NOT the one we want to keep
    const deleted = await prisma.guidelineTemplate.deleteMany({
        where: {
            name: {
                not: keepName
            }
        }
    })

    console.log(`Deleted ${deleted.count} old templates.`)

    // Verify
    const remaining = await prisma.guidelineTemplate.findMany({
        select: { name: true }
    })
    console.log('Remaining templates:', remaining.map(t => t.name))
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
