'use client'

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Types ───────────────────────────────────────────────────────
export interface InvoiceData {
    orgDetails: {
        name: string
        address: string | null
        contactPhone: string | null
        contactEmail: string | null
    }
    monthLabel: string
    events: {
        name: string
        type: string
        date: string
        paidRegistrations: number
        totalPlatformFee: number
        registrations: { playerName: string; clubName: string; amount: number }[]
    }[]
    totalAmountDue: number
    bankDetails?: {
        bankName: string
        accountName: string
        accountNumber: string
    }
    companyDetails?: {
        companyName: string
        companyAddress: string
    }
}

// ─── Helpers ─────────────────────────────────────────────────────
function fmt(amount: number): string {
    return 'PHP ' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Colors ──────────────────────────────────────────────────────
const COLORS = {
    primary: [30, 41, 59] as [number, number, number],       // slate-800
    secondary: [71, 85, 105] as [number, number, number],    // slate-500
    accent: [16, 185, 129] as [number, number, number],      // emerald-500
    light: [241, 245, 249] as [number, number, number],      // slate-100
    white: [255, 255, 255] as [number, number, number],
    border: [226, 232, 240] as [number, number, number],     // slate-200
    text: [15, 23, 42] as [number, number, number],          // slate-900
    muted: [148, 163, 184] as [number, number, number],      // slate-400
}

// ─── Main Export ─────────────────────────────────────────────────
export function generateInvoicePDF(data: InvoiceData): string {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 20
    let y = margin

    function checkPage(neededHeight: number) {
        if (y + neededHeight > pageH - margin) {
            doc.addPage()
            y = margin
        }
    }

    // ══════════════════════════════════════════════════════════════
    // HEADER (Sender Info)
    // ══════════════════════════════════════════════════════════════
    doc.setFillColor(...COLORS.primary)
    doc.rect(0, 0, pageW, 45, 'F')
    doc.setFillColor(...COLORS.accent)
    doc.rect(0, 45, pageW, 1.5, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(...COLORS.white)
    doc.text('INVOICE', margin, 20)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(data.companyDetails?.companyName || 'KTM Platform', margin, 28)

    doc.setFontSize(8)
    doc.setTextColor(200, 210, 220)
    if (data.companyDetails?.companyAddress) {
        const splitAddress = doc.splitTextToSize(data.companyDetails.companyAddress, 100)
        doc.text(splitAddress, margin, 33)
    } else {
        doc.text('Administration', margin, 33)
    }

    // Invoice Meta (Right side)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.white)
    doc.text('BILLING PERIOD', pageW - margin, 20, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(data.monthLabel, pageW - margin, 26, { align: 'right' })

    const generatedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    doc.setFontSize(8)
    doc.setTextColor(200, 210, 220)
    doc.text('Date of Issue: ' + generatedDate, pageW - margin, 32, { align: 'right' })

    y = 60 // Move below header

    // ══════════════════════════════════════════════════════════════
    // BILL TO
    // ══════════════════════════════════════════════════════════════
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...COLORS.text)
    doc.text('BILL TO:', margin, y)
    y += 6

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text(data.orgDetails.name, margin, y)
    y += 6

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.text)
    if (data.orgDetails.address) {
        doc.text(data.orgDetails.address, margin, y)
        y += 5
    }
    if (data.orgDetails.contactPhone) {
        doc.text(`Phone: ${data.orgDetails.contactPhone}`, margin, y)
        y += 5
    }
    if (data.orgDetails.contactEmail) {
        doc.text(`Email: ${data.orgDetails.contactEmail}`, margin, y)
        y += 5
    }

    y += 15

    // ══════════════════════════════════════════════════════════════
    // SUMMARY BAR
    // ══════════════════════════════════════════════════════════════
    doc.setFillColor(...COLORS.light)
    doc.roundedRect(margin, y, pageW - margin * 2, 24, 2, 2, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.muted)
    doc.text('AMOUNT DUE', margin + 10, y + 10)

    doc.setFontSize(18)
    doc.setTextColor(...COLORS.text)
    doc.text(fmt(data.totalAmountDue), margin + 10, y + 18)

    y += 35

    // ══════════════════════════════════════════════════════════════
    // LINE ITEMS TABLE
    // ══════════════════════════════════════════════════════════════
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...COLORS.text)
    doc.text('Charges Breakdown', margin, y)
    y += 4

    doc.setDrawColor(...COLORS.accent)
    doc.setLineWidth(0.8)
    doc.line(margin, y, margin + 40, y)
    y += 6

    autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [[
            'Description',
            'Date',
            'Type',
            { content: 'Count', styles: { halign: 'center' } },
            { content: 'Amount', styles: { halign: 'right' } }
        ]],
        body: data.events.map(e => [
            e.name,
            fmtDate(e.date),
            capitalize(e.type),
            e.paidRegistrations.toString(),
            fmt(e.totalPlatformFee)
        ]),
        foot: [[
            'TOTAL AMOUNT DUE', '', '', '',
            fmt(data.totalAmountDue)
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 4,
            valign: 'middle',
        },
        bodyStyles: {
            fontSize: 9,
            textColor: COLORS.text,
            cellPadding: 3,
            valign: 'middle',
        },
        footStyles: {
            fillColor: COLORS.light,
            textColor: COLORS.text,
            fontStyle: 'bold',
            fontSize: 10,
            cellPadding: 4,
            halign: 'right',
            valign: 'middle',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { halign: 'center', cellWidth: 20 },
            4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        },
    })

    y = (doc as any).lastAutoTable.finalY + 15

    // ══════════════════════════════════════════════════════════════
    // DETAILED REGISTRATION BREAKDOWN
    // ══════════════════════════════════════════════════════════════
    const detailEvents = data.events.filter(e => e.registrations && e.registrations.length > 0)

    if (detailEvents.length > 0) {
        checkPage(20)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.setTextColor(...COLORS.text)
        doc.text('Detailed Registration Breakdown', margin, y)
        y += 4

        doc.setDrawColor(...COLORS.accent)
        doc.setLineWidth(0.8)
        doc.line(margin, y, margin + 68, y)
        y += 6

        for (const event of detailEvents) {
            checkPage(30)

            // Event header
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(8)
            const availableWidth = pageW - margin * 2 - 8
            const splitName = doc.splitTextToSize(event.name, availableWidth)
            const nameHeight = splitName.length * 4
            const boxHeight = 6 + nameHeight + 3

            doc.setFillColor(...COLORS.light)
            doc.roundedRect(margin, y, pageW - margin * 2, boxHeight, 1.5, 1.5, 'F')

            doc.setTextColor(...COLORS.text)
            doc.text(splitName, margin + 4, y + 6)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7)
            doc.setTextColor(...COLORS.secondary)
            const eventMeta = `${capitalize(event.type)} • ${fmtDate(event.date)} • ${event.paidRegistrations} regs • ${fmt(event.totalPlatformFee)} platform fee`
            doc.text(eventMeta, margin + 4, y + 6 + nameHeight)

            y += boxHeight + 4

            autoTable(doc, {
                startY: y,
                margin: { left: margin + 4, right: margin + 4 },
                head: [[
                    { content: '#', styles: { halign: 'center' } },
                    'Player / Entity',
                    'Club / Org',
                    { content: 'Platform Fee', styles: { halign: 'right' } }
                ]],
                body: event.registrations.map((r, idx) => [
                    String(idx + 1),
                    r.playerName,
                    r.clubName,
                    fmt(r.amount),
                ]),
                theme: 'striped',
                headStyles: {
                    fillColor: COLORS.secondary,
                    textColor: COLORS.white,
                    fontStyle: 'bold',
                    fontSize: 7,
                    cellPadding: 2,
                    valign: 'middle',
                },
                bodyStyles: {
                    fontSize: 7,
                    textColor: COLORS.text,
                    cellPadding: 1.8,
                    valign: 'middle',
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    3: { halign: 'right', fontStyle: 'bold' },
                },
            })

            y = (doc as any).lastAutoTable.finalY + 8
        }
    }

    // ══════════════════════════════════════════════════════════════
    // FOOTER NOTES
    // ══════════════════════════════════════════════════════════════
    checkPage(45)

    doc.setFillColor(...COLORS.light)
    doc.roundedRect(margin, y, pageW - margin * 2, 45, 2, 2, 'F')

    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...COLORS.text)
    doc.text('Payment Details & Notes', margin + 6, y)

    y += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...COLORS.muted)

    doc.text('1. Please remit payment within 15 days of receiving this invoice.', margin + 6, y)
    y += 5
    doc.text('2. Payments can be deposited directly to the KTM official bank account:', margin + 6, y)
    y += 5

    // Print Bank Details prominently if available
    if (data.bankDetails && data.bankDetails.bankName) {
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(...COLORS.text)
        doc.text(`Account Name: ${data.bankDetails.accountName}`, margin + 12, y)
        y += 4
        doc.text(`Account Number: ${data.bankDetails.accountNumber}`, margin + 12, y)
        y += 4
        doc.text(`Bank Name: ${data.bankDetails.bankName}`, margin + 12, y)
        y += 5
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(...COLORS.muted)
    }

    doc.text('3. Send proof of payment reply to this email once completed.', margin + 6, y)

    // Page numbers
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setDrawColor(...COLORS.border)
        doc.setLineWidth(0.3)
        doc.line(margin, pageH - 12, pageW - margin, pageH - 12)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...COLORS.muted)
        doc.text('KTM Billing System — Confidential', margin, pageH - 8)
        doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 8, { align: 'right' })
    }

    // Output Base64 string directly
    const dataUri = doc.output('datauristring')
    return dataUri
}
