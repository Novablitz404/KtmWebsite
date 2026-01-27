import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding Unified Tap Elite Guidelines (Kyorugi + Poomsae) ...')

    const templateName = 'Tap Elite Unified 2026'

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
            content: `### Tap Elite Unified Guidelines 2026
Includes both Kyorugi and Poomsae regulations.

**Kyorugi Rules:**
*   **Supertoddler/Toddler/Grade School:** Height-based (Under 112cm - Over 168cm)
*   **Cadet/Junior/Senior:** Weight-based (Olympics/Standard)

**Poomsae Rules:**
*   Colored Belt: Yellow (T2), Blue (T4), Red (T6), Brown (T8)
*   Black Belt: Varies by Division (See below)`
        }
    })

    // --- DEFINITIONS ---

    // 1. Kyorugi Height Classes (Supertoddler, Toddler, Grade School)
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

    // 2. Kyorugi Weight Classes
    const kyCadetM = [
        { name: 'Kyorugi - Fin', min: 0, max: 33 }, { name: 'Kyorugi - Fly', min: 33, max: 37 },
        { name: 'Kyorugi - Bantam', min: 37, max: 41 }, { name: 'Kyorugi - Feather', min: 41, max: 45 },
        { name: 'Kyorugi - Light', min: 45, max: 49 }, { name: 'Kyorugi - Welter', min: 49, max: 53 },
        { name: 'Kyorugi - Lt Middle', min: 53, max: 57 }, { name: 'Kyorugi - Middle', min: 57, max: 61 },
        { name: 'Kyorugi - Lt Heavy', min: 61, max: 65 }, { name: 'Kyorugi - Heavy', min: 65, max: 999 },
    ]
    const kyCadetF = [
        { name: 'Kyorugi - Fin', min: 0, max: 29 }, { name: 'Kyorugi - Fly', min: 29, max: 33 },
        { name: 'Kyorugi - Bantam', min: 33, max: 37 }, { name: 'Kyorugi - Feather', min: 37, max: 41 },
        { name: 'Kyorugi - Light', min: 41, max: 44 }, { name: 'Kyorugi - Welter', min: 44, max: 47 },
        { name: 'Kyorugi - Lt Middle', min: 47, max: 51 }, { name: 'Kyorugi - Middle', min: 51, max: 55 },
        { name: 'Kyorugi - Lt Heavy', min: 55, max: 59 }, { name: 'Kyorugi - Heavy', min: 59, max: 999 },
    ]

    const kyJuniorM = [
        { name: 'Kyorugi - Fin', min: 0, max: 45 }, { name: 'Kyorugi - Fly', min: 45, max: 48 },
        { name: 'Kyorugi - Bantam', min: 48, max: 51 }, { name: 'Kyorugi - Feather', min: 51, max: 55 },
        { name: 'Kyorugi - Light', min: 55, max: 59 }, { name: 'Kyorugi - Welter', min: 59, max: 63 },
        { name: 'Kyorugi - Lt Middle', min: 63, max: 68 }, { name: 'Kyorugi - Middle', min: 68, max: 73 },
        { name: 'Kyorugi - Lt Heavy', min: 73, max: 78 }, { name: 'Kyorugi - Heavy', min: 78, max: 999 },
    ]
    const kyJuniorF = [
        { name: 'Kyorugi - Fin', min: 0, max: 42 }, { name: 'Kyorugi - Fly', min: 42, max: 44 },
        { name: 'Kyorugi - Bantam', min: 44, max: 46 }, { name: 'Kyorugi - Feather', min: 46, max: 49 },
        { name: 'Kyorugi - Light', min: 49, max: 52 }, { name: 'Kyorugi - Welter', min: 52, max: 55 },
        { name: 'Kyorugi - Lt Middle', min: 55, max: 59 }, { name: 'Kyorugi - Middle', min: 59, max: 63 },
        { name: 'Kyorugi - Lt Heavy', min: 63, max: 68 }, { name: 'Kyorugi - Heavy', min: 68, max: 999 },
    ]

    const kySeniorM = [
        { name: 'Kyorugi - Under 54kg', min: 0, max: 54 }, { name: 'Kyorugi - Under 58kg', min: 54, max: 58 },
        { name: 'Kyorugi - Under 63kg', min: 58, max: 63 }, { name: 'Kyorugi - Under 68kg', min: 63, max: 68 },
        { name: 'Kyorugi - Under 74kg', min: 68, max: 74 }, { name: 'Kyorugi - Under 80kg', min: 74, max: 80 },
        { name: 'Kyorugi - Under 87kg', min: 80, max: 87 }, { name: 'Kyorugi - Over 87kg', min: 87, max: 999 },
    ]
    const kySeniorF = [
        { name: 'Kyorugi - Under 46kg', min: 0, max: 46 }, { name: 'Kyorugi - Under 49kg', min: 46, max: 49 },
        { name: 'Kyorugi - Under 53kg', min: 49, max: 53 }, { name: 'Kyorugi - Under 57kg', min: 53, max: 57 },
        { name: 'Kyorugi - Under 62kg', min: 57, max: 62 }, { name: 'Kyorugi - Under 67kg', min: 62, max: 67 },
        { name: 'Kyorugi - Under 73kg', min: 67, max: 73 }, { name: 'Kyorugi - Over 73kg', min: 73, max: 999 },
    ]

    // 3. Poomsae Forms (Colored Belt - same for all divisions)
    const coloredBeltForms = [
        { belt: 'Yellow', form: 'Taegeuk 2' },
        { belt: 'Blue', form: 'Taegeuk 4' },
        { belt: 'Red', form: 'Taegeuk 6' },
        { belt: 'Brown', form: 'Taegeuk 8' },
    ]

    // 4. Poomsae Forms (Black Belt - varies by division)
    // Format: divisionName -> { elimination: string, finals: string }
    const blackBeltFormsByDivision: Record<string, { elimination: string; finals: string }> = {
        'Supertoddler': { elimination: 'Taegeuk 6', finals: 'Taegeuk 7' },
        'Toddler': { elimination: 'Taegeuk 6', finals: 'Taegeuk 7' },
        'Grade School': { elimination: 'Taegeuk 6', finals: 'Taegeuk 7' },
        'Cadet': { elimination: 'Taegeuk 7', finals: 'Taegeuk 8' },
        'Junior': { elimination: 'Taegeuk 7', finals: 'Koryo' },
        'Senior (Under 30)': { elimination: 'Koryo', finals: 'Koryo' },
    }

    // Helper to create Poomsae categories for a division
    async function createPoomsaeCategories(divisionId: string, divisionName: string, orderStart: number) {
        let order = orderStart

        // Colored Belts (Individual, Pair, Team)
        for (const belt of coloredBeltForms) {
            const baseName = `Poomsae - ${belt.belt} Belt`
            const forms = belt.form

            // Individual Male/Female
            await prisma.weightCategory.create({ data: { divisionId, name: baseName, gender: 'Male', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'INDIVIDUAL', poomsaeForms: forms, belt: belt.belt } })
            await prisma.weightCategory.create({ data: { divisionId, name: baseName, gender: 'Female', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'INDIVIDUAL', poomsaeForms: forms, belt: belt.belt } })
            // Pair
            await prisma.weightCategory.create({ data: { divisionId, name: `${baseName} (Mixed Pair)`, gender: 'Mixed', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'PAIR', poomsaeForms: forms, belt: belt.belt } })
            // Team Male
            await prisma.weightCategory.create({ data: { divisionId, name: `${baseName} (Team)`, gender: 'Male', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'TEAM', poomsaeForms: forms, belt: belt.belt } })
            // Team Female
            await prisma.weightCategory.create({ data: { divisionId, name: `${baseName} (Team)`, gender: 'Female', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'TEAM', poomsaeForms: forms, belt: belt.belt } })
        }

        // Black Belt
        const bbForms = blackBeltFormsByDivision[divisionName]
        if (bbForms) {
            const baseName = 'Poomsae - Black Belt'
            const forms = `Elimination: ${bbForms.elimination}, Finals: ${bbForms.finals}`

            // Individual Male/Female
            await prisma.weightCategory.create({ data: { divisionId, name: baseName, gender: 'Male', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'INDIVIDUAL', poomsaeForms: forms, belt: 'Black' } })
            await prisma.weightCategory.create({ data: { divisionId, name: baseName, gender: 'Female', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'INDIVIDUAL', poomsaeForms: forms, belt: 'Black' } })
            // Pair
            await prisma.weightCategory.create({ data: { divisionId, name: `${baseName} (Mixed Pair)`, gender: 'Mixed', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'PAIR', poomsaeForms: forms, belt: 'Black' } })
            // Team Male
            await prisma.weightCategory.create({ data: { divisionId, name: `${baseName} (Team)`, gender: 'Male', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'TEAM', poomsaeForms: forms, belt: 'Black' } })
            // Team Female
            await prisma.weightCategory.create({ data: { divisionId, name: `${baseName} (Team)`, gender: 'Female', minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'POOMSAE', subtype: 'TEAM', poomsaeForms: forms, belt: 'Black' } })
        }

        return order
    }


    // --- CREATE DIVISIONS AND ASSIGN CATEGORIES ---

    let order = 1

    // A. Supertoddler (0-5) - KYORUGI ONLY (No Poomsae per official guide)
    const divSuper = await prisma.division.create({
        data: { templateId: template.id, name: 'Supertoddler', minAge: 0, maxAge: 5, displayOrder: 1 }
    })
    for (const h of kyHeights) {
        await prisma.weightCategory.create({ data: { divisionId: divSuper.id, name: h.name, gender: 'Male', minHeight: h.min, maxHeight: h.max, minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
        await prisma.weightCategory.create({ data: { divisionId: divSuper.id, name: h.name, gender: 'Female', minHeight: h.min, maxHeight: h.max, minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
    }
    // NO Poomsae for Supertoddler

    // B. Toddler (0-8 for Poomsae, 6-8 for Kyorugi)
    // Per official Poomsae guide: "8 years and below"
    // Kyorugi height-based for ages 6-8.
    const divToddler = await prisma.division.create({
        data: { templateId: template.id, name: 'Toddler', minAge: 0, maxAge: 8, displayOrder: 6 }
    })
    for (const h of kyHeights) {
        await prisma.weightCategory.create({ data: { divisionId: divToddler.id, name: h.name, gender: 'Male', minHeight: h.min, maxHeight: h.max, minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
        await prisma.weightCategory.create({ data: { divisionId: divToddler.id, name: h.name, gender: 'Female', minHeight: h.min, maxHeight: h.max, minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
    }
    order = await createPoomsaeCategories(divToddler.id, 'Toddler', order)


    // C. Grade School (9-11)
    const divGS = await prisma.division.create({
        data: { templateId: template.id, name: 'Grade School', minAge: 9, maxAge: 11, displayOrder: 9 }
    })
    for (const h of kyHeights) {
        await prisma.weightCategory.create({ data: { divisionId: divGS.id, name: h.name, gender: 'Male', minHeight: h.min, maxHeight: h.max, minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
        await prisma.weightCategory.create({ data: { divisionId: divGS.id, name: h.name, gender: 'Female', minHeight: h.min, maxHeight: h.max, minWeight: 0, maxWeight: 0, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
    }
    order = await createPoomsaeCategories(divGS.id, 'Grade School', order)


    // D. Cadet (12-14)
    const divCadet = await prisma.division.create({
        data: { templateId: template.id, name: 'Cadet', minAge: 12, maxAge: 14, displayOrder: 12 }
    })
    for (const w of kyCadetM) await prisma.weightCategory.create({ data: { divisionId: divCadet.id, name: w.name, gender: 'Male', minWeight: w.min, maxWeight: w.max, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
    for (const w of kyCadetF) await prisma.weightCategory.create({ data: { divisionId: divCadet.id, name: w.name, gender: 'Female', minWeight: w.min, maxWeight: w.max, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
    order = await createPoomsaeCategories(divCadet.id, 'Cadet', order)


    // E. Junior (15-17)
    const divJunior = await prisma.division.create({
        data: { templateId: template.id, name: 'Junior', minAge: 15, maxAge: 17, displayOrder: 15 }
    })
    for (const w of kyJuniorM) await prisma.weightCategory.create({ data: { divisionId: divJunior.id, name: w.name, gender: 'Male', minWeight: w.min, maxWeight: w.max, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
    for (const w of kyJuniorF) await prisma.weightCategory.create({ data: { divisionId: divJunior.id, name: w.name, gender: 'Female', minWeight: w.min, maxWeight: w.max, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
    order = await createPoomsaeCategories(divJunior.id, 'Junior', order)


    // F. Senior (18-30) / Under 30
    const divSenior = await prisma.division.create({
        data: { templateId: template.id, name: 'Senior (Under 30)', minAge: 18, maxAge: 30, displayOrder: 18 }
    })
    for (const w of kySeniorM) await prisma.weightCategory.create({ data: { divisionId: divSenior.id, name: w.name, gender: 'Male', minWeight: w.min, maxWeight: w.max, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
    for (const w of kySeniorF) await prisma.weightCategory.create({ data: { divisionId: divSenior.id, name: w.name, gender: 'Female', minWeight: w.min, maxWeight: w.max, displayOrder: order++, type: 'KYORUGI', subtype: 'INDIVIDUAL', belt: null } })
    order = await createPoomsaeCategories(divSenior.id, 'Senior (Under 30)', order)


    console.log('Unified Seeding completed!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
