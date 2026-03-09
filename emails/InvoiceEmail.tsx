import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
    Section,
    Img,
    Hr,
} from '@react-email/components'
import * as React from 'react'

interface InvoiceEmailProps {
    orgName: string
    monthStr: string
}

export const InvoiceEmail = ({
    orgName,
    monthStr,
}: InvoiceEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>KTM Monthly Billing Invoice - {monthStr}</Preview>
            <Body style={main}>
                <Container style={container}>
                    {/* Header Section */}
                    <Section style={headerSection}>
                        <Img
                            src="https://www.wotf-ph.com/ktmnav.png"
                            width="140"
                            alt="KTM Platform"
                            style={logo}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={contentSection}>
                        <Heading style={h1}>Monthly Billing Invoice</Heading>

                        <Text style={text}>Hi {orgName},</Text>

                        <Text style={text}>
                            Please find attached your KTM platform billing invoice for <strong>{monthStr}</strong>.
                        </Text>

                        <Section style={detailsSection}>
                            <Text style={detailText}>
                                This invoice details the platform fees for all your approved event registrations and club affiliations during this period. The full breakdown is provided in the attached PDF.
                            </Text>
                        </Section>

                        <Text style={text}>
                            If you have any questions regarding this invoice, please reach out to the platform administration.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} KTM Sports. All rights reserved.
                        </Text>
                        <Text style={{ ...footerText, margin: '0' }}>
                            Powered by
                        </Text>
                        <Img
                            src="https://www.wotf-ph.com/ktmnav.png"
                            width="50"
                            alt="KTM"
                            style={{ margin: '4px auto 0', opacity: 0.5 }}
                        />
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
    backgroundColor: '#ffffff',
    margin: '40px auto',
    padding: '0',
    borderRadius: '12px',
    border: '1px solid #eee',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    maxWidth: '600px',
    overflow: 'hidden',
}

const headerSection = {
    padding: '30px',
    backgroundColor: '#f8fafc',
    textAlign: 'center' as const,
    borderBottom: '1px solid #eee',
}

const logo = {
    margin: '0 auto',
}

const contentSection = {
    padding: '40px',
}

const h1 = {
    color: '#111827',
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '32px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
}

const text = {
    color: '#374151',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 20px',
}

const detailsSection = {
    backgroundColor: '#f9fafb',
    padding: '24px',
    borderRadius: '8px',
    margin: '32px 0',
    border: '1px solid #e5e7eb',
}

const detailText = {
    color: '#4b5563',
    fontSize: '15px',
    lineHeight: '22px',
    margin: '0',
}

const hr = {
    borderColor: '#e5e7eb',
    margin: '0',
}

const footer = {
    padding: '24px 40px',
    backgroundColor: '#fafafa',
}

const footerText = {
    color: '#9ca3af',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '0 0 8px',
    textAlign: 'center' as const,
}

export default InvoiceEmail
