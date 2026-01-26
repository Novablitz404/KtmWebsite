import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔍 Verifying Template Data and Tournament Generation...\n')

    // 1. Check Template
    const template = await prisma.guidelineTemplate.findUnique({
        where: { name: 'Tap Elite Unified 2026' },
        include: {
            divisions: {
                orderBy: { displayOrder: 'asc' },
                include: {
                    categories: {
                        orderBy: { displayOrder: 'asc' },
                        take: 5 // Sample
                    }
                }
            }
        }
    })

    if (!template) {
        console.log('❌ Template not found!')
        return
    }

    console.log(`✅ Template: ${template.name}`)
    console.log(`   Divisions: ${template.divisions.length}`)

    // Show sample categories from first division with Poomsae
    for (const div of template.divisions) {
        const poomsaeCats = div.categories.filter(c => c.type === 'POOMSAE')
        if (poomsaeCats.length > 0) {
            console.log(`\n📂 Division: ${div.name} (Age ${div.minAge}-${div.maxAge})`)
            console.log(`   Poomsae Categories: ${poomsaeCats.length}`)

            // Sample
            const sample = poomsaeCats[0]
            console.log(`   Sample Category:`)
            console.log(`     - Name: ${sample.name}`)
            console.log(`     - Type: ${sample.type}`)
            console.log(`     - Subtype: ${sample.subtype}`)
            console.log(`     - Forms: ${sample.poomsaeForms}`)
            break
        }
    }

    // 2. Check if any tournaments exist with categories
    const tournament = await prisma.tournament.findFirst({
        include: {
            categories: {
                take: 10
            }
        }
    })

    if (tournament) {
        console.log(`\n📅 Tournament: ${tournament.name}`)
        console.log(`   Categories: ${tournament.categories.length}`)

        // Sample Poomsae category
        const poomsaeCat = tournament.categories.find(c => c.type === 'POOMSAE')
        if (poomsaeCat) {
            console.log(`   Sample Poomsae Category:`)
            console.log(`     - Name: ${poomsaeCat.name}`)
            console.log(`     - Type: ${poomsaeCat.type}`)
            console.log(`     - Subtype: ${poomsaeCat.subtype}`)
            console.log(`     - Forms: ${poomsaeCat.poomsaeForms}`)
        } else {
            console.log(`   ⚠️ No POOMSAE categories found in tournament!`)
            console.log(`   Sample Category:`)
            const sample = tournament.categories[0]
            if (sample) {
                console.log(`     - Name: ${sample.name}`)
                console.log(`     - Type: ${sample.type}`)
                console.log(`     - Subtype: ${sample.subtype}`)
                console.log(`     - Forms: ${sample.poomsaeForms}`)
            }
        }
    } else {
        console.log('\n⚠️ No tournaments found. Create one using the template to test.')
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
