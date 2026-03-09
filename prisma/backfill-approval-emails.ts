/**
 * Backfill script: Send approval emails with QR codes to all existing approved
 * tournament players and seminar registrations.
 *
 * Groups multiple registrations per email into a single email (e.g. kyorugi + poomsae).
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

async function sendEmailHtml(to: string, subject: string, reactElement: React.ReactElement) {
    const html = await render(reactElement)
    return resend.emails.send({
        from: 'World Olympics Taekwondo Federation Philippines <noreply@wotf-ph.com>',
        to: [to],
        subject,
        html,
    })
}

interface PlayerGroup {
    email: string
    athleteName: string
    eventName: string
    registrations: {
        id: string
        categoryName?: string
        eventType: 'Tournament' | 'Seminar'
    }[]
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

    // Group by email + tournament
    const groupMap = new Map<string, PlayerGroup>()
    for (const player of players) {
        const email = player.user?.email
        if (!email) continue
        const eventName = player.category?.tournament?.name || 'Tournament'
        const key = `${email}::${eventName}`

        if (!groupMap.has(key)) {
            groupMap.set(key, {
                email,
                athleteName: player.name,
                eventName,
                registrations: []
            })
        }
        groupMap.get(key)!.registrations.push({
            id: player.id,
            categoryName: player.category?.name,
            eventType: 'Tournament'
        })
    }

    const groups = Array.from(groupMap.values())
    const totalRegs = players.length
    console.log(`📋 Found ${totalRegs} approved tournament registrations → ${groups.length} unique emails`)

    let sent = 0
    let failed = 0

    for (const group of groups) {
        const regCount = group.registrations.length

        if (DRY_RUN) {
            const categories = group.registrations.map(r => r.categoryName || 'N/A').join(', ')
            console.log(`  [DRY] ${group.email} — ${group.athleteName} (${group.eventName}) [${regCount} reg${regCount > 1 ? 's' : ''}: ${categories}]`)
            sent++
            continue
        }

        try {
            // Generate QR codes for all registrations
            const regs = await Promise.all(group.registrations.map(async (r) => ({
                registrationId: r.id,
                categoryName: r.categoryName,
                eventType: r.eventType as 'Tournament' | 'Seminar',
                qrCodeDataUrl: await QRCode.toDataURL(r.id, {
                    width: 200, margin: 2,
                    color: { dark: '#1e1b4b', light: '#ffffff' }
                })
            })))

            await sendEmailHtml(
                group.email,
                `Registration Approved — ${group.eventName}${regCount > 1 ? ` (${regCount} categories)` : ''}`,
                RegistrationApprovedEmail({
                    athleteName: group.athleteName,
                    eventName: group.eventName,
                    registrations: regs,
                }) as React.ReactElement
            )

            sent++
            console.log(`  ✅ [${sent}/${groups.length}] ${group.athleteName} → ${group.email} (${regCount} QR${regCount > 1 ? 's' : ''})`)
            await sleep(500)
        } catch (err: any) {
            failed++
            console.error(`  ❌ Failed: ${group.athleteName} (${group.email}): ${err.message}`)
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

    // Filter to real emails
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
            console.log(`  [DRY] ${reg.userEmail} — ${reg.playerName} (${eventName})`)
            seminarSent++
            continue
        }

        try {
            const qrCodeDataUrl = await QRCode.toDataURL(reg.id, {
                width: 200, margin: 2,
                color: { dark: '#1e1b4b', light: '#ffffff' }
            })

            await sendEmailHtml(
                reg.userEmail,
                `Registration Approved — ${eventName}`,
                RegistrationApprovedEmail({
                    athleteName: reg.playerName,
                    eventName,
                    eventType: 'Seminar',
                    registrationId: reg.id,
                    qrCodeDataUrl,
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
    console.log(`  Tournament: ${sent} emails (from ${totalRegs} registrations), ${failed} failed`)
    console.log(`  Seminars:   ${seminarSent} emails, ${seminarFailed} failed`)
    console.log(`  Total:      ${sent + seminarSent} emails ${DRY_RUN ? '(would be)' : ''} sent`)
    console.log(`${'='.repeat(60)}\n`)

    await prisma.$disconnect()
}

main().catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})
