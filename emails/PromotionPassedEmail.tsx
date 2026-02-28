import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Section,
    Text,
} from '@react-email/components'
import * as React from 'react'

interface PromotionPassedEmailProps {
    athleteName: string
    beltName: string
    clubName: string
    promotionTestName: string
    dashboardUrl: string
}

export const PromotionPassedEmail = ({
    athleteName = 'Athlete',
    beltName = 'Black Belt',
    clubName = 'Your Club',
    promotionTestName = 'Promotion Test',
    dashboardUrl = 'https://ktmsports.com/athlete',
}: PromotionPassedEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Congratulations! You passed your {beltName} promotion test.</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={coverSection}>
                        <Section style={imageSection}>
                            {/* Will fallback to alt text if image doesn't load */}
                            <Img
                                src="https://ktmsports.com/KTMLogo.png"
                                width="75"
                                height="75"
                                alt="KTM Logo"
                                style={logo}
                            />
                        </Section>
                        <Section style={upperSection}>
                            <Heading style={h1}>Congratulations, {athleteName}! 🥋</Heading>
                            <Text style={mainText}>
                                We are thrilled to inform you that you have officially passed your grading at the <strong>{promotionTestName}</strong>.
                            </Text>
                            <Text style={mainText}>
                                Your hard work and dedication have paid off. You are now officially recognized as a <strong>{beltName}</strong> under {clubName}.
                            </Text>
                            <Section style={buttonContainer}>
                                <Button href={dashboardUrl} style={button}>
                                    View Achievements
                                </Button>
                            </Section>
                        </Section>
                        <Hr style={hr} />
                        <Section style={lowerSection}>
                            <Text style={footerText}>
                                Keep training hard and inspiring others on the mats.
                                <br />- The KTM Team
                            </Text>
                        </Section>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

export default PromotionPassedEmail

// Styles
const main = {
    backgroundColor: '#f6f9fc',
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
    margin: '0 auto',
    padding: '20px 0 48px',
    width: '100%',
    maxWidth: '600px',
}

const coverSection = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
}

const imageSection = {
    backgroundColor: '#dc2626', // Red-600
    padding: '40px 0',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
}

const logo = {
    margin: '0 auto',
}

const upperSection = {
    padding: '32px 48px',
}

const h1 = {
    color: '#111827',
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '32px',
    margin: '0 0 20px',
}

const mainText = {
    color: '#4b5563',
    fontSize: '16px',
    lineHeight: '26px',
    margin: '0 0 20px',
}

const buttonContainer = {
    textAlign: 'center' as const,
    marginTop: '32px',
}

const button = {
    backgroundColor: '#dc2626',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
}

const hr = {
    borderColor: '#e5e7eb',
    margin: '0',
}

const lowerSection = {
    padding: '24px 48px',
    backgroundColor: '#f9fafb',
}

const footerText = {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '24px',
    margin: '0',
}
