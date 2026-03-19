'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { CheckCircle, PenLine, FileText } from 'lucide-react'

type DisplayState = 'idle' | 'checked-in' | 'waiver' | 'signed'

interface AthleteInfo {
    id: string
    name: string
    category?: string
    club?: string
    eventName: string
    eventType: string
}

// Waiver text sections (matching WaiverDocument.tsx content)
const WAIVER_SECTIONS = [
    {
        num: 1,
        title: 'Assumption of Risk',
        text: 'I understand and acknowledge that participating in Taekwondo involves certain inherent risks, including but not limited to, bodily injury, physical strain, and emotional stress. I voluntarily assume all risks associated with my participation in the competition.'
    },
    {
        num: 2,
        title: 'Health and Fitness',
        text: 'I certify that I am physically and mentally fit to participate in the competition. I acknowledge that it is my responsibility to consult with a physician prior to participating if I have any concerns regarding my health or physical condition.'
    },
    {
        num: 3,
        title: 'Release of Liability',
        text: 'In consideration of being permitted to participate in the competition, I hereby release, waive, discharge, and covenant not to sue the organizing body, its officers, directors, employees, agents, and representatives from any and all liability, claims, demands, actions, and causes of action whatsoever arising out of or related to any loss, damage, or injury, including death, that may be sustained by me during the competition.'
    },
    {
        num: 4,
        title: 'Indemnification',
        text: 'I agree to indemnify and hold harmless the organizing body, its officers, directors, employees, agents, and representatives from any and all liability, claims, demands, actions, and causes of action arising out of or related to my participation in the competition.'
    },
    {
        num: 5,
        title: 'Use of Likeness',
        text: 'I consent to the use of my name, likeness, voice, and/or appearance in any photographs, videos, or other media recordings taken during the competition for promotional, marketing, or educational purposes.'
    },
    {
        num: 6,
        title: 'Governing Law',
        text: 'This waiver shall be governed by and construed in accordance with the laws of the Philippines.'
    }
]

export default function CheckinDisplayPage() {
    const [state, setState] = useState<DisplayState>('idle')
    const [athlete, setAthlete] = useState<AthleteInfo | null>(null)
    const [hasSigned, setHasSigned] = useState(false)
    const sigRef = useRef<SignatureCanvas | null>(null)
    const channelRef = useRef<BroadcastChannel | null>(null)

    useEffect(() => {
        const channel = new BroadcastChannel('checkin')
        channelRef.current = channel

        channel.onmessage = (event) => {
            const { type, data } = event.data

            switch (type) {
                case 'CHECKED_IN':
                    setAthlete(data)
                    setState('checked-in')
                    setHasSigned(false)
                    // Auto-transition to waiver after 2.5s
                    setTimeout(() => setState('waiver'), 2500)
                    break

                case 'SHOW_WAIVER':
                    setAthlete(data)
                    setState('waiver')
                    setHasSigned(false)
                    break

                case 'WAIVER_SAVED':
                    setState('signed')
                    // Return to idle after 3s
                    setTimeout(() => {
                        setState('idle')
                        setAthlete(null)
                        setHasSigned(false)
                    }, 3000)
                    break

                case 'RESET':
                    setState('idle')
                    setAthlete(null)
                    setHasSigned(false)
                    break
            }
        }

        return () => channel.close()
    }, [])

    const handleSignatureEnd = useCallback(() => {
        if (sigRef.current && !sigRef.current.isEmpty()) {
            setHasSigned(true)
            const dataUrl = sigRef.current.toDataURL('image/png')
            // Send signature data back to laptop
            channelRef.current?.postMessage({
                type: 'SIGNATURE_DATA',
                data: { signatureDataUrl: dataUrl }
            })
        }
    }, [])

    const clearSignature = useCallback(() => {
        sigRef.current?.clear()
        setHasSigned(false)
        channelRef.current?.postMessage({ type: 'SIGNATURE_CLEARED' })
    }, [])

    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    // IDLE STATE
    if (state === 'idle') {
        return (
            <div style={{
                width: '100vw', height: '100vh',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #16213e 100%)',
                color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <div style={{
                    width: 120, height: 120, borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 40, animation: 'pulse 2s infinite'
                }}>
                    <FileText size={48} color="rgba(255,255,255,0.5)" />
                </div>
                <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 12, letterSpacing: -1 }}>
                    Check-In Station
                </h1>
                <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                    Scan your QR code to begin
                </p>
                <style>{`
                    @keyframes pulse {
                        0%, 100% { opacity: 0.6; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.05); }
                    }
                `}</style>
            </div>
        )
    }

    // CHECK-IN SUCCESS STATE
    if (state === 'checked-in' && athlete) {
        return (
            <div style={{
                width: '100vw', height: '100vh',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
                color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <div style={{
                    animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                    <CheckCircle size={80} style={{ marginBottom: 24 }} />
                    <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 8, letterSpacing: -1 }}>
                        Check-In Successful!
                    </h1>
                    <p style={{ fontSize: 28, fontWeight: 600, opacity: 0.9, marginBottom: 4 }}>
                        {athlete.name}
                    </p>
                    {athlete.club && (
                        <p style={{ fontSize: 18, opacity: 0.7 }}>{athlete.club}</p>
                    )}
                    {athlete.category && (
                        <p style={{ fontSize: 16, opacity: 0.6, marginTop: 8 }}>{athlete.category}</p>
                    )}
                    <p style={{
                        fontSize: 14, opacity: 0.5, marginTop: 32,
                        animation: 'fadeIn 1s ease 1.5s both'
                    }}>
                        Preparing waiver document...
                    </p>
                </div>
                <style>{`
                    @keyframes scaleIn {
                        from { opacity: 0; transform: scale(0.8); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 0.5; }
                    }
                `}</style>
            </div>
        )
    }

    // SIGNED CONFIRMATION STATE
    if (state === 'signed') {
        return (
            <div style={{
                width: '100vw', height: '100vh',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
                color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <div style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)', textAlign: 'center' }}>
                    <CheckCircle size={72} style={{ marginBottom: 20 }} />
                    <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
                        Waiver Signed Successfully
                    </h1>
                    <p style={{ fontSize: 18, opacity: 0.7 }}>
                        Thank you, {athlete?.name || 'Athlete'}. You may proceed.
                    </p>
                </div>
                <style>{`
                    @keyframes scaleIn {
                        from { opacity: 0; transform: scale(0.8); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}</style>
            </div>
        )
    }

    // WAIVER DOCUMENT STATE
    return (
        <div style={{
            width: '100vw', height: '100vh', overflow: 'auto',
            background: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Document Container */}
            <div style={{
                maxWidth: 800, margin: '24px auto', padding: '48px 56px',
                background: 'white', borderRadius: 8,
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                minHeight: 'calc(100vh - 48px)'
            }}>
                {/* Header */}
                <h1 style={{
                    fontSize: 22, fontWeight: 800, textAlign: 'center',
                    textTransform: 'uppercase', letterSpacing: 2, marginBottom: 32,
                    color: '#111827'
                }}>
                    Waiver and Release of Liability
                </h1>

                {/* Opening */}
                <p style={{ fontSize: 14, lineHeight: 1.8, color: '#374151', marginBottom: 24, textAlign: 'justify' }}>
                    I, <strong>{athlete?.name || '_______________'}</strong>, hereby acknowledge and agree to the following terms and
                    conditions in consideration of being permitted to participate in the{' '}
                    <strong>{athlete?.eventName || '_______________'}</strong>.
                </p>

                {/* Sections */}
                {WAIVER_SECTIONS.map(section => (
                    <div key={section.num} style={{
                        display: 'flex', gap: 12, marginBottom: 16
                    }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#374151', minWidth: 20 }}>
                            {section.num}.
                        </span>
                        <p style={{ fontSize: 13, lineHeight: 1.8, color: '#374151', textAlign: 'justify', margin: 0 }}>
                            <strong>{section.title}:</strong> {section.text}
                        </p>
                    </div>
                ))}

                {/* Acknowledgment */}
                <p style={{
                    fontSize: 13, lineHeight: 1.8, color: '#374151', marginTop: 24,
                    marginBottom: 32, textAlign: 'justify'
                }}>
                    I have read this waiver and fully understand its terms. I understand that I am giving up substantial rights,
                    including my right to sue. I acknowledge that I am signing this waiver freely and voluntarily, and intend
                    by my signature to be a complete and unconditional release of all liability to the greatest extent allowed
                    by law.
                </p>

                {/* Signature Area */}
                <div style={{
                    borderTop: '2px solid #e5e7eb', paddingTop: 24, marginTop: 16
                }}>
                    {/* Signature Line with Canvas */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 20, gap: 16 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
                            Participant&apos;s Signature:
                        </span>
                        <div style={{
                            flex: 1, borderBottom: '1px solid #000', position: 'relative',
                            minHeight: 80
                        }}>
                            <div style={{
                                position: 'absolute', top: -8, right: 8,
                                display: 'flex', alignItems: 'center', gap: 4,
                                color: hasSigned ? '#059669' : '#9ca3af',
                                fontSize: 11, fontWeight: 600,
                                transition: 'color 0.3s'
                            }}>
                                <PenLine size={12} />
                                {hasSigned ? 'Signed' : 'Sign here'}
                            </div>
                            <SignatureCanvas
                                ref={sigRef}
                                penColor="#1e3a5f"
                                canvasProps={{
                                    style: {
                                        width: '100%',
                                        height: 80,
                                        cursor: 'crosshair'
                                    }
                                }}
                                onEnd={handleSignatureEnd}
                            />
                            {!hasSigned && (
                                <button
                                    onClick={clearSignature}
                                    style={{
                                        position: 'absolute', bottom: 4, right: 4,
                                        background: 'none', border: 'none',
                                        fontSize: 10, color: '#9ca3af', cursor: 'pointer',
                                        display: 'none'
                                    }}
                                >
                                    Clear
                                </button>
                            )}
                        </div>
                    </div>

                    {hasSigned && (
                        <div style={{ textAlign: 'right', marginBottom: 16 }}>
                            <button
                                onClick={clearSignature}
                                style={{
                                    background: 'none', border: '1px solid #d1d5db',
                                    borderRadius: 6, padding: '4px 12px',
                                    fontSize: 12, color: '#6b7280', cursor: 'pointer'
                                }}
                            >
                                Clear & Re-sign
                            </button>
                        </div>
                    )}

                    {/* Printed Name */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 16, gap: 16 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>
                            Printed Name:
                        </span>
                        <div style={{ flex: 1, borderBottom: '1px solid #000', paddingBottom: 4 }}>
                            <span style={{ fontSize: 14, fontStyle: 'italic', color: '#374151' }}>
                                {athlete?.name || ''}
                            </span>
                        </div>
                    </div>

                    {/* Date */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 16, gap: 16 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Date:</span>
                        <div style={{ borderBottom: '1px solid #000', paddingBottom: 4, minWidth: 120 }}>
                            <span style={{ fontSize: 14, fontStyle: 'italic', color: '#374151' }}>
                                {today}
                            </span>
                        </div>
                    </div>

                    {/* Digital stamp */}
                    <p style={{
                        fontSize: 10, color: '#9ca3af', fontStyle: 'italic',
                        textAlign: 'center', marginTop: 32
                    }}>
                        * This document was digitally generated and signed upon check-in for {athlete?.eventName} on {today}.
                    </p>
                </div>
            </div>
        </div>
    )
}
