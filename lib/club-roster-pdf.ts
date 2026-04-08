import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ClubRosterPlayer } from '@/app/actions'

// ── Palette ───────────────────────────────────────────────────────────────────
const RED    = [180, 32,  32 ] as [number, number, number]
const DARK   = [30,  30,  30 ] as [number, number, number]
const GREY   = [100, 100, 100] as [number, number, number]
const LGREY  = [200, 200, 200] as [number, number, number]
const WHITE  = [255, 255, 255] as [number, number, number]
const OFFWHT = [250, 250, 250] as [number, number, number]

const TYPE_COLOR: Record<string, [number, number, number]> = {
    KYORUGI: [180, 32,  32 ],
    POOMSAE: [37,  99,  235],
    KYUKPA:  [124, 58,  237],
}
const STATUS_LABEL: Record<string, string> = {
    APPROVED: 'Approved',
    PENDING:  'Pending',
    REJECTED: 'Rejected',
}

// ── A4 geometry ───────────────────────────────────────────────────────────────
// A4 = 210 × 297 mm
// Margins: 15 mm left/right  →  content width = 180 mm
// Bottom safety: 20 mm       →  table content ends ≤ 277 mm
// Footer rule at 279 mm, footer text at 285 mm (12 mm from edge — safe for all printers)
const PAGE_W        = 210
const PAGE_H        = 297
const MARGIN        = 15
const CONTENT_W     = PAGE_W - MARGIN * 2   // 180 mm
const BOT_MARGIN    = 20                    // mm from bottom for autoTable page-break trigger
const FOOTER_RULE_Y = PAGE_H - BOT_MARGIN + 2   // 279 mm
const FOOTER_TEXT_Y = PAGE_H - BOT_MARGIN + 8   // 285 mm
const HEADER_H_P1   = 28   // page 1 red banner height
const HEADER_H_Pn   = 13   // continuation header height on page 2+
const CONTENT_START = HEADER_H_P1 + 8   // page 1: first table content y

// Column widths — MUST sum to exactly CONTENT_W (180 mm)
// #    Name  DOB   Age  Gender  Wt   Ht   Belt  Status
// 7  + 54  + 22  + 10 + 14   + 12 + 12  + 24  + 25 = 180 ✓
const COLS    = [7, 54, 22, 10, 14, 14, 24, 25] as const
const HEADERS_BASE = ['#', 'Name', 'Birthday', 'Age', 'Gender', 'Wt/Ht', 'Belt', 'Status']

// Whether a category uses height (young) vs weight (older) as the classification metric
function isHeightBasedCategory(categoryName: string): boolean {
    const n = categoryName.toLowerCase()
    return /supertoddler|super.?toddler|toddler|grade.?school|gradeschool/.test(n)
}

function fmt(v: number | null, unit: string): string {
    return (v == null || v === 0) ? '—' : `${v}${unit}`
}
function fmtDate(iso: string | null): string {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${m}/${d}/${y}`
}

// ── Shared header draw ────────────────────────────────────────────────────────
function drawHeader(
    doc: jsPDF,
    pageNum: number,
    clubName: string,
    tournamentName: string,
    athleteCount: number
) {
    if (pageNum === 1) {
        // Full red banner
        doc.setFillColor(...RED)
        doc.rect(0, 0, PAGE_W, HEADER_H_P1, 'F')

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...WHITE)
        doc.text(tournamentName.toUpperCase(), MARGIN, 10)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.text(clubName, MARGIN, 21)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(255, 200, 200)
        doc.text(
            `${athleteCount} ATHLETE${athleteCount !== 1 ? 'S' : ''}`,
            PAGE_W - MARGIN, 21, { align: 'right' }
        )

        const today = new Date().toLocaleDateString('en-PH', {
            year: 'numeric', month: 'long', day: 'numeric'
        })
        doc.setFontSize(6)
        doc.text(`Generated ${today}`, PAGE_W - MARGIN, 26, { align: 'right' })
    } else {
        // Lightweight continuation header
        doc.setFillColor(247, 247, 247)
        doc.rect(0, 0, PAGE_W, HEADER_H_Pn, 'F')
        doc.setDrawColor(...RED)
        doc.setLineWidth(0.4)
        doc.line(0, HEADER_H_Pn, PAGE_W, HEADER_H_Pn)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(...DARK)
        doc.text(`${clubName}  (continued)`, MARGIN, 9)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...GREY)
        doc.text(tournamentName, PAGE_W - MARGIN, 9, { align: 'right' })
    }
}

// ── Shared footer draw ────────────────────────────────────────────────────────
function drawFooter(
    doc: jsPDF,
    pageNum: number,
    totalPages: number,
    clubName: string,
    tournamentName: string
) {
    doc.setDrawColor(...RED)
    doc.setLineWidth(0.35)
    doc.line(MARGIN, FOOTER_RULE_Y, PAGE_W - MARGIN, FOOTER_RULE_Y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...GREY)
    doc.text(
        `${tournamentName} · ${clubName} · Page ${pageNum} of ${totalPages}`,
        PAGE_W / 2, FOOTER_TEXT_Y, { align: 'center' }
    )
}

// ── Main export ───────────────────────────────────────────────────────────────
export function downloadClubRosterPdf(data: {
    clubName: string
    tournamentName: string
    players: ClubRosterPlayer[]
}) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // Draw page 1 header
    drawHeader(doc, 1, data.clubName, data.tournamentName, data.players.length)

    // Group athletes by category
    const grouped = new Map<string, { type: string; players: ClubRosterPlayer[] }>()
    for (const p of data.players) {
        const g = grouped.get(p.categoryName)
        if (g) g.players.push(p)
        else grouped.set(p.categoryName, { type: p.categoryType, players: [p] })
    }

    let currentY = CONTENT_START

    for (const [categoryName, { type, players }] of grouped) {
        const typeColor = (TYPE_COLOR[type] ?? GREY) as [number, number, number]
        const CAT_H = 6.5

        // If not enough space for category header + at least one row, go to next page
        if (currentY > FOOTER_RULE_Y - (CAT_H + 14)) {
            doc.addPage()
            const pn = (doc as any).internal.getNumberOfPages()
            drawHeader(doc, pn, data.clubName, data.tournamentName, data.players.length)
            drawFooter(doc, pn, pn, data.clubName, data.tournamentName) // placeholder page count
            currentY = HEADER_H_Pn + 4
        }

        // Category section header bar
        doc.setFillColor(...typeColor)
        doc.roundedRect(MARGIN, currentY, CONTENT_W, CAT_H, 1, 1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...WHITE)
        doc.text(categoryName, MARGIN + 3, currentY + 4.4)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.text(
            `${players.length} athlete${players.length !== 1 ? 's' : ''}`,
            PAGE_W - MARGIN - 3, currentY + 4.4, { align: 'right' }
        )

        currentY += CAT_H + 1.5

        const heightBased = isHeightBasedCategory(categoryName)
        const measureHeader = heightBased ? 'Height' : 'Weight'
        const HEADERS = [...HEADERS_BASE.slice(0, 5), measureHeader, ...HEADERS_BASE.slice(6)]

        const rows = players.map((p, i) => [
            String(i + 1),
            p.name,
            fmtDate(p.birthDate),
            p.age != null ? String(p.age) : '—',
            p.gender ?? '—',
            heightBased ? fmt(p.height, 'cm') : fmt(p.weight, 'kg'),
            p.belt ?? '—',
            STATUS_LABEL[p.registrationStatus] ?? p.registrationStatus,
        ])

        autoTable(doc, {
            startY:     currentY,
            head:       [HEADERS],
            body:       rows,
            tableWidth: CONTENT_W,
            margin: {
                left:   MARGIN,
                right:  MARGIN,
                top:    HEADER_H_Pn + 4,   // page 2+ table start (below continuation header)
                bottom: BOT_MARGIN,         // stop before footer area
            },
            columnStyles: {
                0: { cellWidth: COLS[0], halign: 'center', fontSize: 6 },
                1: { cellWidth: COLS[1], fontSize: 7, fontStyle: 'bold' },
                2: { cellWidth: COLS[2], halign: 'center', fontSize: 6 },
                3: { cellWidth: COLS[3], halign: 'center', fontSize: 6 },
                4: { cellWidth: COLS[4], halign: 'center', fontSize: 6 },
                5: { cellWidth: COLS[5], halign: 'center', fontSize: 6 },
                6: { cellWidth: COLS[6], halign: 'center', fontSize: 6 },
                7: { cellWidth: COLS[7], halign: 'center', fontSize: 6 },
            },
            headStyles: {
                fillColor:   [240, 240, 240],
                textColor:   DARK,
                fontStyle:   'bold',
                fontSize:    6,
                halign:      'center',
                cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
            },
            bodyStyles: {
                fontSize:    6.5,
                cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 },
                textColor:   DARK,
                lineColor:   LGREY,
                lineWidth:   0.1,
            },
            alternateRowStyles: { fillColor: OFFWHT },
            showHead: 'everyPage',

            didParseCell(h) {
                if (h.section === 'body' && h.column.index === 7) {
                    const val = h.cell.raw as string
                    if      (val === 'Approved') { h.cell.styles.textColor = [22,  163, 74];  h.cell.styles.fontStyle = 'bold' }
                    else if (val === 'Pending')  { h.cell.styles.textColor = [217, 119, 6];   h.cell.styles.fontStyle = 'bold' }
                    else if (val === 'Rejected') { h.cell.styles.textColor = [220, 38,  38];  h.cell.styles.fontStyle = 'bold' }
                }
            },

            didDrawPage(h) {
                const pn    = h.pageNumber
                const total = (doc as any).internal.getNumberOfPages()
                // On pages 2+, draw the continuation header (autoTable started a new page)
                if (pn > 1) {
                    drawHeader(doc, pn, data.clubName, data.tournamentName, data.players.length)
                }
                drawFooter(doc, pn, total, data.clubName, data.tournamentName)
            },
        })

        currentY = (doc as any).lastAutoTable.finalY + 5
    }

    // ── Summary row (only if space remains above the footer line) ────────────
    if (currentY < FOOTER_RULE_Y - 12) {
        doc.setDrawColor(...LGREY)
        doc.setLineWidth(0.25)
        doc.line(MARGIN, currentY, PAGE_W - MARGIN, currentY)
        currentY += 4

        const approved = data.players.filter(p => p.registrationStatus === 'APPROVED').length
        const pending  = data.players.filter(p => p.registrationStatus === 'PENDING').length
        const rejected = data.players.filter(p => p.registrationStatus === 'REJECTED').length

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(...GREY)
        doc.text(
            `Total: ${data.players.length} athletes  ·  Approved: ${approved}  ·  Pending: ${pending}  ·  Rejected: ${rejected}`,
            MARGIN, currentY
        )
    }

    const safeClub = data.clubName.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_')
    doc.save(`roster_${safeClub}.pdf`)
}
