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
    organizationName: string
    promotionTestName?: string
    emailBannerUrl?: string | null
    dashboardUrl: string
}

// Map standard belt names to formal Gup/Dan ranks
const getFormalBeltRank = (belt: string) => {
    switch (belt.toLowerCase()) {
        case 'white': return '9th Gup - White Belt'
        case 'yellow': return '8th Gup - Yellow Belt'
        case 'orange': return '7th Gup - Orange Belt'
        case 'green': return '6th Gup - Green Belt'
        case 'purple': return '5th Gup - Purple Belt'
        case 'blue': return '4th Gup - Blue Belt'
        case 'red': return '3rd Gup - Red Belt'
        case 'maroon': return '2nd Gup - Maroon Belt'
        case 'brown': return '1st Gup - Brown Belt'
        case 'black': return '1st Dan - Black Belt'
        default: return `${belt} Belt`
    }
}

export const PromotionPassedEmail = ({
    athleteName = 'Athlete',
    beltName = 'Black',
    clubName = 'Your Club',
    organizationName = 'Elite Taekwondo Association of the Philippines',
    promotionTestName = 'Promotion Test',
    emailBannerUrl = null,
    dashboardUrl = 'https://www.tap-elite.com/athlete',
}: PromotionPassedEmailProps) => {
    const formalRank = getFormalBeltRank(beltName)

    return (
        <Html>
            <Head />
            <Preview>Congratulations on your promotion to {formalRank}!</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={coverSection}>
                        {emailBannerUrl ? (
                            <Section style={bannerSection}>
                                <Img
                                    src={emailBannerUrl}
                                    width="100%"
                                    height="auto"
                                    alt="Organization Banner"
                                    style={bannerImage}
                                />
                            </Section>
                        ) : (
                            <Section style={imageSection}>
                                <Img
                                    src="https://www.tap-elite.com/tap-elite/tap_elite_horizontal_transparent.png"
                                    width="200"
                                    alt="Tap Elite"
                                    style={logo}
                                />
                            </Section>
                        )}
                        <Section style={upperSection}>
                            <Heading style={h1}>Dear {athleteName},</Heading>
                            <Heading style={h2}>Congratulations!</Heading>

                            <Text style={mainText}>
                                On behalf of the {organizationName}, we are pleased to inform you that you have successfully met the requirements of the {promotionTestName}.
                            </Text>

                            <Text style={mainText}>
                                Your technical skill, discipline, and commitment to the tenets of Taekwondo were clearly demonstrated during your evaluation. As a result, the Federation officially recognizes your promotion to the rank of <strong>{formalRank}</strong>.
                            </Text>

                            <Text style={mainText}>
                                While your daily training continues at {clubName}, this promotion is a testament to your growth within the national standards of our organization. We take great pride in seeing practitioners like you elevate the spirit of the sport in the Philippines.
                            </Text>

                            <Heading style={h3}>Next Steps:</Heading>
                            <Text style={mainText}>
                                <strong>Official Recognition:</strong> Your new rank has been recorded in the Federation’s database.<br />
                                <strong>Certificate & Belt:</strong> Your official {organizationName} certification and new belt will be issued through your head instructor.
                            </Text>

                            <Text style={mainText}>
                                Continue to train with an indomitable spirit. We look forward to seeing your progress toward your next milestone.
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
                                Kicking goals and breaking barriers,
                                <br /><br />
                                <strong>The Board of Examiners</strong><br />
                                {organizationName}
                            </Text>
                            <Hr style={hr} />
                            <Text style={{ ...footerText, fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: '16px 0 0' }}>
                                © {new Date().getFullYear()} Elite Taekwondo Association of the Philippines. All rights reserved.
                            </Text>
                            <Text style={{ fontSize: '11px', color: '#d1d5db', textAlign: 'center' as const, margin: '6px 0 2px' }}>
                                Powered by
                            </Text>
                            <Img
                                src="https://www.tap-elite.com/ktmnav.png"
                                width="50"
                                alt="KTM"
                                style={{ margin: '0 auto', opacity: 0.5 }}
                            />
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

const bannerSection = {
    backgroundColor: '#ffffff', // Generic background in case of transparency
    width: '100%',
    display: 'block',
}

const bannerImage = {
    width: '100%',
    objectFit: 'cover' as const,
    display: 'block',
}

const imageSection = {
    backgroundColor: '#000000',
    padding: '30px 0',
    textAlign: 'center' as const,
    borderBottom: '2px solid #E10600',
}

const logo = {
    margin: '0 auto',
}

const upperSection = {
    padding: '32px 48px',
}

const h1 = {
    color: '#111827',
    fontSize: '20px',
    fontWeight: '700',
    lineHeight: '28px',
    margin: '0 0 16px',
}

const h2 = {
    color: '#E10600',
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '32px',
    margin: '0 0 20px',
}

const h3 = {
    color: '#111827',
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '26px',
    margin: '24px 0 12px',
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
    backgroundColor: '#E10600',
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
    color: '#4b5563',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0',
}
