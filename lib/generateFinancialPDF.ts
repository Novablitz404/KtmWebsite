'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Types ───────────────────────────────────────────────────────
interface OrgInfo {
    name: string
    logoUrl: string | null
    address: string | null
    contactPhone: string | null
    contactEmail: string | null
    chairman: string | null
}

interface FinancialSummary {
    totalRevenue: number
    totalCollected: number
    totalNetRevenue: number
    totalDeductions: number
    aggregatedDeductions: Record<string, number>
    totalPending: number
    totalRegistrations: number
    affiliationRevenue: number
    collectionRate: number
    freeEventsCount: number
}

interface EventItem {
    id: string
    type: string
    name: string
    date: string
    totalRegistrations: number
    paidCount: number
    unpaidCount: number
    totalCollected: number
    totalExpected: number
    netRevenue: number
    deductions: Record<string, number>
    registrations: { id: string; playerName: string; clubName: string; status: string; amountExpected: number; amountPaid: number; deduction?: number; net?: number }[]
}

interface MonthlyData {
    month: string
    tournaments: number
    promotions: number
    seminars: number
    affiliations: number
}

interface RevenueByType {
    tournaments: number
    promotions: number
    seminars: number
    affiliations: number
}

interface YoYData {
    thisYear: number
    lastYear: number
    changePercent: number
    currentYear: number
}

interface FinancialReportData {
    organization: OrgInfo
    summary: FinancialSummary
    events: EventItem[]
    monthlyData: MonthlyData[]
    revenueByType: RevenueByType
    yoy: YoYData
}

// ─── Helpers ─────────────────────────────────────────────────────
function fmt(amount: number): string {
    return 'PHP ' + amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
    try {
        const res = await fetch(url)
        const blob = await res.blob()
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(blob)
        })
    } catch {
        return null
    }
}

// ─── Colors ──────────────────────────────────────────────────────
const COLORS = {
    primary: [30, 41, 59] as [number, number, number],       // slate-800
    secondary: [71, 85, 105] as [number, number, number],    // slate-500
    accent: [16, 185, 129] as [number, number, number],      // emerald-500
    warning: [245, 158, 11] as [number, number, number],     // amber-500
    danger: [239, 68, 68] as [number, number, number],       // red-500
    light: [241, 245, 249] as [number, number, number],      // slate-100
    white: [255, 255, 255] as [number, number, number],
    border: [226, 232, 240] as [number, number, number],     // slate-200
    text: [15, 23, 42] as [number, number, number],          // slate-900
    muted: [148, 163, 184] as [number, number, number],      // slate-400
}

// ─── Main Export ─────────────────────────────────────────────────
export async function generateFinancialPDF(data: FinancialReportData, primaryColor?: string) {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 15
    const contentW = pageW - margin * 2
    let y = margin

    // ── Load logo ────────────────────────────────────────────────
    let logoDataUrl: string | null = null
    if (data.organization.logoUrl) {
        logoDataUrl = await loadImageAsDataUrl(data.organization.logoUrl)
    }

    // ══════════════════════════════════════════════════════════════
    // HEADER
    // ══════════════════════════════════════════════════════════════
    function drawHeader() {
        // Header background
        doc.setFillColor(...COLORS.primary)
        doc.rect(0, 0, pageW, 42, 'F')

        // Accent line
        doc.setFillColor(...COLORS.accent)
        doc.rect(0, 42, pageW, 1.5, 'F')

        let headerLeft = margin

        // Logo
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', margin, 6, 30, 30)
                headerLeft = margin + 34
            } catch {
                // Logo failed, skip it
            }
        }

        // Org name
        doc.setFont('helvetica', 'bold')
        const titleAreaWidth = 50 // Reserve space for right-aligned title/dates
        const availableNameWidth = (pageW - margin - titleAreaWidth) - headerLeft

        let orgFontSize = 18
        doc.setFontSize(orgFontSize)

        // If name is very long, shrink font slightly
        if (doc.getTextWidth(data.organization.name) > availableNameWidth) {
            orgFontSize = 15
            doc.setFontSize(orgFontSize)
        }

        const splitOrgName = doc.splitTextToSize(data.organization.name, availableNameWidth)
        doc.setTextColor(...COLORS.white)
        doc.text(splitOrgName, headerLeft, 17)

        // Adjust Y for contact details if name wraps
        const nameLines = Array.isArray(splitOrgName) ? splitOrgName.length : 1
        const contactYOffset = (nameLines - 1) * (orgFontSize * 0.35) // Rough estimate for line height impact

        // Contact details
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(200, 210, 220)
        const contactParts: string[] = []
        if (data.organization.address) contactParts.push(data.organization.address)
        if (data.organization.contactPhone) contactParts.push('Tel: ' + data.organization.contactPhone)
        if (data.organization.contactEmail) contactParts.push(data.organization.contactEmail)

        if (contactParts.length > 0) {
            // Split into 2 lines if needed
            const line1 = contactParts.slice(0, 2).join('  •  ')
            doc.text(line1, headerLeft, 25 + contactYOffset)
            if (contactParts.length > 2) {
                doc.text(contactParts.slice(2).join('  •  '), headerLeft, 30 + contactYOffset)
            }
        }

        if (data.organization.chairman) {
            doc.setFontSize(7)
            doc.setTextColor(160, 170, 180)
            doc.text('Chairman: ' + data.organization.chairman, headerLeft, 37 + contactYOffset)
        }

        // Report title - right aligned
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...COLORS.white)
        doc.text('FINANCIAL REPORT', pageW - margin, 15, { align: 'right' })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(200, 210, 220)
        doc.text('Generated: ' + new Date().toLocaleDateString('en-US', {
            month: 'long', day: 'numeric', year: 'numeric'
        }), pageW - margin, 21, { align: 'right' })

        doc.setFontSize(7)
        doc.text('Period: Last 12 months', pageW - margin, 27, { align: 'right' })
    }

    drawHeader()
    y = 50

    // ── Footer on every page ─────────────────────────────────────
    function drawFooter() {
        const pageCount = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            // Footer line
            doc.setDrawColor(...COLORS.border)
            doc.setLineWidth(0.3)
            doc.line(margin, pageH - 12, pageW - margin, pageH - 12)
            // Footer text
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...COLORS.muted)
            doc.text(data.organization.name + ' — Confidential', margin, pageH - 8)
            doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 8, { align: 'right' })
        }
    }

    // ── Check and add new page if needed ─────────────────────────
    function checkPage(needed: number) {
        if (y + needed > pageH - 20) {
            doc.addPage()
            y = margin + 5
        }
    }

    // ── Section title helper ─────────────────────────────────────
    function sectionTitle(title: string) {
        checkPage(14)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(...COLORS.text)
        doc.text(title, margin, y)
        y += 2
        doc.setDrawColor(...COLORS.accent)
        doc.setLineWidth(0.8)
        doc.line(margin, y, margin + 40, y)
        y += 6
    }

    // ══════════════════════════════════════════════════════════════
    // 1. FINANCIAL SUMMARY CARDS
    // ══════════════════════════════════════════════════════════════
    sectionTitle('Financial Summary')

    const cardW = (contentW - 9) / 4
    const cardH = 22
    const cards = [
        { label: 'NET REVENUE', value: fmt(data.summary.totalNetRevenue), bg: [79, 70, 229] as [number, number, number] }, // indigo-600
        { label: 'GROSS COLLECTED', value: fmt(data.summary.totalCollected), bg: COLORS.accent },
        { label: 'TOTAL DEDUCTIONS', value: fmt(data.summary.totalDeductions), bg: COLORS.danger },
        { label: 'PENDING', value: fmt(data.summary.totalPending), bg: COLORS.warning },
    ]

    cards.forEach((card, i) => {
        const x = margin + i * (cardW + 3)
        // Card bg
        doc.setFillColor(...card.bg)
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F')
        // Label
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(255, 255, 255)
        doc.text(card.label, x + 4, y + 7)
        // Value
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.text(card.value, x + 4, y + 17)
    })
    y += cardH + 6

    // Sub-stats row
    doc.setFillColor(...COLORS.light)
    doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...COLORS.secondary)

    const subStats = [
        `${data.summary.totalRegistrations.toLocaleString()} Total Registrations`,
        `${fmt(data.summary.affiliationRevenue)} Affiliation Revenue`,
        `${data.summary.freeEventsCount} Free Event${data.summary.freeEventsCount !== 1 ? 's' : ''}`,
    ]
    const subStatW = contentW / subStats.length
    subStats.forEach((stat, i) => {
        doc.text(stat, margin + i * subStatW + subStatW / 2, y + 7, { align: 'center' })
    })
    y += 16

    // ══════════════════════════════════════════════════════════════
    // 2. YEAR-OVER-YEAR COMPARISON
    // ══════════════════════════════════════════════════════════════
    sectionTitle('Year-over-Year Performance')

    const yoyW = contentW / 2 - 2
    const yoyH = 18

    // This year card
    doc.setFillColor(...COLORS.light)
    doc.roundedRect(margin, y, yoyW, yoyH, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    doc.text(String(data.yoy.currentYear), margin + 5, y + 7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...COLORS.text)
    doc.text(fmt(data.yoy.thisYear), margin + 5, y + 15)

    // Last year card
    doc.setFillColor(...COLORS.light)
    doc.roundedRect(margin + yoyW + 4, y, yoyW, yoyH, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLORS.muted)
    doc.text(String(data.yoy.currentYear - 1), margin + yoyW + 9, y + 7)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...COLORS.secondary)
    doc.text(fmt(data.yoy.lastYear), margin + yoyW + 9, y + 15)

    // Change badge
    const isUp = data.yoy.changePercent >= 0
    const badgeColor = isUp ? COLORS.accent : COLORS.danger
    doc.setFillColor(...badgeColor)
    const changeText = `${isUp ? '↑' : '↓'} ${Math.abs(data.yoy.changePercent)}%`
    const badgeX = pageW - margin - 28
    doc.roundedRect(badgeX, y + 4, 24, 10, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.white)
    doc.text(changeText, badgeX + 12, y + 11, { align: 'center' })

    y += yoyH + 8

    // ══════════════════════════════════════════════════════════════
    // 3. REVENUE BY TYPE
    // ══════════════════════════════════════════════════════════════
    sectionTitle('Revenue Distribution')

    const types = [
        { label: 'Tournaments', value: data.revenueByType.tournaments, color: [220, 38, 38] as [number, number, number] },
        { label: 'Promotions', value: data.revenueByType.promotions, color: [59, 130, 246] as [number, number, number] },
        { label: 'Seminars', value: data.revenueByType.seminars, color: [251, 191, 36] as [number, number, number] },
        { label: 'Affiliations', value: data.revenueByType.affiliations, color: [139, 92, 246] as [number, number, number] },
    ]
    const totalRev = types.reduce((s, t) => s + t.value, 0)

    // Horizontal proportion bar
    if (totalRev > 0) {
        let barX = margin
        const barH = 8
        types.forEach(t => {
            if (t.value <= 0) return
            const w = (t.value / totalRev) * contentW
            doc.setFillColor(...t.color)
            doc.rect(barX, y, w, barH, 'F')
            barX += w
        })
        // Round corners via clipping isn't available, but the visual is clean
        y += barH + 4
    }

    // Labels row
    const typeColW = contentW / types.length
    types.forEach((t, i) => {
        const x = margin + i * typeColW
        const pct = totalRev > 0 ? Math.round((t.value / totalRev) * 100) : 0

        // Color dot
        doc.setFillColor(...t.color)
        doc.circle(x + 3, y + 2, 1.5, 'F')

        // Label
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.secondary)
        doc.text(t.label, x + 7, y + 3)

        // Value
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...COLORS.text)
        doc.text(fmt(t.value), x + 7, y + 9)

        // Percentage
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.muted)
        doc.text(`${pct}%`, x + 7, y + 14)
    })
    y += 22

    // ══════════════════════════════════════════════════════════════
    // 3b. DEDUCTION BREAKDOWN
    // ══════════════════════════════════════════════════════════════
    const deductionEntries = Object.entries(data.summary.aggregatedDeductions || {}).filter(([_, v]) => v > 0)

    if (deductionEntries.length > 0) {
        sectionTitle('Deductions Breakdown')

        const dedColW = contentW / Math.max(deductionEntries.length, 1)
        deductionEntries.forEach(([name, value], i) => {
            const x = margin + i * dedColW

            // Icon Placeholder color
            doc.setFillColor(239, 68, 68) // red-500
            doc.roundedRect(x + 2, y, 6, 6, 1, 1, 'F')

            // Label
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...COLORS.secondary)
            doc.text(name, x + 10, y + 4)

            // Value
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(9)
            doc.setTextColor(...COLORS.danger)
            doc.text(fmt(value), x + 10, y + 9)
        })
        y += 22
    }

    // ══════════════════════════════════════════════════════════════
    // 4. MONTHLY REVENUE TABLE
    // ══════════════════════════════════════════════════════════════
    sectionTitle('Monthly Revenue Breakdown')
    checkPage(60)

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Month', 'Tournaments', 'Promotions', 'Seminars', 'Affiliations', 'Total']],
        body: data.monthlyData.map(m => {
            const total = m.tournaments + m.promotions + m.seminars + m.affiliations
            return [m.month, fmt(m.tournaments), fmt(m.promotions), fmt(m.seminars), fmt(m.affiliations), fmt(total)]
        }),
        foot: [[
            'TOTAL',
            fmt(data.monthlyData.reduce((s, m) => s + m.tournaments, 0)),
            fmt(data.monthlyData.reduce((s, m) => s + m.promotions, 0)),
            fmt(data.monthlyData.reduce((s, m) => s + m.seminars, 0)),
            fmt(data.monthlyData.reduce((s, m) => s + m.affiliations, 0)),
            fmt(data.monthlyData.reduce((s, m) => s + m.tournaments + m.promotions + m.seminars + m.affiliations, 0)),
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: 3,
            halign: 'center',
            valign: 'middle',
        },
        bodyStyles: {
            fontSize: 7.5,
            textColor: COLORS.text,
            cellPadding: 2.5,
            valign: 'middle',
        },
        footStyles: {
            fillColor: COLORS.light,
            textColor: COLORS.text,
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: 3,
            halign: 'right',
            valign: 'middle',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 25 },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right', fontStyle: 'bold' },
        },
    })

    y = (doc as any).lastAutoTable.finalY + 10

    // ══════════════════════════════════════════════════════════════
    // 5. EVENT BREAKDOWN TABLE
    // ══════════════════════════════════════════════════════════════
    sectionTitle('Event Breakdown')
    checkPage(40)

    const eventRows = data.events.map(e => {
        const gross = e.totalCollected || 0
        const net = e.netRevenue || 0
        const deductions = gross - net

        return [
            e.name,
            capitalize(e.type),
            fmtDate(e.date),
            String(e.totalRegistrations),
            fmt(gross),
            fmt(deductions),
            fmt(net),
        ]
    })

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Event Name', 'Type', 'Date', 'Regs', 'Gross', 'Deductions', 'Net Revenue']],
        body: eventRows,
        foot: [[
            'TOTALS', '', '',
            String(data.events.reduce((s, e) => s + e.totalRegistrations, 0)),
            fmt(data.events.reduce((s, e) => s + (e.totalCollected || 0), 0)),
            fmt(data.events.reduce((s, e) => s + ((e.totalCollected || 0) - (e.netRevenue || 0)), 0)),
            fmt(data.events.reduce((s, e) => s + (e.netRevenue || 0), 0)),
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2.5,
            halign: 'center',
            valign: 'middle',
        },
        bodyStyles: {
            fontSize: 7,
            textColor: COLORS.text,
            cellPadding: 2,
            valign: 'middle',
        },
        footStyles: {
            fillColor: COLORS.light,
            textColor: COLORS.text,
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2.5,
            halign: 'right',
            valign: 'middle',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 18 },
            2: { cellWidth: 22 },
            3: { halign: 'center', cellWidth: 12 },
            4: { halign: 'right', cellWidth: 25 },
            5: { halign: 'right', cellWidth: 25 },
            6: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
        },
        didParseCell: (hookData: any) => {
            // Color the Rate column based on value
            if (hookData.section === 'body' && hookData.column.index === 8) {
                const rateVal = parseInt(hookData.cell.raw || '0')
                if (rateVal >= 80) {
                    hookData.cell.styles.textColor = COLORS.accent
                } else if (rateVal >= 50) {
                    hookData.cell.styles.textColor = COLORS.warning
                } else {
                    hookData.cell.styles.textColor = COLORS.danger
                }
                hookData.cell.styles.fontStyle = 'bold'
            }
        },
    })

    y = (doc as any).lastAutoTable.finalY + 10

    // ══════════════════════════════════════════════════════════════
    // 6. PER-EVENT REGISTRATION DETAILS (top events)
    // ══════════════════════════════════════════════════════════════
    // Only include events with registrations and revenue
    const detailEvents = data.events.filter(e => e.registrations.length > 0 && e.totalCollected > 0)

    if (detailEvents.length > 0) {
        sectionTitle('Detailed Payment Records')

        for (const event of detailEvents) {
            checkPage(30)

            // Event header
            doc.setFillColor(...COLORS.light)
            doc.roundedRect(margin, y, contentW, 10, 1.5, 1.5, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8)
            doc.setTextColor(...COLORS.text)
            doc.text(event.name, margin + 4, y + 7)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...COLORS.secondary)
            const eventMeta = `${capitalize(event.type)} • ${fmtDate(event.date)} • ${event.totalRegistrations} regs • ${fmt(event.totalCollected)} collected`
            doc.text(eventMeta, pageW - margin - 4, y + 7, { align: 'right' })
            y += 12

            // Add deductions breakdown if exists
            const activeDeductions = Object.entries(event.deductions || {}).filter(([_, val]) => val > 0)
            if (activeDeductions.length > 0) {
                doc.setFontSize(6.5)
                doc.setFont('helvetica', 'italic')
                doc.setTextColor(...COLORS.danger)
                const dedStr = 'Deductions Applied: ' + activeDeductions.map(([n, v]) => `${n} (${fmt(v)})`).join(', ')
                doc.text(dedStr, margin + 4, y)
                y += 4
            }
            y += 2

            autoTable(doc, {
                startY: y,
                margin: { left: margin + 2, right: margin + 2 },
                head: [['#', 'Player / Clubs', 'Club', 'Status', 'Gross', 'Ded.', 'Net']],
                body: event.registrations.map((r, idx) => [
                    String(idx + 1),
                    r.playerName,
                    r.clubName,
                    r.status,
                    fmt(r.amountPaid),
                    fmt(r.deduction || 0),
                    fmt(r.net || 0),
                ]),
                theme: 'striped',
                headStyles: {
                    fillColor: COLORS.secondary,
                    textColor: COLORS.white,
                    fontStyle: 'bold',
                    fontSize: 6.5,
                    cellPadding: 2,
                    halign: 'center',
                    valign: 'middle',
                },
                bodyStyles: {
                    fontSize: 6.5,
                    textColor: COLORS.text,
                    cellPadding: 1.8,
                    valign: 'middle',
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 8, halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'right' },
                    5: { halign: 'right', textColor: COLORS.danger },
                    6: { halign: 'right', fontStyle: 'bold' },
                },
                didParseCell: (hookData: any) => {
                    if (hookData.section === 'body' && hookData.column.index === 3) {
                        if (hookData.cell.raw === 'PAID') {
                            hookData.cell.styles.textColor = COLORS.accent
                            hookData.cell.styles.fontStyle = 'bold'
                        } else {
                            hookData.cell.styles.textColor = COLORS.warning
                            hookData.cell.styles.fontStyle = 'bold'
                        }
                    }
                },
            })

            y = (doc as any).lastAutoTable.finalY + 8
        }
    }

    // ══════════════════════════════════════════════════════════════
    // 7. DISCLAIMER / NOTES
    // ══════════════════════════════════════════════════════════════
    checkPage(20)
    doc.setDrawColor(...COLORS.border)
    doc.setLineWidth(0.3)
    doc.line(margin, y, pageW - margin, y)
    y += 5

    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.5)
    doc.setTextColor(...COLORS.muted)
    doc.text('This report is auto-generated and reflects data at the time of generation. All amounts are in Philippine Peso (PHP).', margin, y)
    y += 3.5
    doc.text('For discrepancies, please verify with the original registration records. This document is confidential.', margin, y)

    // ── Draw footers ─────────────────────────────────────────────
    drawFooter()

    // ── Save ─────────────────────────────────────────────────────
    const filename = `${data.organization.name.replace(/\s+/g, '-')}-Financial-Report-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
}

// ─── Per-Event PDF Export ────────────────────────────────────────
export async function generateEventPDF(event: EventItem, org: OrgInfo) {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 15
    const contentW = pageW - margin * 2
    let y = margin

    // Header
    doc.setFillColor(...COLORS.primary)
    doc.rect(0, 0, pageW, 32, 'F')
    doc.setFillColor(...COLORS.accent)
    doc.rect(0, 32, pageW, 1, 'F')

    // Logo
    let headerLeft = margin
    if (org.logoUrl) {
        try {
            const logoData = await loadImageAsDataUrl(org.logoUrl)
            if (logoData) {
                doc.addImage(logoData, 'PNG', margin, 4, 24, 24)
                headerLeft = margin + 28
            }
        } catch { }
    }

    // Org/Event Info
    doc.setFont('helvetica', 'bold')
    const eventTitleAreaW = 50
    const availEventNameW = (pageW - margin - eventTitleAreaW) - headerLeft

    let eventNameFontSize = 14
    doc.setFontSize(eventNameFontSize)

    if (doc.getTextWidth(event.name) > availEventNameW) {
        eventNameFontSize = 12
        doc.setFontSize(eventNameFontSize)
    }

    const splitEventName = doc.splitTextToSize(event.name, availEventNameW)
    doc.setTextColor(...COLORS.white)
    doc.text(splitEventName, headerLeft, 14)

    const eventNameLines = Array.isArray(splitEventName) ? splitEventName.length : 1
    const eventMetaYOffset = (eventNameLines - 1) * (eventNameFontSize * 0.35)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(200, 210, 220)
    doc.text(`${capitalize(event.type)} • ${fmtDate(event.date)} • ${event.totalRegistrations} Registrations`, headerLeft, 21 + eventMetaYOffset)
    doc.text(org.name, headerLeft, 27 + eventMetaYOffset)

    y = 40

    // Summary row
    const gross = event.totalCollected || 0
    const net = event.netRevenue || 0
    const deductions = gross - net

    const cardData = [
        { label: 'GROSS COLLECTED', value: fmt(gross) },
        { label: 'DEDUCTIONS', value: fmt(deductions) },
        { label: 'NET REVENUE', value: fmt(net) },
        { label: 'REGISTRATIONS', value: String(event.totalRegistrations) },
    ]
    const eventCardW = (contentW - 9) / 4
    cardData.forEach((c, i) => {
        const x = margin + i * (eventCardW + 3)
        doc.setFillColor(...COLORS.light)
        doc.roundedRect(x, y, eventCardW, 16, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(...COLORS.muted)
        doc.text(c.label, x + 4, y + 6)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(...COLORS.text)
        doc.text(c.value, x + 4, y + 13)
    })
    y += 20

    // Deductions breakdown list
    const activeDeductions = Object.entries(event.deductions || {}).filter(([_, val]) => val > 0)
    if (activeDeductions.length > 0) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.danger)
        doc.text('Deduction Breakdown:', margin, y)
        y += 4

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.secondary)
        const dedLines = activeDeductions.map(([name, amount]) => `${name}: ${fmt(amount)}`).join('  •  ')
        doc.text(dedLines, margin, y)
        y += 6
    } else {
        y += 2
    }

    // Registrations table
    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Player Name', 'Club', 'Status', 'Gross', 'Ded.', 'Net']],
        body: event.registrations.map((r, idx) => {
            return [
                String(idx + 1),
                r.playerName,
                r.clubName,
                r.status,
                fmt(r.amountPaid),
                fmt(r.deduction || 0),
                fmt(r.net || 0),
            ]
        }),
        foot: [[
            '', 'TOTALS', '',
            String(event.totalRegistrations),
            fmt(gross),
            fmt(gross - net),
            fmt(net),
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 3,
            halign: 'center',
            valign: 'middle',
        },
        bodyStyles: {
            fontSize: 7.5,
            textColor: COLORS.text,
            cellPadding: 2.5,
            valign: 'middle',
        },
        footStyles: {
            fillColor: COLORS.light,
            textColor: COLORS.text,
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: 3,
            halign: 'right',
            valign: 'middle',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 45 },
            3: { halign: 'center', cellWidth: 18 },
            4: { halign: 'right', cellWidth: 20 },
            5: { halign: 'right', cellWidth: 20 },
            6: { halign: 'right', cellWidth: 20 },
        },
        didParseCell: (hookData: any) => {
            if (hookData.section === 'body' && hookData.column.index === 3) {
                if (hookData.cell.raw === 'PAID') {
                    hookData.cell.styles.textColor = COLORS.accent
                    hookData.cell.styles.fontStyle = 'bold'
                } else {
                    hookData.cell.styles.textColor = COLORS.warning
                    hookData.cell.styles.fontStyle = 'bold'
                }
            }
        },
    })

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setDrawColor(...COLORS.border)
        doc.setLineWidth(0.3)
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...COLORS.muted)
        doc.text(org.name + ' — Confidential', margin, pageH - 8)
        doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 8, { align: 'right' })
    }

    const filename = `${event.name.replace(/\s+/g, '-')}-Payment-Report.pdf`
    doc.save(filename)
}
