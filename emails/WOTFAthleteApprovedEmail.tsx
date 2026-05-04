import * as React from 'react'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.wotf-global.com'

interface WOTFAthleteApprovedEmailProps {
    athleteName: string
    clubName: string
    belt: string
    weight: number
    height: number
}

export default function WOTFAthleteApprovedEmail({
    athleteName,
    clubName,
    belt,
    weight,
    height,
}: WOTFAthleteApprovedEmailProps) {
    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            maxWidth: '520px',
            margin: '0 auto',
            backgroundColor: '#000000',
            color: '#ffffff',
            padding: '0',
        }}>
            {/* Header */}
            <div style={{
                textAlign: 'center' as const,
                padding: '40px 32px 28px',
                background: 'linear-gradient(135deg, rgba(0,133,199,0.15) 0%, #000000 100%)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <img
                    src={`${appUrl}/wotf-global/Wotf_logo_Final.png`}
                    alt="WOTF Global"
                    width={80}
                    height={80}
                    style={{ margin: '0 auto 20px', display: 'block' }}
                />
                <h1 style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    letterSpacing: '2px',
                    textTransform: 'uppercase' as const,
                    margin: '0 0 8px',
                    color: '#ffffff',
                }}>
                    You&apos;re Approved!
                </h1>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                    Your WOTF Global athlete profile has been verified
                </p>
            </div>

            {/* Body */}
            <div style={{ padding: '32px' }}>
                <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: '1.7', margin: '0 0 24px' }}>
                    Hi <strong style={{ color: '#ffffff' }}>{athleteName}</strong>,
                </p>
                <p style={{ color: '#9ca3af', fontSize: '14px', lineHeight: '1.7', margin: '0 0 28px' }}>
                    Congratulations! Your clubmaster at <strong style={{ color: '#ffffff' }}>{clubName}</strong> has
                    reviewed and approved your profile. You now have full access to your athlete dashboard.
                </p>

                {/* Stats card */}
                <div style={{
                    backgroundColor: '#0A0A0A',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '28px',
                }}>
                    <p style={{
                        color: '#4b5563',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '2px',
                        margin: '0 0 16px',
                    }}>
                        Athlete Profile
                    </p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                        <tbody>
                            {[
                                { label: 'Name', value: athleteName },
                                { label: 'Club', value: clubName },
                                { label: 'Belt Rank', value: belt },
                                { label: 'Weight', value: `${weight} kg` },
                                { label: 'Height', value: `${height} cm` },
                            ].map(({ label, value }) => (
                                <tr key={label}>
                                    <td style={{ color: '#6b7280', fontSize: '13px', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        {label}
                                    </td>
                                    <td style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 600, padding: '7px 0', textAlign: 'right' as const, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        {value}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* CTA */}
                <div style={{ textAlign: 'center' as const, marginBottom: '28px' }}>
                    <a
                        href={`${appUrl}/athlete`}
                        style={{
                            display: 'inline-block',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            padding: '14px 36px',
                            borderRadius: '999px',
                            fontSize: '13px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            letterSpacing: '1px',
                            textTransform: 'uppercase' as const,
                        }}
                    >
                        Go to Athlete Dashboard →
                    </a>
                </div>

                <p style={{ color: '#4b5563', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>
                    If you have any questions, contact your clubmaster or reach out to the WOTF Global support team.
                </p>
            </div>

            {/* Footer */}
            <div style={{
                textAlign: 'center' as const,
                padding: '24px 32px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
                <div style={{ marginBottom: '12px' }}>
                    {[
                        { color: '#0085C7' },
                        { color: '#F4C300' },
                        { color: '#ffffff' },
                        { color: '#009F3D' },
                        { color: '#DF0024' },
                    ].map(({ color }, i) => (
                        <span key={i} style={{
                            display: 'inline-block',
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: color,
                            margin: '0 3px',
                        }} />
                    ))}
                </div>
                <p style={{ color: '#4b5563', fontSize: '11px', margin: 0 }}>
                    World Olympics Taekwondo Federation
                </p>
            </div>
        </div>
    )
}
