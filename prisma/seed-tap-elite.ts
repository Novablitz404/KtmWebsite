import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Tap Elite Kyorugi Template...')

    const templateName = 'Tap Elite Kyorugi 2026'

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
            content: `### Tap Elite Kyorugi Guidelines
      
**Age Calculation:** Year of Birth (e.g., 2026 - YOB).
**Belts:**
*   **White:** Summerians & Beginners
*   **Intermediate:** Yellow (8-7) & Blue (6-5)
*   **Advance:** Red (4-1) & Black`
        }
    })

    // 1. Supertoddler (5 and below) - Height Based
    // 6-8 Toddler
    // 9-11 Grade School
    // Using same height classes for these 3 as per Image 1 implication
    const heightClasses = [
        { name: 'Under 112cm', min: 0, max: 112 },
        { name: 'Under 120cm', min: 112, max: 120 },
        { name: 'Under 128cm', min: 120, max: 128 },
        { name: 'Under 136cm', min: 128, max: 136 },
        { name: 'Under 144cm', min: 136, max: 144 },
        { name: 'Under 152cm', min: 144, max: 152 },
        { name: 'Under 160cm', min: 152, max: 160 },
        { name: 'Under 168cm', min: 160, max: 168 },
        { name: 'Over 168cm', min: 168, max: 999 },
    ]

    const youngDivisions = [
        { name: 'Supertoddler', minAge: 0, maxAge: 5 },
        { name: 'Toddler', minAge: 6, maxAge: 8 },
        { name: 'Grade School', minAge: 9, maxAge: 11 },
    ]

    for (const div of youngDivisions) {
        const d = await prisma.division.create({
            data: {
                templateId: template.id,
                name: div.name,
                minAge: div.minAge,
                maxAge: div.maxAge,
                displayOrder: div.minAge
            }
        })

        // Create Male and Female for each height class (assuming separate)
        let order = 1
        for (const h of heightClasses) {
            await prisma.weightCategory.create({
                data: {
                    divisionId: d.id,
                    name: h.name,
                    gender: 'Male',
                    minWeight: 0,
                    maxWeight: 0,
                    minHeight: h.min,
                    maxHeight: h.max,
                    displayOrder: order
                }
            })
            await prisma.weightCategory.create({
                data: {
                    divisionId: d.id,
                    name: h.name,
                    gender: 'Female',
                    minWeight: 0,
                    maxWeight: 0,
                    minHeight: h.min,
                    maxHeight: h.max,
                    displayOrder: order++
                }
            })
        }
    }

    // 4. Cadet (12-14)
    const cadet = await prisma.division.create({
        data: { templateId: template.id, name: 'Cadet', minAge: 12, maxAge: 14, displayOrder: 12 }
    })

    const cadetMale = [
        { name: 'Fin', min: 0, max: 33 },
        { name: 'Fly', min: 33, max: 37 },
        { name: 'Bantam', min: 37, max: 41 },
        { name: 'Feather', min: 41, max: 45 },
        { name: 'Light', min: 45, max: 49 },
        { name: 'Welter', min: 49, max: 53 },
        { name: 'Lt Middle', min: 53, max: 57 },
        { name: 'Middle', min: 57, max: 61 },
        { name: 'Lt Heavy', min: 61, max: 65 },
        { name: 'Heavy', min: 65, max: 999 },
    ]
    const cadetFemale = [
        { name: 'Fin', min: 0, max: 29 },
        { name: 'Fly', min: 29, max: 33 },
        { name: 'Bantam', min: 33, max: 37 },
        { name: 'Feather', min: 37, max: 41 },
        { name: 'Light', min: 41, max: 44 },
        { name: 'Welter', min: 44, max: 47 },
        { name: 'Lt Middle', min: 47, max: 51 },
        { name: 'Middle', min: 51, max: 55 },
        { name: 'Lt Heavy', min: 55, max: 59 },
        { name: 'Heavy', min: 59, max: 999 },
    ]

    let cOrder = 1
    for (const c of cadetMale) await prisma.weightCategory.create({ data: { divisionId: cadet.id, name: c.name, gender: 'Male', minWeight: c.min, maxWeight: c.max, displayOrder: cOrder++ } })
    cOrder = 1
    for (const c of cadetFemale) await prisma.weightCategory.create({ data: { divisionId: cadet.id, name: c.name, gender: 'Female', minWeight: c.min, maxWeight: c.max, displayOrder: cOrder++ } })


    // 5. Junior (15-17)
    const junior = await prisma.division.create({
        data: { templateId: template.id, name: 'Junior', minAge: 15, maxAge: 17, displayOrder: 15 }
    })

    const juniorMale = [
        { name: 'Fin', min: 0, max: 45 },
        { name: 'Fly', min: 45, max: 48 },
        { name: 'Bantam', min: 48, max: 51 },
        { name: 'Feather', min: 51, max: 55 },
        { name: 'Light', min: 55, max: 59 },
        { name: 'Welter', min: 59, max: 63 },
        { name: 'Lt Middle', min: 63, max: 68 },
        { name: 'Middle', min: 68, max: 73 },
        { name: 'Lt Heavy', min: 73, max: 78 },
        { name: 'Heavy', min: 78, max: 999 },
    ]
    const juniorFemale = [
        { name: 'Fin', min: 0, max: 42 },
        { name: 'Fly', min: 42, max: 44 },
        { name: 'Bantam', min: 44, max: 46 },
        { name: 'Feather', min: 46, max: 49 },
        { name: 'Light', min: 49, max: 52 },
        { name: 'Welter', min: 52, max: 55 },
        { name: 'Lt Middle', min: 55, max: 59 },
        { name: 'Middle', min: 59, max: 63 },
        { name: 'Lt Heavy', min: 63, max: 68 },
        { name: 'Heavy', min: 68, max: 999 },
    ]

    let jOrder = 1
    for (const c of juniorMale) await prisma.weightCategory.create({ data: { divisionId: junior.id, name: c.name, gender: 'Male', minWeight: c.min, maxWeight: c.max, displayOrder: jOrder++ } })
    jOrder = 1
    for (const c of juniorFemale) await prisma.weightCategory.create({ data: { divisionId: junior.id, name: c.name, gender: 'Female', minWeight: c.min, maxWeight: c.max, displayOrder: jOrder++ } })


    // 6. Senior (Under 30) (18-30)
    const senior = await prisma.division.create({
        data: { templateId: template.id, name: 'Senior', minAge: 18, maxAge: 30, displayOrder: 18 }
    })

    // Using Names from Image 3/5 logic where Senior implies Olympic weights usually, but let's check image 5 again
    // Image 5: "Under 54 kg", "Under 58 kg"...
    // It does NOT use Fin/Fly names, just "Under X".
    const seniorMale = [
        { name: 'Under 54kg', min: 0, max: 54 },
        { name: 'Under 58kg', min: 54, max: 58 },
        { name: 'Under 63kg', min: 58, max: 63 },
        { name: 'Under 68kg', min: 63, max: 68 },
        { name: 'Under 74kg', min: 68, max: 74 },
        { name: 'Under 80kg', min: 74, max: 80 },
        { name: 'Under 87kg', min: 80, max: 87 },
        { name: 'Over 87kg', min: 87, max: 999 },
    ]
    const seniorFemale = [
        { name: 'Under 46kg', min: 0, max: 46 },
        { name: 'Under 49kg', min: 46, max: 49 },
        { name: 'Under 53kg', min: 49, max: 53 },
        { name: 'Under 57kg', min: 53, max: 57 },
        { name: 'Under 62kg', min: 57, max: 62 },
        { name: 'Under 67kg', min: 62, max: 67 },
        { name: 'Under 73kg', min: 67, max: 73 },
        { name: 'Over 73kg', min: 73, max: 999 },
    ]

    let sOrder = 1
    for (const c of seniorMale) await prisma.weightCategory.create({ data: { divisionId: senior.id, name: c.name, gender: 'Male', minWeight: c.min, maxWeight: c.max, displayOrder: sOrder++ } })
    sOrder = 1
    for (const c of seniorFemale) await prisma.weightCategory.create({ data: { divisionId: senior.id, name: c.name, gender: 'Female', minWeight: c.min, maxWeight: c.max, displayOrder: sOrder++ } })

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
