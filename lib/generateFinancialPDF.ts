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
    registrations: { id: string; playerName: string; clubName: string; status: string; amountExpected: number; amountPaid: number }[]
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
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
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
        doc.setFontSize(18)
        doc.setTextColor(...COLORS.white)
        doc.text(data.organization.name, headerLeft, 17)

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
            doc.text(line1, headerLeft, 24)
            if (contactParts.length > 2) {
                doc.text(contactParts.slice(2).join('  •  '), headerLeft, 29)
            }
        }

        if (data.organization.chairman) {
            doc.setFontSize(7)
            doc.setTextColor(160, 170, 180)
            doc.text('Chairman: ' + data.organization.chairman, headerLeft, 36)
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
        { label: 'COLLECTED', value: fmt(data.summary.totalCollected), bg: COLORS.accent },
        { label: 'TOTAL EXPECTED', value: fmt(data.summary.totalRevenue), bg: [59, 130, 246] as [number, number, number] },
        { label: 'PENDING', value: fmt(data.summary.totalPending), bg: COLORS.warning },
        { label: 'COLLECTION RATE', value: data.summary.collectionRate + '%', bg: data.summary.collectionRate >= 80 ? COLORS.accent : data.summary.collectionRate >= 50 ? COLORS.warning : COLORS.danger },
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
    y += 20

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
        },
        bodyStyles: {
            fontSize: 7.5,
            textColor: COLORS.text,
            cellPadding: 2.5,
        },
        footStyles: {
            fillColor: COLORS.light,
            textColor: COLORS.text,
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: 3,
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
        const rate = e.totalExpected > 0 ? Math.round((e.totalCollected / e.totalExpected) * 100) : (e.totalCollected > 0 ? 100 : 0)
        return [
            e.name,
            capitalize(e.type),
            fmtDate(e.date),
            String(e.totalRegistrations),
            String(e.paidCount),
            String(e.unpaidCount),
            fmt(e.totalExpected),
            fmt(e.totalCollected),
            rate + '%',
        ]
    })

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Event Name', 'Type', 'Date', 'Regs', 'Paid', 'Unpaid', 'Expected', 'Collected', 'Rate']],
        body: eventRows,
        foot: [[
            'TOTALS', '', '',
            String(data.events.reduce((s, e) => s + e.totalRegistrations, 0)),
            String(data.events.reduce((s, e) => s + e.paidCount, 0)),
            String(data.events.reduce((s, e) => s + e.unpaidCount, 0)),
            fmt(data.events.reduce((s, e) => s + e.totalExpected, 0)),
            fmt(data.events.reduce((s, e) => s + e.totalCollected, 0)),
            (data.summary.collectionRate + '%'),
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2.5,
        },
        bodyStyles: {
            fontSize: 7,
            textColor: COLORS.text,
            cellPadding: 2,
        },
        footStyles: {
            fillColor: COLORS.light,
            textColor: COLORS.text,
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: 2.5,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 38 },
            1: { cellWidth: 18 },
            2: { cellWidth: 22 },
            3: { halign: 'center', cellWidth: 12 },
            4: { halign: 'center', cellWidth: 12 },
            5: { halign: 'center', cellWidth: 12 },
            6: { halign: 'right', cellWidth: 22 },
            7: { halign: 'right', cellWidth: 22 },
            8: { halign: 'center', cellWidth: 14 },
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
            y += 13

            autoTable(doc, {
                startY: y,
                margin: { left: margin + 2, right: margin + 2 },
                head: [['#', 'Player / Clubs', 'Club', 'Status', 'Expected', 'Paid']],
                body: event.registrations.map((r, idx) => [
                    String(idx + 1),
                    r.playerName,
                    r.clubName,
                    r.status,
                    fmt(r.amountExpected),
                    fmt(r.amountPaid),
                ]),
                theme: 'striped',
                headStyles: {
                    fillColor: COLORS.secondary,
                    textColor: COLORS.white,
                    fontStyle: 'bold',
                    fontSize: 6.5,
                    cellPadding: 2,
                },
                bodyStyles: {
                    fontSize: 6.5,
                    textColor: COLORS.text,
                    cellPadding: 1.8,
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 8, halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'right' },
                    5: { halign: 'right' },
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

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.white)
    doc.text(event.name, headerLeft, 14)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(200, 210, 220)
    doc.text(`${capitalize(event.type)} • ${fmtDate(event.date)} • ${event.totalRegistrations} Registrations`, headerLeft, 21)
    doc.text(org.name, headerLeft, 27)

    y = 40

    // Summary row
    const cardData = [
        { label: 'EXPECTED', value: fmt(event.totalExpected) },
        { label: 'COLLECTED', value: fmt(event.totalCollected) },
        { label: 'PAID', value: String(event.paidCount) },
        { label: 'UNPAID', value: String(event.unpaidCount) },
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
    y += 22

    // Registrations table
    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['#', 'Player Name', 'Club', 'Status', 'Expected', 'Paid']],
        body: event.registrations.map((r, idx) => [
            String(idx + 1),
            r.playerName,
            r.clubName,
            r.status,
            fmt(r.amountExpected),
            fmt(r.amountPaid),
        ]),
        foot: [[
            '', 'TOTALS', '',
            `${event.paidCount}/${event.totalRegistrations}`,
            fmt(event.totalExpected),
            fmt(event.totalCollected),
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 8,
            cellPadding: 3,
        },
        bodyStyles: {
            fontSize: 7.5,
            textColor: COLORS.text,
            cellPadding: 2.5,
        },
        footStyles: {
            fillColor: COLORS.light,
            textColor: COLORS.text,
            fontStyle: 'bold',
            fontSize: 7.5,
            cellPadding: 3,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 45 },
            3: { halign: 'center', cellWidth: 18 },
            4: { halign: 'right', cellWidth: 24 },
            5: { halign: 'right', cellWidth: 24 },
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
