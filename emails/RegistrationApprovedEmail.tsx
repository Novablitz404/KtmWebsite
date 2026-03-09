import { Html, Head, Body, Container, Section, Text, Heading, Hr, Img, Link } from '@react-email/components'

/**
 * Approval email sent when a tournament/seminar registration is approved.
 * Supports multiple registrations (e.g., kyorugi + poomsae) in a single email.
 */

interface Registration {
    registrationId: string
    categoryName?: string
    eventType: 'Tournament' | 'Seminar'
    qrCodeDataUrl: string
}

interface RegistrationApprovedEmailProps {
    athleteName: string
    eventName: string
    /** Single registration (backward compat) */
    eventType?: 'Tournament' | 'Seminar'
    categoryName?: string
    registrationId?: string
    qrCodeDataUrl?: string
    /** Multiple registrations — takes priority if provided */
    registrations?: Registration[]
    /** Organization email banner URL */
    emailBannerUrl?: string
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.wotf-ph.com'

export default function RegistrationApprovedEmail({
    athleteName = 'John Doe',
    eventName = 'KTM Championship 2026',
    eventType = 'Tournament',
    categoryName,
    registrationId = '00123',
    qrCodeDataUrl = '',
    registrations,
    emailBannerUrl,
}: RegistrationApprovedEmailProps) {
    // Build a normalized list — either from the array or from the single props
    const items: Registration[] = registrations && registrations.length > 0
        ? registrations
        : [{
            registrationId: registrationId!,
            categoryName,
            eventType: eventType!,
            qrCodeDataUrl: qrCodeDataUrl!,
        }]

    const hasMultiple = items.length > 1

    return (
        <Html>
            <Head />
            <Body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f3f4f6', margin: 0, padding: 0 }}>
                <Container style={{ maxWidth: '580px', margin: '0 auto', padding: '20px' }}>
                    {/* Header */}
                    {emailBannerUrl && (
                        <Section style={{ borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
                            <Img
                                src={emailBannerUrl}
                                width="580"
                                alt={eventName}
                                style={{ width: '100%', display: 'block' }}
                            />
                        </Section>
                    )}
                    <Section style={{ backgroundColor: '#0f172a', borderRadius: emailBannerUrl ? '0' : '16px 16px 0 0', padding: '32px 24px', textAlign: 'center' as const }}>
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
                            Your {hasMultiple ? `${items.length} registrations` : 'registration'} for <strong>{eventName}</strong> {hasMultiple ? 'have' : 'has'} been approved!
                            {hasMultiple
                                ? ' Each registration has its own QR code — please present the correct one during check-in.'
                                : ' Please present the QR code below during check-in at the event.'
                            }
                        </Text>

                        {/* QR Cards */}
                        {items.map((item, idx) => (
                            <Section key={idx} style={{ textAlign: 'center' as const, margin: '24px 0', backgroundColor: '#fafafa', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
                                {hasMultiple && (
                                    <Text style={{ color: '#6366f1', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1.5px', margin: '0 0 12px' }}>
                                        {item.eventType === 'Tournament' ? '🥋' : '📚'} {item.categoryName || item.eventType} — QR {idx + 1} of {items.length}
                                    </Text>
                                )}
                                {item.qrCodeDataUrl && (
                                    <Img
                                        src={item.qrCodeDataUrl}
                                        width={200}
                                        height={200}
                                        alt={`Check-in QR Code${hasMultiple ? ` #${idx + 1}` : ''}`}
                                        style={{ margin: '0 auto', borderRadius: '8px' }}
                                    />
                                )}
                                <Text style={{ color: '#111827', fontSize: '16px', fontWeight: 700, marginTop: '12px', marginBottom: '2px' }}>
                                    {athleteName}
                                </Text>
                                {item.categoryName && (
                                    <Text style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 4px' }}>
                                        {item.categoryName}
                                    </Text>
                                )}
                                <Text style={{ color: '#d1d5db', fontSize: '10px', fontFamily: 'monospace', marginTop: '6px' }}>
                                    ID: {item.registrationId}
                                </Text>
                                {/* Download Button for this registration */}
                                <Link
                                    href={`${appUrl}/qr/${item.registrationId}`}
                                    style={{
                                        display: 'inline-block',
                                        backgroundColor: '#0f172a',
                                        color: '#ffffff',
                                        padding: '10px 24px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        textDecoration: 'none',
                                        marginTop: '12px',
                                    }}
                                >
                                    📥 Download This QR Card
                                </Link>
                            </Section>
                        ))}

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
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ color: '#94a3b8', padding: '6px 0' }}>{hasMultiple ? `Category ${idx + 1}` : 'Category'}</td>
                                        <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0', textAlign: 'right' as const }}>
                                            {item.categoryName || item.eventType}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

                        <Text style={{ color: '#475569', fontSize: '13px', lineHeight: '1.6', backgroundColor: '#fffbeb', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                            💡 <strong>Tip:</strong> {hasMultiple
                                ? 'You have separate QR codes for each category. Make sure to present the correct one during check-in.'
                                : 'Save this email or download the QR card above. You\'ll need it for check-in at the event venue.'}
                        </Text>
                    </Section>

                    {/* Footer */}
                    <Section style={{ backgroundColor: '#f8fafc', borderRadius: '0 0 16px 16px', padding: '20px 24px', textAlign: 'center' as const }}>
                        <Text style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
                            © {new Date().getFullYear()} World Olympics Taekwondo Federation Philippines
                        </Text>
                        <Text style={{ fontSize: '11px', color: '#d1d5db', textAlign: 'center' as const, margin: '8px 0 2px' }}>
                            Powered by
                        </Text>
                        <Img
                            src="https://www.wotf-ph.com/ktmnav.png"
                            width="50"
                            alt="KTM"
                            style={{ margin: '0 auto', opacity: 0.5 }}
                        />
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}
