'use client'

// Draws a member's club invoice as a PDF in the browser. The figures come from getInvoiceData (app/club/invoicing.ts).
// jsPDF's built-in fonts have no peso sign, so amounts are written as "PHP 1,500.00".
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { InvoiceData } from '@/app/club/invoicing'

const INK: [number, number, number] = [28, 34, 48]
const MUTED: [number, number, number] = [91, 100, 117]
const LINE: [number, number, number] = [227, 230, 236]
const HEAD: [number, number, number] = [241, 243, 246]
const GREEN: [number, number, number] = [31, 143, 77]
const RED: [number, number, number] = [214, 58, 58]

const php = (amount: number) => 'PHP ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const longDate = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
const shortDate = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const monthLabel = (period: string) => new Date(period + '-01T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

type Picture = { dataUrl: string; width: number; height: number }

// Any browser-readable image (data URL or http URL) as a PNG data URL with its size, or null if it cannot be read.
async function loadPicture(source: string): Promise<Picture | null> {
    if (!source) return null
    try {
        let url = source
        if (!source.startsWith('data:')) {
            const response = await fetch(source)
            if (!response.ok) return null
            url = URL.createObjectURL(await response.blob())
        }
        const image = new Image()
        image.src = url
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        canvas.getContext('2d')!.drawImage(image, 0, 0)
        if (url !== source) URL.revokeObjectURL(url)
        return { dataUrl: canvas.toDataURL('image/png'), width: image.naturalWidth, height: image.naturalHeight }
    } catch {
        return null
    }
}

// Fit a picture inside a box, keeping its proportions.
const fit = (picture: Picture, box: number) => {
    const scale = Math.min(box / picture.width, box / picture.height)
    return { w: picture.width * scale, h: picture.height * scale }
}

export async function buildMemberInvoicePdf(data: InvoiceData): Promise<{ blob: Blob; filename: string }> {
    const [logo, qr] = await Promise.all([loadPicture(data.club.logoUrl), loadPicture(data.payQr?.image || '')])
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 18
    let y = margin

    const ensure = (needed: number) => { if (y + needed > pageH - margin) { doc.addPage(); y = margin } }

    // ── Header: club on the left, invoice details on the right ──
    let textX = margin
    if (logo) {
        const size = fit(logo, 24)
        doc.addImage(logo.dataUrl, 'PNG', margin, y, size.w, size.h)
        textX = margin + size.w + 5
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...INK)
    doc.text(data.club.name, textX, y + 6)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
    let lineY = y + 11.5
    for (const line of [data.club.address, data.club.phone, data.club.email, data.club.taxId && `Reg./Tax no. ${data.club.taxId}`].filter(Boolean) as string[]) {
        for (const part of doc.splitTextToSize(line, 95)) { doc.text(part, textX, lineY); lineY += 4.4 }
    }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...INK)
    doc.text('INVOICE', pageW - margin, y + 7, { align: 'right' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...MUTED)
    doc.text(data.number, pageW - margin, y + 13, { align: 'right' })
    doc.text(`Issued ${longDate(data.issued)}`, pageW - margin, y + 18, { align: 'right' })

    const unpaid = data.totals.owed > 0
    const stamp = unpaid ? 'UNPAID' : 'PAID'
    const stampColor = unpaid ? RED : GREEN
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10)
    const stampW = doc.getTextWidth(stamp) + 8
    doc.setDrawColor(...stampColor); doc.setLineWidth(0.6); doc.setTextColor(...stampColor)
    doc.roundedRect(pageW - margin - stampW, y + 21, stampW, 7, 1, 1)
    doc.text(stamp, pageW - margin - stampW / 2, y + 26, { align: 'center' })

    y = Math.max(lineY, y + 32, logo ? y + 26 : 0) + 8
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(margin, y, pageW - margin, y)
    y += 9

    // ── Billed to / due ──
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...MUTED)
    doc.text('BILLED TO', margin, y)
    if (data.due) doc.text('PAYMENT DUE', pageW - margin, y, { align: 'right' })
    y += 6
    doc.setFontSize(13); doc.setTextColor(...INK)
    doc.text(data.member.name, margin, y)
    if (data.due) doc.text(longDate(data.due), pageW - margin, y, { align: 'right' })
    y += 8

    // ── Dues ──
    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Description', { content: 'Fee', styles: { halign: 'right' } }, { content: 'Paid', styles: { halign: 'right' } }, { content: 'Amount due', styles: { halign: 'right' } }]],
        body: data.months.map(m => [`Membership dues, ${monthLabel(m.period)}`, php(m.fee), php(m.paid), php(m.owed)]),
        theme: 'plain',
        styles: { font: 'helvetica', fontSize: 9.5, textColor: INK, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, lineColor: LINE, lineWidth: { bottom: 0.2 } },
        headStyles: { fillColor: HEAD, textColor: MUTED, fontStyle: 'bold', fontSize: 8, lineWidth: 0 },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    })
    y = (doc as any).lastAutoTable.finalY + 8

    // ── Totals ──
    ensure(36)
    const boxW = 78, boxX = pageW - margin - boxW
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...INK)
    doc.text('Total fees', boxX + 3, y); doc.text(php(data.totals.fee), pageW - margin - 3, y, { align: 'right' })
    y += 6
    doc.text('Paid so far', boxX + 3, y); doc.text(php(data.totals.paid), pageW - margin - 3, y, { align: 'right' })
    y += 4
    doc.setFillColor(...INK); doc.rect(boxX, y, boxW, 10, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255)
    doc.text('Balance due', boxX + 3, y + 6.6); doc.text(php(data.totals.owed), pageW - margin - 3, y + 6.6, { align: 'right' })
    y += 18

    // ── Payments received ──
    if (data.payments.length) {
        ensure(24)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK)
        doc.text('Payments received', margin, y)
        autoTable(doc, {
            startY: y + 3,
            margin: { left: margin, right: margin },
            head: [['Date', 'For', { content: 'Amount', styles: { halign: 'right' } }]],
            body: data.payments.map(p => [shortDate(p.paidOn), p.period ? monthLabel(p.period) : 'Payment', php(p.amount)]),
            theme: 'plain',
            styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 2.5, lineColor: LINE, lineWidth: { bottom: 0.2 } },
            headStyles: { fillColor: HEAD, textColor: MUTED, fontStyle: 'bold', fontSize: 8, lineWidth: 0 },
            columnStyles: { 2: { halign: 'right' } },
        })
        y = (doc as any).lastAutoTable.finalY + 10
    }

    // ── Pay by QR code ──
    if (qr) {
        const box = 38
        ensure(box + 12)
        doc.setDrawColor(...LINE); doc.setLineWidth(0.3)
        doc.roundedRect(margin, y, pageW - margin * 2, box + 8, 2, 2)
        const size = fit(qr, box)
        doc.addImage(qr.dataUrl, 'PNG', margin + 4, y + 4 + (box - size.h) / 2, size.w, size.h)
        const tx = margin + 4 + box + 8
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
        doc.text('Pay by QR code', tx, y + 12)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
        doc.text('Scan with your banking or e-wallet app.', tx, y + 18)
        if (data.payQr?.label) {
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...INK)
            doc.text(doc.splitTextToSize(data.payQr.label, pageW - margin - tx), tx, y + 25)
        }
        y += box + 16
    }

    // ── Note ──
    if (data.note) {
        const lines = doc.splitTextToSize(data.note, pageW - margin * 2) as string[]
        ensure(lines.length * 4.4 + 8)
        doc.setDrawColor(...LINE); doc.line(margin, y, pageW - margin, y)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
        doc.text(lines, margin, y + 6)
    }

    const safe = data.member.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'member'
    return { blob: doc.output('blob'), filename: `invoice-${safe}-${data.issued}.pdf` }
}
