import { Html, Head, Body, Container, Section, Text, Heading, Hr, Row, Column, Img } from '@react-email/components'

/**
 * Confirmation email for guest event registrations.
 * Sent after successful payment for special event landing pages.
 */
interface GuestRegistrationConfirmEmailProps {
    athleteName: string
    eventName: string
    categoryName: string
    registrationCode: string
    paymentAmount: number
    registeredAt: Date
}

export default function GuestRegistrationConfirmEmail({
    athleteName = 'John Doe',
    eventName = 'KTM World Championship 2026',
    categoryName = 'Kyorugi - Senior Male -68kg',
    registrationCode = 'EVT-ABC123',
    paymentAmount = 2500,
    registeredAt = new Date(),
}: GuestRegistrationConfirmEmailProps) {
    return (
        <Html>
            <Head />
            <Body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#f3f4f6', margin: 0, padding: 0 }}>
                <Container style={{ maxWidth: '580px', margin: '0 auto', padding: '20px' }}>
                    {/* Header */}
                    <Section style={{ backgroundColor: '#000000', borderRadius: '16px 16px 0 0', padding: '28px 24px 24px', textAlign: 'center' as const, borderBottom: '2px solid #E10600' }}>
                        <Img
                            src="https://www.tap-elite.com/tap-elite/tap_elite_horizontal_transparent.png"
                            width={180}
                            alt="Tap Elite"
                            style={{ margin: '0 auto 16px' }}
                        />
                        <Heading style={{ color: '#ffffff', fontSize: '24px', fontWeight: 800, margin: 0 }}>
                            Registration Confirmed ✅
                        </Heading>
                        <Text style={{ color: '#9ca3af', fontSize: '14px', margin: '8px 0 0' }}>
                            {eventName}
                        </Text>
                    </Section>

                    {/* Body */}
                    <Section style={{ backgroundColor: '#ffffff', padding: '32px 24px' }}>
                        <Text style={{ color: '#1e293b', fontSize: '16px', lineHeight: '1.6' }}>
                            Hi <strong>{athleteName}</strong>,
                        </Text>
                        <Text style={{ color: '#475569', fontSize: '14px', lineHeight: '1.6' }}>
                            Your registration for <strong>{eventName}</strong> has been confirmed.
                            Please save the registration code below — you will need it for check-in at the event.
                        </Text>

                        {/* Registration Code */}
                        <Section style={{ backgroundColor: '#FFF5F5', border: '2px dashed #E10600', borderRadius: '12px', padding: '24px', textAlign: 'center' as const, margin: '24px 0' }}>
                            <Text style={{ color: '#E10600', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1px', margin: '0 0 8px' }}>
                                Your Registration Code
                            </Text>
                            <Text style={{ color: '#111827', fontSize: '32px', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '3px', margin: 0 }}>
                                {registrationCode}
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
                                    <td style={{ color: '#94a3b8', padding: '6px 0' }}>Category</td>
                                    <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0', textAlign: 'right' as const }}>{categoryName}</td>
                                </tr>
                                <tr>
                                    <td style={{ color: '#94a3b8', padding: '6px 0' }}>Amount Paid</td>
                                    <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0', textAlign: 'right' as const }}>₱{paymentAmount.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td style={{ color: '#94a3b8', padding: '6px 0' }}>Registered On</td>
                                    <td style={{ color: '#1e293b', fontWeight: 600, padding: '6px 0', textAlign: 'right' as const }}>
                                        {registeredAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Section>

                    {/* Footer */}
                    <Section style={{ backgroundColor: '#f8fafc', borderRadius: '0 0 16px 16px', padding: '20px 24px', textAlign: 'center' as const }}>
                        <Text style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 8px' }}>
                            © {new Date().getFullYear()} Elite Taekwondo Association of the Philippines. All rights reserved.
                        </Text>
                        <Text style={{ fontSize: '11px', color: '#d1d5db', margin: '0 0 4px' }}>
                            Powered by
                        </Text>
                        <Img
                            src="https://www.tap-elite.com/ktmnav.png"
                            width={50}
                            alt="KTM"
                            style={{ margin: '0 auto', opacity: 0.5 }}
                        />
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}
