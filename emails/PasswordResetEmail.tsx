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

interface PasswordResetEmailProps {
    userName: string;
    temporaryPassword: string;
}

export const PasswordResetEmail = ({
    userName,
    temporaryPassword,
}: PasswordResetEmailProps) => {
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
                            Your password has been reset
                        </Heading>
                        <Text style={text}>
                            Hi {userName || 'there'},
                        </Text>
                        <Text style={text}>
                            An administrator has reset your password. Please use the temporary password below to log in to your account.
                        </Text>

                        {/* Password Box */}
                        <Section style={passwordBox}>
                            <Text style={passwordLabel}>Temporary Password</Text>
                            <Text style={passwordValue}>{temporaryPassword}</Text>
                        </Section>

                        <Text style={text}>
                            When you log in with this password, you will be prompted to either keep it or set your own new password.
                        </Text>

                        <Text style={subtext}>
                            If you did not expect this password reset, please contact your administrator immediately.
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

const passwordBox = {
    backgroundColor: '#FFF5F5',
    border: '2px dashed #E10600',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    margin: '24px 0',
};

const passwordLabel = {
    color: '#E10600',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    margin: '0 0 8px',
};

const passwordValue = {
    color: '#111827',
    fontSize: '28px',
    fontWeight: '800',
    fontFamily: '"SF Mono",SFMono-Regular,Menlo,Consolas,monospace',
    letterSpacing: '3px',
    margin: '0',
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

export default PasswordResetEmail;
