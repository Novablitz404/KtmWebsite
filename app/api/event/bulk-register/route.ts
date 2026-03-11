import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findCategoryForPlayer } from '@/lib/placement'
import { deriveSkillLevel } from '@/lib/skill-logic'

/**
 * POST /api/event/bulk-register
 * 
 * Bulk registration for clubs at event landing pages.
 * Creates a BulkRegistration parent + individual Player + GuestRegistration for each athlete.
 * Returns total amount for a single Xendit payment.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            tournamentId,
            clubId,       // existing club ID (nullable)
            clubName,     // club name (always required)
            managerEmail,
            managerName,
            athletes,     // array of athlete objects
            promoCode,    // optional promo code (applies to all athletes)
        } = body

        if (!tournamentId || !clubName || !managerEmail || !managerName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (!athletes || !Array.isArray(athletes) || athletes.length === 0) {
            return NextResponse.json({ error: 'At least one athlete is required' }, { status: 400 })
        }

        // 1. Verify tournament
        const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
        }

        // 1b. Check club affiliation
        const resolvedClubId = clubId || (await prisma.club.findFirst({ where: { name: clubName } }))?.id
        if (resolvedClubId) {
            const { checkClubAffiliation } = await import('@/lib/affiliation')
            const affiliationCheck = await checkClubAffiliation(resolvedClubId)
            if (!affiliationCheck.isActive) {
                return NextResponse.json({ error: affiliationCheck.message }, { status: 403 })
            }
        }

        // 2. Determine base price
        let basePrice = tournament.regularPrice || 0
        const now = new Date()
        if (tournament.earlyBirdDeadline && now < tournament.earlyBirdDeadline && tournament.earlyBirdPrice) {
            basePrice = tournament.earlyBirdPrice
        }

        // 3. Validate promo code if provided
        let promoCodeRecord = null
        if (promoCode) {
            promoCodeRecord = await prisma.promoCode.findUnique({
                where: { tournamentId_code: { tournamentId, code: promoCode.toUpperCase().trim() } }
            })
            if (!promoCodeRecord || !promoCodeRecord.isActive) {
                return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 })
            }
            if (now < promoCodeRecord.validFrom || now > promoCodeRecord.validUntil) {
                return NextResponse.json({ error: 'Promo code has expired' }, { status: 400 })
            }
            if (promoCodeRecord.maxUses && promoCodeRecord.currentUses + athletes.length > promoCodeRecord.maxUses) {
                return NextResponse.json({ error: 'Promo code does not have enough uses remaining' }, { status: 400 })
            }
        }

        // 4. Helper: generate unique 9-digit player ID
        const usedIds = new Set<string>()
        const generatePlayerId = async (): Promise<string> => {
            let attempts = 0
            while (attempts < 100) {
                const randomNum = Math.floor(Math.random() * 1000000000)
                const id = randomNum.toString().padStart(9, '0')
                if (usedIds.has(id)) { attempts++; continue }
                const exists = await prisma.player.findUnique({ where: { id } })
                if (!exists) { usedIds.add(id); return id }
                attempts++
            }
            throw new Error('Could not generate unique player ID')
        }

        // 5. Generate registration codes
        const generateRegistrationCode = (): string => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
            let code = 'EVT-'
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            return code
        }

        // 6. Process all athletes in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create BulkRegistration parent
            const bulk = await tx.bulkRegistration.create({
                data: {
                    tournamentId,
                    clubId: clubId || null,
                    clubName,
                    managerEmail: managerEmail.toLowerCase().trim(),
                    managerName,
                    totalAthletes: athletes.length,
                    totalAmount: 0, // Will be calculated below
                    paymentStatus: 'UNPAID',
                }
            })

            let totalAmount = 0
            const registrations = []

            for (const athlete of athletes) {
                const { email, fullName, birthday, beltRank, weightKg, heightCm, gender, country, eventType, poomsaeSubtype } = athlete

                if (!email || !fullName || !birthday || !beltRank || !weightKg || !heightCm || !gender || !country) {
                    throw new Error(`Missing required fields for athlete: ${fullName || 'Unknown'}`)
                }

                // Auto-detect category
                const category = await findCategoryForPlayer(tournamentId, {
                    birthDate: new Date(birthday),
                    gender,
                    weight: parseFloat(weightKg),
                    height: parseFloat(heightCm),
                    belt: beltRank,
                    type: eventType || 'KYORUGI',
                    poomsaeType: poomsaeSubtype,
                })

                if (!category) {
                    throw new Error(`No matching category found for athlete: ${fullName}`)
                }

                // Calculate price per athlete
                let athletePrice = basePrice
                let discountApplied = 0
                if (promoCodeRecord) {
                    if (promoCodeRecord.discountType === 'PERCENTAGE') {
                        discountApplied = athletePrice * (promoCodeRecord.discountValue / 100)
                    } else {
                        discountApplied = promoCodeRecord.discountValue
                    }
                    athletePrice = Math.max(0, athletePrice - discountApplied)
                }
                totalAmount += athletePrice

                const playerId = await generatePlayerId()
                let registrationCode = generateRegistrationCode()

                // Create Player
                await tx.player.create({
                    data: {
                        id: playerId,
                        name: fullName,
                        gender,
                        belt: beltRank,
                        weight: parseFloat(weightKg),
                        height: parseFloat(heightCm),
                        categoryId: category.id,
                        userId: null,
                        clubId: clubId || null,
                        registrationStatus: 'PENDING',
                        skillLevel: deriveSkillLevel(beltRank),
                        poomsaeType: poomsaeSubtype || 'INDIVIDUAL',
                    }
                })

                // Create GuestRegistration
                const guestReg = await tx.guestRegistration.create({
                    data: {
                        registrationCode,
                        tournamentId,
                        playerId,
                        email: email.toLowerCase().trim(),
                        fullName,
                        birthday: new Date(birthday),
                        beltRank,
                        weightKg: parseFloat(weightKg),
                        heightCm: parseFloat(heightCm),
                        gender,
                        country,
                        clubId: clubId || null,
                        clubNameOther: null,
                        isIndependent: false,
                        waiverAccepted: true,
                        waiverAcceptedAt: new Date(),
                        promoCodeId: promoCodeRecord?.id || null,
                        discountApplied: discountApplied > 0 ? discountApplied : null,
                        bulkRegistrationId: bulk.id,
                    }
                })

                registrations.push({
                    registrationCode,
                    playerId,
                    fullName,
                    category: category.name,
                    price: athletePrice,
                })
            }

            // Update total amount on bulk registration
            await tx.bulkRegistration.update({
                where: { id: bulk.id },
                data: { totalAmount }
            })

            // Increment promo code usage
            if (promoCodeRecord) {
                await tx.promoCode.update({
                    where: { id: promoCodeRecord.id },
                    data: { currentUses: { increment: athletes.length } }
                })
            }

            return { bulkId: bulk.id, totalAmount, registrations }
        })

        return NextResponse.json({
            success: true,
            bulkRegistrationId: result.bulkId,
            totalAmount: result.totalAmount,
            totalAthletes: result.registrations.length,
            registrations: result.registrations,
        })
    } catch (error: any) {
        console.error('Bulk registration error:', error)
        return NextResponse.json({
            error: error.message || 'Internal server error'
        }, { status: 500 })
    }
}
