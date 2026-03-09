/**
 * Backfill script: Send approval emails with QR codes to all existing approved
 * tournament players and seminar registrations.
 *
 * Usage:
 *   npx tsx prisma/backfill-approval-emails.ts              # Full run
 *   npx tsx prisma/backfill-approval-emails.ts --dry-run    # Preview only
 */

import { PrismaClient } from '@prisma/client'
import QRCode from 'qrcode'
import { Resend } from 'resend'
import React from 'react'
import { render } from '@react-email/render'
import RegistrationApprovedEmail from '../emails/RegistrationApprovedEmail'

const prisma = new PrismaClient()
const resend = new Resend(process.env.RESEND_API_KEY)
const DRY_RUN = process.argv.includes('--dry-run')

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function sendEmail(to: string, subject: string, reactElement: React.ReactElement) {
    const html = await render(reactElement)
    return resend.emails.send({
        from: 'World Olympics Taekwondo Federation Philippines <noreply@wotf-ph.com>',
        to: [to],
        subject,
        html,
    })
}

async function main() {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`  📧 Backfill Approval Emails`)
    console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (no emails sent)' : '🚀 LIVE (sending emails)'}`)
    console.log(`${'='.repeat(60)}\n`)

    // ── Tournament Players ──
    const players = await prisma.player.findMany({
        where: {
            registrationStatus: 'APPROVED',
            user: {
                email: { not: { contains: '@member.ktm' } }
            }
        },
        include: {
            category: { include: { tournament: { select: { name: true } } } },
            user: { select: { email: true } }
        }
    })

    console.log(`📋 Found ${players.length} approved tournament players with real emails`)

    let tournamentSent = 0
    let tournamentSkipped = 0
    let tournamentFailed = 0

    for (const player of players) {
        const email = player.user?.email
        if (!email) { tournamentSkipped++; continue }

        const eventName = player.category?.tournament?.name || 'Tournament'

        if (DRY_RUN) {
            console.log(`  [DRY] Would send to ${email} — ${player.name} (${eventName})`)
            tournamentSent++
            continue
        }

        try {
            const qrCodeDataUrl = await QRCode.toDataURL(player.id, {
                width: 200, margin: 2,
                color: { dark: '#1e1b4b', light: '#ffffff' }
            })

            await sendEmail(
                email,
                `Registration Approved — ${eventName}`,
                RegistrationApprovedEmail({
                    athleteName: player.name,
                    eventName,
                    eventType: 'Tournament',
                    categoryName: player.category?.name,
                    registrationId: player.id,
                    qrCodeDataUrl
                }) as React.ReactElement
            )

            tournamentSent++
            console.log(`  ✅ [${tournamentSent}/${players.length}] ${player.name} → ${email}`)

            // Rate limit: 2 emails/sec
            await sleep(500)
        } catch (err: any) {
            tournamentFailed++
            console.error(`  ❌ Failed: ${player.name} (${email}): ${err.message}`)
        }
    }

    // ── Seminar Registrations ──
    const seminars = await prisma.seminarRegistration.findMany({
        where: {
            status: 'APPROVED',
            playerId: { not: null }
        },
        include: {
            seminar: { select: { name: true } }
        }
    })

    // Filter to real emails only
    const seminarWithEmails: Array<typeof seminars[number] & { userEmail: string }> = []
    for (const reg of seminars) {
        if (!reg.playerId) continue
        const user = await prisma.user.findUnique({
            where: { id: reg.playerId },
            select: { email: true }
        })
        if (user?.email && !user.email.includes('@member.ktm')) {
            seminarWithEmails.push({ ...reg, userEmail: user.email })
        }
    }

    console.log(`\n📋 Found ${seminarWithEmails.length} approved seminar registrations with real emails`)

    let seminarSent = 0
    let seminarFailed = 0

    for (const reg of seminarWithEmails) {
        const eventName = reg.seminar?.name || 'Seminar'

        if (DRY_RUN) {
            console.log(`  [DRY] Would send to ${reg.userEmail} — ${reg.playerName} (${eventName})`)
            seminarSent++
            continue
        }

        try {
            const qrCodeDataUrl = await QRCode.toDataURL(reg.id, {
                width: 200, margin: 2,
                color: { dark: '#1e1b4b', light: '#ffffff' }
            })

            await sendEmail(
                reg.userEmail,
                `Registration Approved — ${eventName}`,
                RegistrationApprovedEmail({
                    athleteName: reg.playerName,
                    eventName,
                    eventType: 'Seminar',
                    registrationId: reg.id,
                    qrCodeDataUrl
                }) as React.ReactElement
            )

            seminarSent++
            console.log(`  ✅ [${seminarSent}/${seminarWithEmails.length}] ${reg.playerName} → ${reg.userEmail}`)
            await sleep(500)
        } catch (err: any) {
            seminarFailed++
            console.error(`  ❌ Failed: ${reg.playerName} (${reg.userEmail}): ${err.message}`)
        }
    }

    // ── Summary ──
    console.log(`\n${'='.repeat(60)}`)
    console.log(`  📊 Summary`)
    console.log(`${'='.repeat(60)}`)
    console.log(`  Tournaments: ${tournamentSent} sent, ${tournamentSkipped} skipped, ${tournamentFailed} failed`)
    console.log(`  Seminars:    ${seminarSent} sent, ${seminarFailed} failed`)
    console.log(`  Total:       ${tournamentSent + seminarSent} emails ${DRY_RUN ? '(would be)' : ''} sent`)
    console.log(`${'='.repeat(60)}\n`)

    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})
