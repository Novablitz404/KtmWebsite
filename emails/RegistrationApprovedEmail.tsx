import { Html, Head, Body, Container, Section, Text, Heading, Hr, Img, Link } from '@react-email/components'

/**
 * Approval email sent when a tournament/seminar registration is approved.
 * Includes a QR code for event check-in and a download link.
 */
interface RegistrationApprovedEmailProps {
    athleteName: string
    eventName: string
    eventType: 'Tournament' | 'Seminar'
    categoryName?: string
    registrationId: string
    qrCodeDataUrl: string // Base64 data URL of the QR code image
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.wotf-ph.com'

export default function RegistrationApprovedEmail({
    athleteName = 'John Doe',
    eventName = 'KTM Championship 2026',
    eventType = 'Tournament',
    categoryName = 'Cadet Male Novice -33kg',
    registrationId = '00123',
    qrCodeDataUrl = '',
}: RegistrationApprovedEmailProps) {
    const downloadUrl = `${appUrl}/qr/${registrationId}`

    return (
        <Html>
            <Head />
            <Body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f3f4f6', margin: 0, padding: 0 }}>
                <Container style={{ maxWidth: '580px', margin: '0 auto', padding: '20px' }}>
                    {/* Header */}
                    <Section style={{ backgroundColor: '#0f172a', borderRadius: '16px 16px 0 0', padding: '32px 24px', textAlign: 'center' as const }}>
                        <Heading style={{ color: '#ffffff', fontSize: '24px', fontWeight: 800, margin: 0 }}>
                            Registration Approved ✅
                        </Heading>
                        <Text style={{ color: '#94a3b8', fontSize: '14px', margin: '8px 0 0' }}>
                            {eventName}
                        </Text>
                    </Section>

                    {/* Body */}
                    <Section style={{ backgroundColor: '#ffffff', padding: '32px 24px' }}>
                        <Text style={{ color: '#1e293b', fontSize: '16px', lineHeight: '1.6' }}>
                            Hi <strong>{athleteName}</strong>,
                        </Text>
                        <Text style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
                            Your registration for <strong>{eventName}</strong> has been approved!
                            Please present the QR code below during check-in at the event.
                        </Text>

                        {/* QR Card */}
                        <Section style={{ textAlign: 'center' as const, margin: '24px 0', backgroundColor: '#fafafa', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                            {qrCodeDataUrl && (
                                <Img
                                    src={qrCodeDataUrl}
                                    width={200}
                                    height={200}
                                    alt="Check-in QR Code"
                                    style={{ margin: '0 auto', borderRadius: '8px' }}
                                />
                            )}
                            <Text style={{ color: '#111827', fontSize: '18px', fontWeight: 700, marginTop: '16px', marginBottom: '4px' }}>
                                {athleteName}
                            </Text>
                            <Text style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 4px' }}>
                                {eventName}
                            </Text>
                            {categoryName && (
                                <Text style={{ color: '#9ca3af', fontSize: '12px', margin: '0' }}>
                                    {categoryName}
                                </Text>
                            )}
                            <Text style={{ color: '#d1d5db', fontSize: '10px', fontFamily: 'monospace', marginTop: '8px' }}>
                                ID: {registrationId}
                            </Text>
                        </Section>

                        {/* Download Button */}
                        <Section style={{ textAlign: 'center' as const, margin: '8px 0 24px' }}>
                            <Link
                                href={downloadUrl}
                                style={{
                                    display: 'inline-block',
                                    backgroundColor: '#0f172a',
                                    color: '#ffffff',
                                    padding: '14px 32px',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                }}
                            >
                                📥 Download QR Card
                            </Link>
                            <Text style={{ color: '#94a3b8', fontSize: '11px', marginTop: '8px' }}>
                                Download a high-resolution QR card you can save or print
                            </Text>
                        </Section>

                        <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

                        {/* Details */}
                        <Text style={{ color: '#64748b', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '12px' }}>
                            Registration Details
                        </Text>

                        <table style={{ width: '100%', fontSize: '14px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ color: '#94a3b8', padding: '6px 0' }}>Name</td>
                                    <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0', textAlign: 'right' as const }}>{athleteName}</td>
                                </tr>
                                <tr>
                                    <td style={{ color: '#94a3b8', padding: '6px 0' }}>Event</td>
                                    <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0', textAlign: 'right' as const }}>{eventName}</td>
                                </tr>
                                <tr>
                                    <td style={{ color: '#94a3b8', padding: '6px 0' }}>Type</td>
                                    <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0', textAlign: 'right' as const }}>{eventType}</td>
                                </tr>
                                {categoryName && (
                                    <tr>
                                        <td style={{ color: '#94a3b8', padding: '6px 0' }}>Category</td>
                                        <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0', textAlign: 'right' as const }}>{categoryName}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

                        <Text style={{ color: '#475569', fontSize: '13px', lineHeight: '1.6', backgroundColor: '#fffbeb', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                            💡 <strong>Tip:</strong> Save this email or download the QR card above. You&apos;ll need it for check-in at the event venue.
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={{ backgroundColor: '#f8fafc', borderRadius: '0 0 16px 16px', padding: '20px 24px', textAlign: 'center' as const }}>
                        <Text style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                            © {new Date().getFullYear()} World Olympics Taekwondo Federation Philippines
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}
