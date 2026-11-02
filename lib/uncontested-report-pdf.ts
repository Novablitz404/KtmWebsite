import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { ClubUncontestedReport, UncontestedReportCategory, UncontestedReportEntry } from '@/lib/uncontested-report'

type RGB = [number, number, number]

const RED    = [180, 32,  32 ] as RGB
const AMBER  = [217, 119, 6  ] as RGB
const GREEN  = [22,  163, 74 ] as RGB
const DARK   = [30,  30,  30 ] as RGB
const GREY   = [100, 100, 100] as RGB
const LGREY  = [200, 200, 200] as RGB
const WHITE  = [255, 255, 255] as RGB
const OFFWHT = [250, 250, 250] as RGB

const PAGE_W        = 210
const PAGE_H        = 297
const MARGIN        = 15
const CONTENT_W     = PAGE_W - MARGIN * 2
const BOT_MARGIN    = 20
const FOOTER_RULE_Y = PAGE_H - BOT_MARGIN + 2
const FOOTER_TEXT_Y = PAGE_H - BOT_MARGIN + 8
const HEADER_H_Pn   = 13

const fmt = (v: number | null | undefined, unit: string) => (v == null || v === 0 ? '—' : `${v}${unit}`)
const fmtDate = (iso: string | null) => {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${m}/${d}/${y}`
}

function ageRange(c: UncontestedReportCategory) {
    if (c.minAge == null && c.maxAge == null) return '—'
    return `${c.minAge ?? '—'} – ${c.maxAge ?? '—'} yrs`
}
function weightRange(c: UncontestedReportCategory) {
    if (c.minWeight == null && c.maxWeight == null) return c.weightClass ?? '—'
    const lo = c.minWeight ?? 0
    const hi = c.maxWeight != null && c.maxWeight < 999 ? `${c.maxWeight}kg` : 'and above'
    return `${lo}kg – ${hi}`
}

function categoryDetails(c: UncontestedReportCategory): string[][] {
    const rows = [
        ['Division', c.division ?? '—'],
        ['Weight class', c.weightClass ?? '—'],
        ['Weight range', weightRange(c)],
        ['Age range', ageRange(c)],
        ['Gender', c.gender ?? '—'],
        ['Skill level', c.skillLevel ?? '—'],
        ['Belt', c.belt ?? '—'],
    ]
    // Categories created without a template have no belt/division stored; skip rows with nothing to show
    return rows.filter(([, v]) => v !== '—')
}

// Returns the height of the header drawn, so the caller can start content below it.
function drawHeader(doc: jsPDF, pageNum: number, data: ClubUncontestedReport): number {
    if (pageNum === 1) {
        // Long club names wrap onto up to two lines instead of running into the right-hand text
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        const titleLines: string[] = doc.splitTextToSize(data.clubName, CONTENT_W).slice(0, 2)
        const titleBottom = 21 + (titleLines.length - 1) * 6
        const height = titleBottom + 12

        doc.setFillColor(...RED)
        doc.rect(0, 0, PAGE_W, height, 'F')

        // Top line: event name on the left, athlete count and date stacked on the right
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(...WHITE)
        const eventLines: string[] = doc.splitTextToSize(data.tournamentName.toUpperCase(), CONTENT_W - 45)
        doc.text(eventLines.slice(0, 1), MARGIN, 10)

        doc.setTextColor(255, 200, 200)
        const n = data.entries.length
        doc.text(`${n} ATHLETE${n !== 1 ? 'S' : ''}`, PAGE_W - MARGIN, 10, { align: 'right' })
        const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
        doc.setFontSize(6)
        doc.text(`Generated ${today}`, PAGE_W - MARGIN, 14, { align: 'right' })

        // Club name, then the report title on its own line underneath
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(...WHITE)
        doc.text(titleLines, MARGIN, 21, { lineHeightFactor: 1.15 })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(255, 220, 220)
        doc.text('UNCONTESTED DIVISIONS', MARGIN, titleBottom + 6)
        return height
    }

    doc.setFillColor(247, 247, 247)
    doc.rect(0, 0, PAGE_W, HEADER_H_Pn, 'F')
    doc.setDrawColor(...RED)
    doc.setLineWidth(0.4)
    doc.line(0, HEADER_H_Pn, PAGE_W, HEADER_H_Pn)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...DARK)
    doc.text(`${doc.splitTextToSize(data.clubName, 110)[0]}  (continued)`, MARGIN, 9)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...GREY)
    doc.text(doc.splitTextToSize(data.tournamentName, 60)[0], PAGE_W - MARGIN, 9, { align: 'right' })
    return HEADER_H_Pn
}

function drawFooters(doc: jsPDF, data: ClubUncontestedReport) {
    const total = (doc as any).internal.getNumberOfPages()
    for (let pn = 1; pn <= total; pn++) {
        doc.setPage(pn)
        doc.setDrawColor(...RED)
        doc.setLineWidth(0.35)
        doc.line(MARGIN, FOOTER_RULE_Y, PAGE_W - MARGIN, FOOTER_RULE_Y)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...GREY)
        doc.text(`${data.tournamentName} · ${data.clubName} · Page ${pn} of ${total}`, PAGE_W / 2, FOOTER_TEXT_Y, { align: 'center' })
    }
}

export function downloadUncontestedReportPdf(data: ClubUncontestedReport) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const firstHeaderH = drawHeader(doc, 1, data)

    let y = firstHeaderH + 8

    // Event line
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...GREY)
    const when = new Date(data.tournamentDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    doc.text([when, data.venue].filter(Boolean).join('  ·  '), MARGIN, y)
    y += 6

    // Each uncontested case is drawn inside its own bordered box: first the uncontested division,
    // then (below an arrow) the suggested placement. Content sits PAD mm inside the box.
    const PAD = 4
    const X0 = MARGIN + PAD
    const W = CONTENT_W - PAD * 2
    const BOX_BORDER = [150, 150, 150] as RGB
    const pageNo = () => (doc as any).internal.getNumberOfPages() as number

    const ensureSpace = (needed: number) => {
        if (y > FOOTER_RULE_Y - needed) {
            doc.addPage()
            drawHeader(doc, pageNo(), data)
            y = HEADER_H_Pn + 8
        }
    }

    const sectionBar = (label: string, color: RGB, right?: string) => {
        ensureSpace(30)
        doc.setFillColor(...color)
        doc.roundedRect(X0, y, W, 7, 1, 1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...WHITE)
        doc.text(label, X0 + 3, y + 4.7)
        if (right) {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(6)
            doc.text(right, X0 + W - 3, y + 4.7, { align: 'right' })
        }
        y += 9
    }

    const keyValueTable = (rows: string[][]) => {
        autoTable(doc, {
            startY: y,
            body: rows,
            theme: 'plain',
            tableWidth: W,
            margin: { left: X0, right: X0, top: HEADER_H_Pn + 8, bottom: BOT_MARGIN },
            columnStyles: {
                0: { cellWidth: 38, fontStyle: 'bold', textColor: GREY, fontSize: 6.5 },
                1: { fontSize: 7, textColor: DARK },
            },
            styles: { cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 } },
            didDrawPage: (h) => { if (h.pageNumber > 1) drawHeader(doc, h.pageNumber, data) },
        })
        y = (doc as any).lastAutoTable.finalY + 3
    }

    const playersTable = (c: UncontestedReportCategory) => {
        const heightBased = /toddler|grade.?school|gradeschool/i.test(c.name)
        autoTable(doc, {
            startY: y,
            head: [['#', 'Name', 'Club', 'Birthday', 'Age', 'Gender', heightBased ? 'Height' : 'Weight', 'Belt']],
            body: c.players.length
                ? c.players.map((p, i) => [
                    String(i + 1), p.name, p.clubName, fmtDate(p.birthDate), p.age != null ? String(p.age) : '—',
                    p.gender ?? '—', heightBased ? fmt(p.height, 'cm') : fmt(p.weight, 'kg'), p.belt ?? '—',
                ])
                : [['', 'No athletes registered', '', '', '', '', '', '']],
            tableWidth: W,
            margin: { left: X0, right: X0, top: HEADER_H_Pn + 8, bottom: BOT_MARGIN },
            // Column widths sum to W (172 mm)
            columnStyles: {
                0: { cellWidth: 7, halign: 'center' },
                1: { cellWidth: 46, fontStyle: 'bold' },
                2: { cellWidth: 38 },
                3: { cellWidth: 19, halign: 'center' },
                4: { cellWidth: 9, halign: 'center' },
                5: { cellWidth: 16, halign: 'center' },
                6: { cellWidth: 16, halign: 'center' },
                7: { cellWidth: 21, halign: 'center' },
            },
            headStyles: { fillColor: [240, 240, 240], textColor: DARK, fontStyle: 'bold', fontSize: 6, halign: 'center', cellPadding: 1.5 },
            bodyStyles: { fontSize: 6.5, cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 }, textColor: DARK, lineColor: LGREY, lineWidth: 0.1 },
            alternateRowStyles: { fillColor: OFFWHT },
            showHead: 'everyPage',
            didDrawPage: (h) => { if (h.pageNumber > 1) drawHeader(doc, h.pageNumber, data) },
        })
        y = (doc as any).lastAutoTable.finalY + 4
    }

    const subHeading = (text: string) => {
        ensureSpace(25)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...DARK)
        doc.text(text.toUpperCase(), X0, y + 2)
        y += 4
    }

    // Strokes the case's border on every page it covers (a case can run onto the next page)
    const drawCaseBox = (startPage: number, startY: number, endPage: number, endY: number) => {
        doc.setDrawColor(...BOX_BORDER)
        doc.setLineWidth(0.5)
        for (let pg = startPage; pg <= endPage; pg++) {
            doc.setPage(pg)
            const top = pg === startPage ? startY : HEADER_H_Pn + 3
            const bottom = pg === endPage ? endY : FOOTER_RULE_Y - 3
            doc.roundedRect(MARGIN, top, CONTENT_W, bottom - top, 2, 2, 'S')
        }
        doc.setPage(endPage)
    }

    if (data.entries.length === 0) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(...GREY)
        doc.text('This club currently has no uncontested athletes.', MARGIN, y + 6)
    }

    const total = data.entries.length
    data.entries.forEach((e: UncontestedReportEntry, i) => {
        const n = i + 1
        const target = e.suggestion

        // Start each case with room for its first section so a box never begins at the very bottom of a page
        ensureSpace(90)
        const startPage = pageNo()
        const startY = y
        y += PAD

        // ── Part 1: the uncontested division ──
        sectionBar(
            `${n}  ·  UNCONTESTED DIVISION  —  ${e.category.name}`,
            AMBER,
            e.kind === 'CROSS_DIVISION' ? `Case ${n} of ${total} · heaviest class` : `Case ${n} of ${total}`,
        )
        subHeading('Division details')
        keyValueTable(categoryDetails(e.category))
        subHeading('Uncontested athlete')
        playersTable({ ...e.category, players: e.category.players.filter(p => p.name === e.athlete.name) })

        if (e.resolution === 'WALKOVER') {
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7)
            doc.setTextColor(...AMBER)
            doc.text('Decision recorded: Walkover (the athlete advances without a match)', X0, y + 1)
            y += 6
        }

        // ── Part 2: the suggested placement ──
        if (target) {
            ensureSpace(55)
            // down arrow between the two parts
            doc.setFillColor(...GREEN)
            doc.triangle(MARGIN + CONTENT_W / 2 - 3, y, MARGIN + CONTENT_W / 2 + 3, y, MARGIN + CONTENT_W / 2, y + 4, 'F')
            y += 6
            sectionBar(
                `${n}  ·  SUGGESTED PLACEMENT  —  ${target.name}`,
                GREEN,
                e.kind === 'CROSS_DIVISION' ? 'Move to the next age division' : 'Move up one weight class',
            )
            subHeading('Division details')
            keyValueTable(categoryDetails(target))
            subHeading(`Athletes already in this division (${target.players.length})`)
            playersTable(target)
        } else {
            ensureSpace(20)
            doc.setFillColor(...OFFWHT)
            doc.setDrawColor(...LGREY)
            doc.setLineWidth(0.2)
            doc.roundedRect(X0, y, W, 9, 1, 1, 'FD')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7)
            doc.setTextColor(...GREY)
            doc.text(`${n}  ·  NO SUGGESTED PLACEMENT`, X0 + 3, y + 5.7)
            doc.setFont('helvetica', 'normal')
            doc.text('No higher category is available to move this athlete to.', X0 + 50, y + 5.7)
            y += 11
        }

        drawCaseBox(startPage, startY, pageNo(), y)
        y += 8
    })

    drawFooters(doc, data)

    const safeClub = data.clubName.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_')
    doc.save(`uncontested_${safeClub}.pdf`)
}
