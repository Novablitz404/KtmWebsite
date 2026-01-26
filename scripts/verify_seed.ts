
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Verifying Seed Data...')
    const template = await prisma.guidelineTemplate.findUnique({
        where: { name: 'Tap Elite Unified 2026' },
        include: {
            divisions: {
                include: {
                    categories: {
                        orderBy: { displayOrder: 'asc' }
                    }
                },
                orderBy: { displayOrder: 'asc' }
            }
        }
    })

    if (!template) {
        console.error('Template not found!')
        process.exit(1)
    }

    console.log(`Template: ${template.name}`)
    console.log(`Divisions: ${template.divisions.length}`)

    for (const div of template.divisions) {
        console.log(`\nDivision: ${div.name}`)
        console.log(`  Categories: ${div.categories.length}`)
        // Sample first 3 categories
        const sample = div.categories.slice(0, 3)
        for (const cat of sample) {
            console.log(`    - ${cat.name} (${cat.gender})`)
            console.log(`      Weight: [${cat.minWeight}, ${cat.maxWeight}]`)
            console.log(`      Height: [${cat.minHeight}, ${cat.maxHeight}]`)
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
