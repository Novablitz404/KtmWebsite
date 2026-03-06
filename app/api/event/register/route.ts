import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { findCategoryForPlayer } from '@/lib/placement'
import { deriveSkillLevel } from '@/lib/skill-logic'

/**
 * POST /api/event/register
 * 
 * Guest registration for event landing pages.
 * Creates a Player record (userId: null) and a GuestRegistration record.
 * Does NOT require authentication.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            tournamentId,
            email,
            fullName,
            birthday,
            beltRank,
            weightKg,
            heightCm,
            gender,
            country,
            clubId,        // existing club ID (nullable)
            clubNameOther, // free-text club name (nullable)
            isIndependent, // boolean
            eventType,     // "KYORUGI" | "POOMSAE" | "KYUKPA"
            poomsaeSubtype, // "INDIVIDUAL" | "PAIR" | "TEAM" (only for POOMSAE)
            waiverAccepted,
            promoCode,     // optional promo code string
        } = body

        // Validate required fields
        if (!tournamentId || !email || !fullName || !birthday || !beltRank || !weightKg || !heightCm || !gender || !country) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        if (!waiverAccepted) {
            return NextResponse.json({ error: 'Waiver must be accepted' }, { status: 400 })
        }

        // 1. Verify tournament exists
        const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } })
        if (!tournament) {
            return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
        }

        // 1b. Check club affiliation (if registering under a club)
        if (clubId) {
            const { checkClubAffiliation } = await import('@/lib/affiliation')
            const affiliationCheck = await checkClubAffiliation(clubId)
            if (!affiliationCheck.isActive) {
                return NextResponse.json({ error: affiliationCheck.message }, { status: 403 })
            }
        }

        // 2. Check for duplicate email registration
        const existingGuest = await prisma.guestRegistration.findFirst({
            where: { tournamentId, email: email.toLowerCase().trim() }
        })
        if (existingGuest) {
            return NextResponse.json({ error: 'This email is already registered for this event' }, { status: 409 })
        }

        // 3. Auto-detect category
        const birthDate = new Date(birthday)
        const category = await findCategoryForPlayer(tournamentId, {
            birthDate,
            gender,
            weight: parseFloat(weightKg),
            height: parseFloat(heightCm),
            belt: beltRank,
            type: eventType || 'KYORUGI',
            poomsaeType: poomsaeSubtype,
        })

        if (!category) {
            return NextResponse.json({
                error: 'No matching category found for your profile. Please contact the event organizer.'
            }, { status: 400 })
        }

        // 4. Calculate pricing
        let price = tournament.regularPrice || 0
        const now = new Date()
        if (tournament.earlyBirdDeadline && now < tournament.earlyBirdDeadline && tournament.earlyBirdPrice) {
            price = tournament.earlyBirdPrice
        }

        // 5. Validate & apply promo code
        let promoCodeRecord = null
        let discountApplied = 0
        if (promoCode) {
            promoCodeRecord = await prisma.promoCode.findUnique({
                where: { tournamentId_code: { tournamentId, code: promoCode.toUpperCase().trim() } }
            })

            if (!promoCodeRecord) {
                return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 })
            }
            if (!promoCodeRecord.isActive) {
                return NextResponse.json({ error: 'This promo code is no longer active' }, { status: 400 })
            }
            if (now < promoCodeRecord.validFrom || now > promoCodeRecord.validUntil) {
                return NextResponse.json({ error: 'This promo code has expired' }, { status: 400 })
            }
            if (promoCodeRecord.maxUses && promoCodeRecord.currentUses >= promoCodeRecord.maxUses) {
                return NextResponse.json({ error: 'This promo code has reached its usage limit' }, { status: 400 })
            }

            // Calculate discount
            if (promoCodeRecord.discountType === 'PERCENTAGE') {
                discountApplied = price * (promoCodeRecord.discountValue / 100)
            } else {
                discountApplied = promoCodeRecord.discountValue
            }
            price = Math.max(0, price - discountApplied)
        }

        // 6. Generate unique 5-digit player ID
        const generatePlayerId = async (): Promise<string> => {
            let attempts = 0
            while (attempts < 100) {
                const randomNum = Math.floor(Math.random() * 100000)
                const id = randomNum.toString().padStart(5, '0')
                const exists = await prisma.player.findUnique({ where: { id } })
                if (!exists) return id
                attempts++
            }
            throw new Error('Could not generate unique player ID')
        }

        // 7. Generate registration code
        const generateRegistrationCode = (): string => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I, O, 0, 1 to avoid confusion
            let code = 'EVT-'
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            return code
        }

        // 8. Resolve club
        let resolvedClubId = clubId || null
        let clubName = ''
        if (clubId) {
            const club = await prisma.club.findUnique({ where: { id: clubId } })
            clubName = club?.name || ''
        } else if (clubNameOther) {
            clubName = clubNameOther
        } else if (isIndependent) {
            clubName = 'Independent'
        }

        // 9. Create Player + GuestRegistration in a transaction
        const playerId = await generatePlayerId()
        let registrationCode = generateRegistrationCode()

        // Ensure registration code is unique
        let codeExists = await prisma.guestRegistration.findUnique({ where: { registrationCode } })
        while (codeExists) {
            registrationCode = generateRegistrationCode()
            codeExists = await prisma.guestRegistration.findUnique({ where: { registrationCode } })
        }

        const result = await prisma.$transaction(async (tx) => {
            // Create Player
            const player = await tx.player.create({
                data: {
                    id: playerId,
                    name: fullName,
                    gender,
                    belt: beltRank,
                    weight: parseFloat(weightKg),
                    height: parseFloat(heightCm),
                    categoryId: category.id,
                    userId: null,
                    clubId: resolvedClubId,
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
                    playerId: player.id,
                    email: email.toLowerCase().trim(),
                    fullName,
                    birthday: birthDate,
                    beltRank,
                    weightKg: parseFloat(weightKg),
                    heightCm: parseFloat(heightCm),
                    gender,
                    country,
                    clubId: resolvedClubId,
                    clubNameOther: clubNameOther || null,
                    isIndependent: isIndependent || false,
                    waiverAccepted: true,
                    waiverAcceptedAt: new Date(),
                    promoCodeId: promoCodeRecord?.id || null,
                    discountApplied: discountApplied > 0 ? discountApplied : null,
                }
            })

            // Increment promo code usage
            if (promoCodeRecord) {
                await tx.promoCode.update({
                    where: { id: promoCodeRecord.id },
                    data: { currentUses: { increment: 1 } }
                })
            }

            return { player, guestReg }
        })

        return NextResponse.json({
            success: true,
            registrationCode,
            playerId: result.player.id,
            categoryName: category.name,
            finalPrice: price,
            discountApplied,
        })
    } catch (error) {
        console.error('Guest registration error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
