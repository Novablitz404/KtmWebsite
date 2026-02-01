import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding General Guidelines (Kyorugi + Poomsae + Kyukpa) ...')

    const templateName = 'General guidelines - kyorugi, poomsae and kyukpa'

    // Cleanup
    const existing = await prisma.guidelineTemplate.findUnique({
        where: { name: templateName }
    })
    if (existing) {
        console.log('Updating existing template...')
        await prisma.guidelineTemplate.delete({ where: { name: templateName } })
    }

    const template = await prisma.guidelineTemplate.create({
        data: {
            name: templateName,
            content: `### General Tournament Guidelines
Includes Kyorugi, Poomsae, and Kyukpa regulations.

**Kyorugi Rules:**
*   Height-based (Supertoddler to Grade School)
*   Weight-based (Cadet to Senior)

**Poomsae Rules:**
*   Standard Belt Divisions

**Kyukpa (Breaking) Rules:**
*   Format: Single Elimination (Knockout)
*   Divisions: Age-based (Grade School, Cadet, Junior, Under 30)
*   Pairing: Randomized (Blind Draw)`
        }
    })

    // --- DEFINITIONS ---

    // 1. Kyorugi Height/Weight Definitions (Reused from standard)
    const kyHeights = [
        { name: 'Kyorugi - Under 112cm', min: 0, max: 112 },
        { name: 'Kyorugi - Under 120cm', min: 112, max: 120 },
        { name: 'Kyorugi - Under 128cm', min: 120, max: 128 },
        { name: 'Kyorugi - Under 136cm', min: 128, max: 136 },
        { name: 'Kyorugi - Under 144cm', min: 136, max: 144 },
        { name: 'Kyorugi - Under 152cm', min: 144, max: 152 },
        { name: 'Kyorugi - Under 160cm', min: 152, max: 160 },
        { name: 'Kyorugi - Under 168cm', min: 160, max: 168 },
        { name: 'Kyorugi - Over 168cm', min: 168, max: 999 },
    ]
    const kyStandardWeights = (prefix: string) => [
        { name: `${prefix} - Fin`, min: 0, max: 45 }, { name: `${prefix} - Fly`, min: 45, max: 48 },
        { name: `${prefix} - Bantam`, min: 48, max: 51 }, { name: `${prefix} - Feather`, min: 51, max: 55 },
        { name: `${prefix} - Light`, min: 55, max: 59 }, { name: `${prefix} - Welter`, min: 59, max: 63 },
        { name: `${prefix} - Middle`, min: 63, max: 68 }, { name: `${prefix} - Heavy`, min: 68, max: 999 },
    ]

    // 2. Poomsae Belts
    const coloredBelts = ['Yellow', 'Blue', 'Red', 'Brown']
    const blackBelt = 'Black'

    // 3. Kyukpa Divisions (New)
    // Grade School (9-11), Cadet (12-14), Junior (15-17), Under 30 (18-30)
    // Categories: Male / Female per Belt
    // Note: User didn't specify belts, so we will generate for standard belts (Yellow, Blue, Red, Brown, Black)
    const kyukpaBelts = ['Yellow', 'Blue', 'Red', 'Brown', 'Black']

    let order = 1

    // --- HELPER FUNCTIONS ---

    async function createKyorugiHeight(divisionId: string) {
        for (const h of kyHeights) {
            await prisma.weightCategory.create({ data: { divisionId, name: h.name, gender: 'Male', minHeight: h.min, maxHeight: h.max, minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL' } })
            await prisma.weightCategory.create({ data: { divisionId, name: h.name, gender: 'Female', minHeight: h.min, maxHeight: h.max, minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL' } })
        }
    }

    async function createKyorugiWeight(divisionId: string) {
        // Using generic weight classes for simplicity in this general template
        const weights = kyStandardWeights('Kyorugi')
        for (const w of weights) {
            await prisma.weightCategory.create({ data: { divisionId, name: w.name, gender: 'Male', minWeight: w.min, maxWeight: w.max, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL' } })
            await prisma.weightCategory.create({ data: { divisionId, name: w.name, gender: 'Female', minWeight: w.min, maxWeight: w.max, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL' } })
        }
    }

    async function createPoomsae(divisionId: string) {
        for (const belt of coloredBelts) {
            await prisma.weightCategory.create({ data: { divisionId, name: `Poomsae - ${belt} Belt`, gender: 'Male', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'INDIVIDUAL', belt } })
            await prisma.weightCategory.create({ data: { divisionId, name: `Poomsae - ${belt} Belt`, gender: 'Female', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'INDIVIDUAL', belt } })
        }
        // Black Belt
        await prisma.weightCategory.create({ data: { divisionId, name: `Poomsae - Black Belt`, gender: 'Male', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'INDIVIDUAL', belt: 'Black' } })
        await prisma.weightCategory.create({ data: { divisionId, name: `Poomsae - Black Belt`, gender: 'Female', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'INDIVIDUAL', belt: 'Black' } })
    }

    async function createKyukpa(divisionId: string) {
        // Create Kyukpa categories for each belt
        for (const belt of kyukpaBelts) {
            const baseName = `Kyukpa - ${belt} Belt`

            // Male
            await prisma.weightCategory.create({
                data: {
                    divisionId,
                    name: baseName,
                    gender: 'Male',
                    minWeight: 0, maxWeight: 0,
                    displayOrder: order++,
                    type: 'KYUKPA',
                    subtype: 'INDIVIDUAL',
                    belt: belt // Identifying belt for placement logic
                }
            })

            // Female
            await prisma.weightCategory.create({
                data: {
                    divisionId,
                    name: baseName,
                    gender: 'Female',
                    minWeight: 0, maxWeight: 0,
                    displayOrder: order++,
                    type: 'KYUKPA',
                    subtype: 'INDIVIDUAL',
                    belt: belt
                }
            })
        }
    }


    // --- DIVISIONS ---

    // 1. Supertoddler (0-5) - Kyorugi Only
    const divSuper = await prisma.division.create({ data: { templateId: template.id, name: 'Supertoddler', minAge: 0, maxAge: 5, displayOrder: 1 } })
    await createKyorugiHeight(divSuper.id)

    // 2. Toddler (6-8) - Kyorugi + Poomsae
    const divToddler = await prisma.division.create({ data: { templateId: template.id, name: 'Toddler', minAge: 6, maxAge: 8, displayOrder: 2 } })
    await createKyorugiHeight(divToddler.id)
    await createPoomsae(divToddler.id)

    // 3. Grade School (9-11) - Kyorugi + Poomsae + KYUKPA
    const divGS = await prisma.division.create({ data: { templateId: template.id, name: 'Grade School', minAge: 9, maxAge: 11, displayOrder: 3 } })
    await createKyorugiHeight(divGS.id)
    await createPoomsae(divGS.id)
    await createKyukpa(divGS.id)

    // 4. Cadet (12-14) - Kyorugi + Poomsae + KYUKPA
    const divCadet = await prisma.division.create({ data: { templateId: template.id, name: 'Cadet', minAge: 12, maxAge: 14, displayOrder: 4 } })
    await createKyorugiWeight(divCadet.id)
    await createPoomsae(divCadet.id)
    await createKyukpa(divCadet.id)

    // 5. Junior (15-17) - Kyorugi + Poomsae + KYUKPA
    const divJunior = await prisma.division.create({ data: { templateId: template.id, name: 'Junior', minAge: 15, maxAge: 17, displayOrder: 5 } })
    await createKyorugiWeight(divJunior.id)
    await createPoomsae(divJunior.id)
    await createKyukpa(divJunior.id)

    // 6. Under 30 / Senior (18-30) - Kyorugi + Poomsae + KYUKPA
    const divSenior = await prisma.division.create({ data: { templateId: template.id, name: 'Senior (Under 30)', minAge: 18, maxAge: 30, displayOrder: 6 } })
    await createKyorugiWeight(divSenior.id)
    await createPoomsae(divSenior.id)
    await createKyukpa(divSenior.id)

    console.log('Seeding completed for General Guidelines!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
