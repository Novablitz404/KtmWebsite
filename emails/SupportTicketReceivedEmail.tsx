import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Img,
    Heading,
    Hr,
} from '@react-email/components';

interface SupportTicketReceivedEmailProps {
    name: string;
    subject: string;
    message: string;
}

export const SupportTicketReceivedEmail = ({
    name,
    subject,
    message,
}: SupportTicketReceivedEmailProps) => {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={headerSection}>
                        <Img
                            src="https://www.tap-elite.com/tap-elite/tap_elite_horizontal_transparent.png"
                            width="200"
                            alt="Tap Elite"
                            style={logo}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={contentSection}>
                        <Heading style={h1}>
                            We've received your request
                        </Heading>
                        <Text style={text}>
                            Hi {name || 'there'},
                        </Text>
                        <Text style={text}>
                            Thanks for reaching out. Our team will review your message and get back to you as soon as possible — usually within one business day.
                        </Text>

                        <Section style={ticketBox}>
                            <Text style={ticketLabel}>Subject</Text>
                            <Text style={ticketSubject}>{subject}</Text>
                            <Text style={{ ...ticketLabel, marginTop: '16px' }}>Your Message</Text>
                            <Text style={ticketMessage}>{message}</Text>
                        </Section>

                        <Text style={subtext}>
                            You can reply directly to this email to add more details — your reply will be added to this same request.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerPoweredBy}>Powered by</Text>
                        <Img
                            src="https://www.tap-elite.com/ktmnav.png"
                            width="72"
                            alt="KTM Sports"
                            style={footerLogo}
                        />
                        <Text style={footerText}>
                            © {new Date().getFullYear()} Elite Taekwondo Association of the Philippines. All rights reserved.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '40px auto',
    padding: '0',
    borderRadius: '12px',
    border: '1px solid #eee',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    maxWidth: '600px',
    overflow: 'hidden',
};

const headerSection = {
    padding: '30px',
    backgroundColor: '#000000',
    textAlign: 'center' as const,
    borderBottom: '2px solid #E10600',
};

const logo = {
    margin: '0 auto',
};

const contentSection = {
    padding: '40px',
};

const h1 = {
    color: '#111827',
    fontSize: '22px',
    fontWeight: '700',
    lineHeight: '30px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
};

const text = {
    color: '#374151',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 16px',
};

const ticketBox = {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
};

const ticketLabel = {
    color: '#6b7280',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    margin: '0 0 6px',
};

const ticketSubject = {
    color: '#111827',
    fontSize: '15px',
    fontWeight: '700',
    margin: '0',
};

const ticketMessage = {
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0',
    whiteSpace: 'pre-wrap' as const,
};

const subtext = {
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: '20px',
    margin: '24px 0 0',
    textAlign: 'center' as const,
};

const hr = {
    borderColor: '#e5e7eb',
    margin: '0',
};

const footer = {
    padding: '24px 40px',
    backgroundColor: '#fafafa',
    textAlign: 'center' as const,
};

const footerPoweredBy = {
    color: '#9ca3af',
    fontSize: '11px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    margin: '0 0 8px',
};

const footerLogo = {
    margin: '0 auto 12px',
    opacity: 0.8,
};

const footerText = {
    color: '#9ca3af',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '0',
    textAlign: 'center' as const,
};

export default SupportTicketReceivedEmail;
