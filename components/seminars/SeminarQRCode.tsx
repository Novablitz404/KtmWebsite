'use client'

import { QRCodeSVG } from 'qrcode.react'

interface SeminarQRCodeProps {
    token: string
    playerName: string
    seminarName: string
}

export default function SeminarQRCode({ token, playerName, seminarName }: SeminarQRCodeProps) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 inline-flex flex-col items-center gap-3 shadow-sm">
            <QRCodeSVG
                value={token}
                size={200}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#1e1b4b"
            />
            <div className="text-center">
                <p className="text-sm font-bold text-gray-900">{playerName}</p>
                <p className="text-xs text-gray-500">{seminarName}</p>
            </div>
        </div>
    )
}
