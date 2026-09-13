import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Text,
    Button,
    Img,
    Heading,
    Hr,
} from '@react-email/components';

interface TournamentGssDecisionEmailProps {
    organizerName: string;
    tournamentName: string;
    decision: 'APPROVED' | 'REJECTED';
    tournamentLink: string;
}

export const TournamentGssDecisionEmail = ({
    organizerName,
    tournamentName,
    decision,
    tournamentLink,
}: TournamentGssDecisionEmailProps) => {
    const isApproved = decision === 'APPROVED';

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
                            {isApproved ? 'GSS Sanctioning Approved ✅' : 'GSS Sanctioning Not Approved'}
                        </Heading>
                        <Text style={text}>
                            Hello {organizerName},
                        </Text>
                        {isApproved ? (
                            <Text style={text}>
                                Your tournament <strong>{tournamentName}</strong> has been approved by KTM as a GSS-sanctioned event.
                                Results from this tournament will now count toward the official Global Skill Score rankings.
                            </Text>
                        ) : (
                            <Text style={text}>
                                Your tournament <strong>{tournamentName}</strong> was not approved by KTM for GSS sanctioning.
                                The tournament and its brackets are unaffected — results simply won&apos;t be counted toward the
                                Global Skill Score rankings.
                            </Text>
                        )}

                        <Section style={buttonContainer}>
                            <Button style={button} href={tournamentLink}>
                                View Tournament
                            </Button>
                        </Section>

                        <Text style={subtext}>
                            Questions about this decision? Reach out to KTM support.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} Elite Taekwondo Association of the Philippines. All rights reserved.
                        </Text>
                        <Text style={{ ...footerText, margin: '0' }}>
                            Powered by
                        </Text>
                        <Img
                            src="https://www.tap-elite.com/ktmnav.png"
                            width="50"
                            alt="KTM"
                            style={{ margin: '4px auto 0', opacity: 0.5 }}
                        />
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
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '32px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
};

const text = {
    color: '#374151',
    fontSize: '16px',
    lineHeight: '24px',
    margin: '0 0 20px',
};

const buttonContainer = {
    textAlign: 'center' as const,
    margin: '32px 0',
};

const button = {
    backgroundColor: '#E10600',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 32px',
};

const subtext = {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0',
    textAlign: 'center' as const,
};

const hr = {
    borderColor: '#e5e7eb',
    margin: '0',
};

const footer = {
    padding: '24px 40px',
    backgroundColor: '#fafafa',
};

const footerText = {
    color: '#9ca3af',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '0 0 8px',
    textAlign: 'center' as const,
};

export default TournamentGssDecisionEmail;
