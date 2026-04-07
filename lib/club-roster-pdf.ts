import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ClubRosterPlayer } from '@/app/actions'

// ── Colours ───────────────────────────────────────────────────────────────────
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

function fmt(v: number | null, unit: string): string {
    if (v == null || v === 0) return '—'
    return `${v}${unit}`
}

function fmtDate(iso: string | null): string {
    if (!iso) return '—'
    const [y, m, d] = iso.split('-')
    return `${m}/${d}/${y}`
}

// ── Column widths (mm) — must total ≤ 170mm (A4 portrait w/ 20mm margins each side) ─
//   #   Name   DOB  Age  Gender  Wt  Ht  Belt  Status
//   6   42     20   10   14      12  12  20    12  = 148mm (some breathing room)
const COLS = [6, 42, 20, 10, 14, 12, 12, 20, 22] as const

export function downloadClubRosterPdf(data: {
    clubName: string
    tournamentName: string
    players: ClubRosterPlayer[]
}) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const PAGE_W = 210
    const MARGIN = 20
    const CONTENT_W = PAGE_W - MARGIN * 2

    // ── Header bar ────────────────────────────────────────────────────────────
    doc.setFillColor(...RED)
    doc.rect(0, 0, PAGE_W, 28, 'F')

    // Tournament name (top-left, small)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...WHITE)
    doc.text(data.tournamentName.toUpperCase(), MARGIN, 10)

    // Club name (large, bold)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(data.clubName, MARGIN, 20)

    // Athlete count (top-right)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(255, 200, 200)
    const countLabel = `${data.players.length} ATHLETE${data.players.length !== 1 ? 'S' : ''}`
    doc.text(countLabel, PAGE_W - MARGIN, 20, { align: 'right' })

    // Generated date
    const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    doc.setFontSize(6)
    doc.text(`Generated ${today}`, PAGE_W - MARGIN, 25, { align: 'right' })

    // ── Group players by category ─────────────────────────────────────────────
    const grouped = new Map<string, { type: string; players: ClubRosterPlayer[] }>()
    for (const p of data.players) {
        const existing = grouped.get(p.categoryName)
        if (existing) {
            existing.players.push(p)
        } else {
            grouped.set(p.categoryName, { type: p.categoryType, players: [p] })
        }
    }

    let currentY = 36

    // ── Table header labels ───────────────────────────────────────────────────
    const HEADERS = ['#', 'Name', 'Birthday', 'Age', 'Gender', 'Wt', 'Ht', 'Belt', 'Status']

    for (const [categoryName, { type, players }] of grouped) {
        const typeColor = TYPE_COLOR[type] ?? GREY

        // Category group header
        doc.setFillColor(...(typeColor as [number, number, number]))
        doc.roundedRect(MARGIN, currentY, CONTENT_W, 6.5, 1, 1, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(...WHITE)
        doc.text(categoryName, MARGIN + 3, currentY + 4.4)

        // Player count pill (right side)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.text(`${players.length} athlete${players.length !== 1 ? 's' : ''}`, PAGE_W - MARGIN - 3, currentY + 4.4, { align: 'right' })

        currentY += 8

        // Table rows for this category
        const rows = players.map((p, i) => [
            String(i + 1),
            p.name,
            fmtDate(p.birthDate),
            p.age != null ? String(p.age) : '—',
            p.gender ?? '—',
            fmt(p.weight, 'kg'),
            fmt(p.height, 'cm'),
            p.belt ?? '—',
            STATUS_LABEL[p.registrationStatus] ?? p.registrationStatus,
        ])

        autoTable(doc, {
            startY: currentY,
            head: [HEADERS],
            body: rows,
            margin: { left: MARGIN, right: MARGIN },
            columnStyles: {
                0: { cellWidth: COLS[0], halign: 'center', fontSize: 6 },
                1: { cellWidth: COLS[1], fontSize: 7, fontStyle: 'bold' },
                2: { cellWidth: COLS[2], halign: 'center', fontSize: 6 },
                3: { cellWidth: COLS[3], halign: 'center', fontSize: 6 },
                4: { cellWidth: COLS[4], halign: 'center', fontSize: 6 },
                5: { cellWidth: COLS[5], halign: 'center', fontSize: 6 },
                6: { cellWidth: COLS[6], halign: 'center', fontSize: 6 },
                7: { cellWidth: COLS[7], halign: 'center', fontSize: 6 },
                8: { cellWidth: COLS[8], halign: 'center', fontSize: 6 },
            },
            headStyles: {
                fillColor: [240, 240, 240],
                textColor: DARK,
                fontStyle: 'bold',
                fontSize: 6,
                halign: 'center',
                cellPadding: { top: 1.5, bottom: 1.5, left: 1, right: 1 },
            },
            bodyStyles: {
                fontSize: 6.5,
                cellPadding: { top: 1.8, bottom: 1.8, left: 1.5, right: 1.5 },
                textColor: DARK,
                lineColor: LGREY,
                lineWidth: 0.1,
            },
            alternateRowStyles: { fillColor: OFFWHT },
            // Colour the Status cell
            didParseCell(data) {
                if (data.section === 'body' && data.column.index === 8) {
                    const val = data.cell.raw as string
                    if (val === 'Approved') {
                        data.cell.styles.textColor = [22, 163, 74]
                        data.cell.styles.fontStyle  = 'bold'
                    } else if (val === 'Pending') {
                        data.cell.styles.textColor = [217, 119, 6]
                        data.cell.styles.fontStyle  = 'bold'
                    } else if (val === 'Rejected') {
                        data.cell.styles.textColor = [220, 38, 38]
                        data.cell.styles.fontStyle  = 'bold'
                    }
                }
            },
            didDrawPage(hookData) {
                // Footer on every page
                const pageCount = (doc as any).internal.getNumberOfPages()
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(6)
                doc.setTextColor(...GREY)
                doc.text(
                    `${data.tournamentName} · ${data.clubName} · Page ${hookData.pageNumber} of ${pageCount}`,
                    PAGE_W / 2, 290, { align: 'center' }
                )
                // Red bottom rule
                doc.setDrawColor(...RED)
                doc.setLineWidth(0.5)
                doc.line(MARGIN, 287, PAGE_W - MARGIN, 287)
            },
            tableWidth: CONTENT_W,
            showHead: 'firstPage',
        })

        // @ts-ignore — autoTable extends doc with lastAutoTable
        currentY = (doc as any).lastAutoTable.finalY + 5
    }

    // ── Summary footer (last page) ─────────────────────────────────────────────
    if (currentY < 260) {
        doc.setDrawColor(...LGREY)
        doc.setLineWidth(0.3)
        doc.line(MARGIN, currentY, PAGE_W - MARGIN, currentY)
        currentY += 4

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(...GREY)

        const approved = data.players.filter(p => p.registrationStatus === 'APPROVED').length
        const pending  = data.players.filter(p => p.registrationStatus === 'PENDING').length
        const rejected = data.players.filter(p => p.registrationStatus === 'REJECTED').length

        doc.text(
            `Total: ${data.players.length} athletes  ·  Approved: ${approved}  ·  Pending: ${pending}  ·  Rejected: ${rejected}`,
            MARGIN, currentY
        )
    }

    // ── Save ──────────────────────────────────────────────────────────────────
    const safeClub = data.clubName.replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_')
    doc.save(`roster_${safeClub}.pdf`)
}
