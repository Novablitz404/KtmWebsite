import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // ==========================================
    // 1. CREATE TAP ELITE GUIDELINE TEMPLATE
    // ==========================================
    const tapElite = await prisma.guidelineTemplate.create({
        data: {
            name: 'Tap Elite 2026',
            pdfUrl: null // Can add PDF path later
        }
    })
    console.log('✅ Created guideline template: Tap Elite 2026')

    // ==========================================
    // 2. CREATE DIVISIONS (Age-based)
    // ==========================================
    const divisions = [
        { name: 'Supertoddler', minAge: 0, maxAge: 5, displayOrder: 1 },
        { name: 'Toddler', minAge: 6, maxAge: 8, displayOrder: 2 },
        { name: 'Grade School', minAge: 9, maxAge: 11, displayOrder: 3 },
        { name: 'Cadet', minAge: 12, maxAge: 14, displayOrder: 4 },
        { name: 'Junior', minAge: 15, maxAge: 17, displayOrder: 5 },
        { name: 'Senior', minAge: 18, maxAge: 30, displayOrder: 6 }
    ]

    const createdDivisions: Record<string, string> = {}

    for (const div of divisions) {
        const created = await prisma.division.create({
            data: {
                name: div.name,
                minAge: div.minAge,
                maxAge: div.maxAge,
                displayOrder: div.displayOrder,
                templateId: tapElite.id
            }
        })
        createdDivisions[div.name] = created.id
        console.log(`✅ Created division: ${div.name} (${div.minAge}-${div.maxAge} years)`)
    }

    // ==========================================
    // 3. CREATE WEIGHT CATEGORIES
    // ==========================================

    // Toddler & Grade School - Height-based (using weight field for cm)
    const toddlerGradeSchoolCategories = [
        { name: 'Under 112', minWeight: 0, maxWeight: 112 },
        { name: 'Under 120', minWeight: 112, maxWeight: 120 },
        { name: 'Under 128', minWeight: 120, maxWeight: 128 },
        { name: 'Under 136', minWeight: 128, maxWeight: 136 },
        { name: 'Under 144', minWeight: 136, maxWeight: 144 },
        { name: 'Under 152', minWeight: 144, maxWeight: 152 },
        { name: 'Under 160', minWeight: 152, maxWeight: 160 },
        { name: 'Under 168', minWeight: 160, maxWeight: 168 },
        { name: 'Over 168', minWeight: 168, maxWeight: 999 }
    ]

    for (const cat of toddlerGradeSchoolCategories) {
        await prisma.weightCategory.create({
            data: {
                name: cat.name,
                gender: 'Both',
                minWeight: cat.minWeight,
                maxWeight: cat.maxWeight,
                divisionId: createdDivisions['Toddler']
            }
        })
        await prisma.weightCategory.create({
            data: {
                name: cat.name,
                gender: 'Both',
                minWeight: cat.minWeight,
                maxWeight: cat.maxWeight,
                divisionId: createdDivisions['Grade School']
            }
        })
    }
    console.log('✅ Created weight categories for Toddler & Grade School')

    // Cadet Division
    const cadetMale = [
        { name: 'FIN', minWeight: 0, maxWeight: 33 },
        { name: 'FLY', minWeight: 33, maxWeight: 37 },
        { name: 'BANTAM', minWeight: 37, maxWeight: 41 },
        { name: 'FEATHER', minWeight: 41, maxWeight: 45 },
        { name: 'LIGHT', minWeight: 45, maxWeight: 49 },
        { name: 'WELTER', minWeight: 49, maxWeight: 53 },
        { name: 'LT. MIDDLE', minWeight: 53, maxWeight: 57 },
        { name: 'MIDDLE', minWeight: 57, maxWeight: 61 },
        { name: 'LT. HEAVY', minWeight: 61, maxWeight: 65 },
        { name: 'HEAVY', minWeight: 65, maxWeight: 999 }
    ]
    const cadetFemale = [
        { name: 'FIN', minWeight: 0, maxWeight: 29 },
        { name: 'FLY', minWeight: 29, maxWeight: 33 },
        { name: 'BANTAM', minWeight: 33, maxWeight: 37 },
        { name: 'FEATHER', minWeight: 37, maxWeight: 41 },
        { name: 'LIGHT', minWeight: 41, maxWeight: 44 },
        { name: 'WELTER', minWeight: 44, maxWeight: 47 },
        { name: 'LT. MIDDLE', minWeight: 47, maxWeight: 51 },
        { name: 'MIDDLE', minWeight: 51, maxWeight: 55 },
        { name: 'LT. HEAVY', minWeight: 55, maxWeight: 59 },
        { name: 'HEAVY', minWeight: 59, maxWeight: 999 }
    ]

    for (const cat of cadetMale) {
        await prisma.weightCategory.create({
            data: { ...cat, gender: 'Male', divisionId: createdDivisions['Cadet'] }
        })
    }
    for (const cat of cadetFemale) {
        await prisma.weightCategory.create({
            data: { ...cat, gender: 'Female', divisionId: createdDivisions['Cadet'] }
        })
    }
    console.log('✅ Created weight categories for Cadet')

    // Junior Division
    const juniorMale = [
        { name: 'Under 45 kg', minWeight: 0, maxWeight: 45 },
        { name: 'Under 48 kg', minWeight: 45, maxWeight: 48 },
        { name: 'Under 51 kg', minWeight: 48, maxWeight: 51 },
        { name: 'Under 55 kg', minWeight: 51, maxWeight: 55 },
        { name: 'Under 59 kg', minWeight: 55, maxWeight: 59 },
        { name: 'Under 63 kg', minWeight: 59, maxWeight: 63 },
        { name: 'Under 68 kg', minWeight: 63, maxWeight: 68 },
        { name: 'Under 73 kg', minWeight: 68, maxWeight: 73 },
        { name: 'Under 78 kg', minWeight: 73, maxWeight: 78 },
        { name: 'Over 78 kg', minWeight: 78, maxWeight: 999 }
    ]
    const juniorFemale = [
        { name: 'Under 42 kg', minWeight: 0, maxWeight: 42 },
        { name: 'Under 44 kg', minWeight: 42, maxWeight: 44 },
        { name: 'Under 46 kg', minWeight: 44, maxWeight: 46 },
        { name: 'Under 49 kg', minWeight: 46, maxWeight: 49 },
        { name: 'Under 52 kg', minWeight: 49, maxWeight: 52 },
        { name: 'Under 55 kg', minWeight: 52, maxWeight: 55 },
        { name: 'Under 59 kg', minWeight: 55, maxWeight: 59 },
        { name: 'Under 63 kg', minWeight: 59, maxWeight: 63 },
        { name: 'Under 68 kg', minWeight: 63, maxWeight: 68 },
        { name: 'Over 68 kg', minWeight: 68, maxWeight: 999 }
    ]

    for (const cat of juniorMale) {
        await prisma.weightCategory.create({
            data: { ...cat, gender: 'Male', divisionId: createdDivisions['Junior'] }
        })
    }
    for (const cat of juniorFemale) {
        await prisma.weightCategory.create({
            data: { ...cat, gender: 'Female', divisionId: createdDivisions['Junior'] }
        })
    }
    console.log('✅ Created weight categories for Junior')

    // Senior Division
    const seniorMale = [
        { name: 'Under 54 kg', minWeight: 0, maxWeight: 54 },
        { name: 'Under 58 kg', minWeight: 54, maxWeight: 58 },
        { name: 'Under 63 kg', minWeight: 58, maxWeight: 63 },
        { name: 'Under 68 kg', minWeight: 63, maxWeight: 68 },
        { name: 'Under 74 kg', minWeight: 68, maxWeight: 74 },
        { name: 'Under 80 kg', minWeight: 74, maxWeight: 80 },
        { name: 'Under 87 kg', minWeight: 80, maxWeight: 87 },
        { name: 'Over 87 kg', minWeight: 87, maxWeight: 999 }
    ]
    const seniorFemale = [
        { name: 'Under 46 kg', minWeight: 0, maxWeight: 46 },
        { name: 'Under 49 kg', minWeight: 46, maxWeight: 49 },
        { name: 'Under 53 kg', minWeight: 49, maxWeight: 53 },
        { name: 'Under 57 kg', minWeight: 53, maxWeight: 57 },
        { name: 'Under 62 kg', minWeight: 57, maxWeight: 62 },
        { name: 'Under 67 kg', minWeight: 62, maxWeight: 67 },
        { name: 'Under 73 kg', minWeight: 67, maxWeight: 73 },
        { name: 'Over 73 kg', minWeight: 73, maxWeight: 999 }
    ]

    for (const cat of seniorMale) {
        await prisma.weightCategory.create({
            data: { ...cat, gender: 'Male', divisionId: createdDivisions['Senior'] }
        })
    }
    for (const cat of seniorFemale) {
        await prisma.weightCategory.create({
            data: { ...cat, gender: 'Female', divisionId: createdDivisions['Senior'] }
        })
    }
    console.log('✅ Created weight categories for Senior')

    // ==========================================
    // 4. CREATE SAMPLE TOURNAMENT
    // ==========================================
    /*
    const tournament = await prisma.tournament.create({
        data: {
            name: 'Metro Manila Open 2026',
            startDate: new Date('2026-01-15'),
            registrationStart: new Date('2025-12-01'),
            registrationEnd: new Date('2026-01-10')
            // No guidelineTemplateId - organizer must select one
        }
    })
    console.log(`✅ Created tournament: ${tournament.name}`)
    */

    // No default categories - created when template is selected

    console.log(`\n🎉 Seeding complete!`)
    console.log(`   Guideline Template: ${tapElite.name}`)
    console.log(`   Divisions: ${divisions.length}`)
    // console.log(`   Tournament: ${tournament.name}`)
}

main()
    .catch(e => {
        console.error('❌ Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
