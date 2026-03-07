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

interface InviteEmailProps {
    roleName: string;
    organizationName: string;
    inviterName?: string;
    inviteLink: string;
}

export const InviteEmail = ({
    roleName,
    organizationName,
    inviterName,
    inviteLink,
}: InviteEmailProps) => {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Header Image (Optional, default WOTF logo or org banner) */}
                    <Section style={headerSection}>
                        <Img
                            src="https://www.wotf-ph.com/wotf/logo_image.png"
                            width="60"
                            alt="WOTF Logo"
                            style={logo}
                        />
                        <Img
                            src="https://www.wotf-ph.com/wotf/wotf_logo_word.png"
                            width="160"
                            alt="WOTF Philippines"
                            style={{ margin: '12px auto 0' }}
                        />
                    </Section>

                    {/* Main Content */}
                    <Section style={contentSection}>
                        <Heading style={h1}>
                            You've been invited to join the team!
                        </Heading>
                        <Text style={text}>
                            Hello,
                        </Text>
                        <Text style={text}>
                            {inviterName ? `${inviterName} has` : 'You have been'} invited you to become a{' '}
                            <strong>{roleName}</strong> for <strong>{organizationName}</strong>.
                        </Text>

                        <Text style={text}>
                            As a {roleName}, you will have access to manage and oversee operations within the platform. Click the button below to accept your invitation and set up your account.
                        </Text>

                        <Section style={buttonContainer}>
                            <Button style={button} href={inviteLink}>
                                Accept Invitation
                            </Button>
                        </Section>

                        <Text style={subtext}>
                            If you did not expect this invitation, you can safely ignore this email. The link will expire in 7 days.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} WOTF Philippines. All rights reserved.
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
    backgroundColor: '#f8fafc',
    textAlign: 'center' as const,
    borderBottom: '1px solid #eee',
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
    backgroundColor: '#0f172a',
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

export default InviteEmail;
