import * as React from 'react'

interface NewAthleteNotificationEmailProps {
    athleteName: string
    athleteGender: string
    athleteCountry: string
    clubName: string
}

export default function NewAthleteNotificationEmail({
    athleteName,
    athleteGender,
    athleteCountry,
    clubName,
}: NewAthleteNotificationEmailProps) {
    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            maxWidth: '480px',
            margin: '0 auto',
            backgroundColor: '#000000',
            color: '#ffffff',
            padding: '0',
        }}>
            {/* Header */}
            <div style={{
                textAlign: 'center' as const,
                padding: '40px 32px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
                <img
                    src="https://www.tap-elite.com/tap-elite/tap_elite_horizontal_transparent.png"
                    alt="Tap Elite"
                    width={180}
                    style={{ margin: '0 auto 16px' }}
                />
                <h1 style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '2px',
                    textTransform: 'uppercase' as const,
                    margin: 0,
                    color: '#E10600',
                }}>
                    New Athlete Awaiting Approval
                </h1>
            </div>

            {/* Body */}
            <div style={{ padding: '32px' }}>
                <p style={{
                    color: '#9ca3af',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    margin: '0 0 24px',
                }}>
                    A new athlete has registered under <strong style={{ color: '#ffffff' }}>{clubName}</strong> and is awaiting your approval.
                </p>

                {/* Athlete Card */}
                <div style={{
                    backgroundColor: '#0A0A0A',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '20px',
                    marginBottom: '24px',
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                        <tbody>
                            <tr>
                                <td style={{ color: '#6b7280', fontSize: '12px', padding: '4px 0', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Name</td>
                                <td style={{ color: '#ffffff', fontSize: '14px', padding: '4px 0', textAlign: 'right' as const, fontWeight: 600 }}>{athleteName}</td>
                            </tr>
                            <tr>
                                <td style={{ color: '#6b7280', fontSize: '12px', padding: '4px 0', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Gender</td>
                                <td style={{ color: '#ffffff', fontSize: '14px', padding: '4px 0', textAlign: 'right' as const }}>{athleteGender}</td>
                            </tr>
                            <tr>
                                <td style={{ color: '#6b7280', fontSize: '12px', padding: '4px 0', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Country</td>
                                <td style={{ color: '#ffffff', fontSize: '14px', padding: '4px 0', textAlign: 'right' as const }}>{athleteCountry}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p style={{
                    color: '#6b7280',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    margin: '0 0 24px',
                }}>
                    Please review their profile and assign their <strong style={{ color: '#9ca3af' }}>belt rank</strong>, <strong style={{ color: '#9ca3af' }}>weight</strong>, and <strong style={{ color: '#9ca3af' }}>height</strong> to complete their registration.
                </p>

                {/* CTA Button */}
                <div style={{ textAlign: 'center' as const }}>
                    <a
                        href="https://www.tap-elite.com/club"
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            fontWeight: 700,
                            fontSize: '13px',
                            textTransform: 'uppercase' as const,
                            letterSpacing: '2px',
                            padding: '12px 32px',
                            borderRadius: '999px',
                            textDecoration: 'none',
                        }}
                    >
                        Review &amp; Approve
                    </a>
                </div>
            </div>

            {/* Footer */}
            <div style={{
                textAlign: 'center' as const,
                padding: '24px 32px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
                <p style={{ color: '#6b7280', fontSize: '10px', margin: '0 0 6px' }}>
                    Powered by
                </p>
                <img
                    src="https://www.tap-elite.com/ktmnav_white.png"
                    width={54}
                    alt="KTM Sports"
                    style={{ margin: '0 auto 12px', opacity: 0.6 }}
                />
                <p style={{ color: '#4b5563', fontSize: '11px', margin: 0 }}>
                    Elite Taekwondo Association of the Philippines
                </p>
            </div>
        </div>
    )
}
