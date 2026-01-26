import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Tap Elite Poomsae Template...')

    const templateName = 'Tap Elite Poomsae 2026'

    // Cleanup existing if running again
    const existing = await prisma.guidelineTemplate.findUnique({
        where: { name: templateName }
    })

    if (existing) {
        console.log('Template exists, updating...')
        await prisma.guidelineTemplate.delete({ where: { name: templateName } })
    }

    const template = await prisma.guidelineTemplate.create({
        data: {
            name: templateName,
            content: `### Tap Elite Poomsae Guidelines

**Divisions:**
*   Toddler (8 & below)
*   Grade School (9-11)
*   Cadet (12-14)
*   Junior (15-17)
*   Under 30 (18-30)

**Required Poomsae (Colored Belts):**
*   **Yellow:** Taegeuk 2 (T2)
*   **Blue:** Taegeuk 4 (T4)
*   **Red:** Taegeuk 6 (T6)
*   **Brown:** Taegeuk 8 (T8)

**Required Poomsae (Black Belts):**
*   **Toddler/Grade School:** Elim (T6) - Final (T7)
*   **Cadet:** Elim (T7) - Final (T8)
*   **Junior:** Elim (T7) - Final (Koryo)
*   **Under 30:** Elim (Koryo) - Final (Koryo)`
        }
    })

    // Divisions
    const divisions = [
        { name: 'Toddler', minAge: 0, maxAge: 8 },
        { name: 'Grade School', minAge: 9, maxAge: 11 },
        { name: 'Cadet', minAge: 12, maxAge: 14 },
        { name: 'Junior', minAge: 15, maxAge: 17 },
        { name: 'Under 30', minAge: 18, maxAge: 30 },
    ]

    // Categories (Belts essentially act as the "Weight Class" separator here)
    const beltCategories = [
        { name: 'Yellow Belt (T2)', gender: ['Male', 'Female', 'Mixed'] },
        { name: 'Blue Belt (T4)', gender: ['Male', 'Female', 'Mixed'] },
        { name: 'Red Belt (T6)', gender: ['Male', 'Female', 'Mixed'] },
        { name: 'Brown Belt (T8)', gender: ['Male', 'Female', 'Mixed'] },
        { name: 'Black Belt', gender: ['Male', 'Female', 'Mixed'] },
    ]

    for (const div of divisions) {
        const d = await prisma.division.create({
            data: {
                templateId: template.id,
                name: div.name,
                minAge: div.minAge,
                maxAge: div.maxAge,
                displayOrder: div.minAge
            }
        })

        let order = 1
        for (const cat of beltCategories) {
            for (const gender of cat.gender) {
                await prisma.weightCategory.create({
                    data: {
                        divisionId: d.id,
                        name: gender === 'Mixed' ? `${cat.name} (Pair/Team)` : cat.name,
                        gender: gender,
                        minWeight: 0,
                        maxWeight: 0,
                        minHeight: 0,
                        maxHeight: 0,
                        displayOrder: order++
                    }
                })
            }
        }
    }

    console.log('Seeding completed!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
