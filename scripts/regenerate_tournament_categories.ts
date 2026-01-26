import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Regenerating Tournament Categories from Template...\n')

    // Find the tournament
    const tournament = await prisma.tournament.findFirst({
        include: {
            guidelineTemplate: {
                include: {
                    divisions: {
                        orderBy: { displayOrder: 'asc' },
                        include: {
                            categories: {
                                orderBy: { displayOrder: 'asc' }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!tournament) {
        console.log('❌ No tournament found!')
        return
    }

    console.log(`📅 Tournament: ${tournament.name}`)

    if (!tournament.guidelineTemplate) {
        console.log('❌ Tournament has no guideline template linked!')
        return
    }

    const template = tournament.guidelineTemplate
    console.log(`📋 Template: ${template.name}`)

    // Delete existing categories
    await prisma.match.deleteMany({ where: { categoryRef: { tournamentId: tournament.id } } })
    await prisma.player.deleteMany({ where: { category: { tournamentId: tournament.id } } })
    await prisma.category.deleteMany({ where: { tournamentId: tournament.id } })
    console.log('🗑️  Deleted existing categories, players, and matches')

    // Rebuild categories from template
    const categoriesToCreate: {
        name: string;
        tournamentId: string;
        type: string;
        subtype: string;
        poomsaeForms: string | null;
        court: string | null
    }[] = []

    for (const division of template.divisions) {
        for (const weightCat of division.categories) {
            const genderLabel = weightCat.gender === 'Both' ? '' : weightCat.gender
            const categoryName = `${division.name} ${genderLabel} ${weightCat.name}`.replace(/\s+/g, ' ').trim()

            categoriesToCreate.push({
                name: categoryName,
                tournamentId: tournament.id,
                type: weightCat.type,
                subtype: weightCat.subtype,
                poomsaeForms: weightCat.poomsaeForms,
                court: null
            })
        }
    }

    await prisma.category.createMany({ data: categoriesToCreate })
    console.log(`✅ Created ${categoriesToCreate.length} categories`)

    // Summary
    const kyorugiCount = categoriesToCreate.filter(c => c.type === 'KYORUGI').length
    const poomsaeCount = categoriesToCreate.filter(c => c.type === 'POOMSAE').length
    console.log(`   - Kyorugi: ${kyorugiCount}`)
    console.log(`   - Poomsae: ${poomsaeCount}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
