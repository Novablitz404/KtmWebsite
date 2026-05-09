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

interface OrgPasswordResetEmailProps {
    userName: string;
    temporaryPassword: string;
    organizationName: string;
    organizationLogoUrl?: string | null;
}

export const OrgPasswordResetEmail = ({
    userName,
    temporaryPassword,
    organizationName,
    organizationLogoUrl,
}: OrgPasswordResetEmailProps) => {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    {/* Header */}
                    <Section style={headerSection}>
                        {organizationLogoUrl ? (
                            <Img
                                src={organizationLogoUrl}
                                width="70"
                                alt={organizationName}
                                style={logo}
                            />
                        ) : (
                            <Text style={orgNameFallback}>{organizationName}</Text>
                        )}
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
                            Your organization administrator at <strong>{organizationName}</strong> has reset your account password. Please use the temporary password below to log in.
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
                            If you did not expect this password reset, please contact your organization administrator immediately.
                        </Text>
                    </Section>

                    <Hr style={hr} />

                    {/* Footer */}
                    <Section style={footer}>
                        <Text style={footerText}>
                            © {new Date().getFullYear()} {organizationName}. All rights reserved.
                        </Text>
                        <Text style={{ ...footerText, margin: '0' }}>
                            Powered by
                        </Text>
                        <Img
                            src="https://www.wo-tf.com/ktmnav.png"
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
    backgroundColor: '#111827',
    textAlign: 'center' as const,
    borderBottom: '1px solid #1e293b',
};

const logo = {
    margin: '0 auto',
    borderRadius: '8px',
};

const orgNameFallback = {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '800',
    margin: '0',
    textAlign: 'center' as const,
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
    backgroundColor: '#f8fafc',
    border: '2px dashed #e2e8f0',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center' as const,
    margin: '24px 0',
};

const passwordLabel = {
    color: '#6b7280',
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
};

const footerText = {
    color: '#9ca3af',
    fontSize: '12px',
    lineHeight: '16px',
    margin: '0 0 8px',
    textAlign: 'center' as const,
};

export default OrgPasswordResetEmail;
