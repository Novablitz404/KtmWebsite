import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Link, Hr } from '@react-email/components';

interface SupportAdminAlertEmailProps {
    heading: string;
    fromName: string;
    fromEmail: string;
    subject: string;
    body: string;
    ticketUrl: string;
}

export const SupportAdminAlertEmail = ({
    heading,
    fromName,
    fromEmail,
    subject,
    body,
    ticketUrl,
}: SupportAdminAlertEmailProps) => {
    return (
        <Html>
            <Head />
            <Body style={main}>
                <Container style={container}>
                    <Text style={h1}>{heading}</Text>
                    <Text style={meta}>
                        From: <strong>{fromName}</strong> ({fromEmail})
                    </Text>
                    <Text style={meta}>
                        Subject: <strong>{subject}</strong>
                    </Text>
                    <Hr style={hr} />
                    <Text style={bodyText}>{body}</Text>
                    <Hr style={hr} />
                    <Link href={ticketUrl} style={link}>
                        Open in Admin Panel →
                    </Link>
                </Container>
            </Body>
        </Html>
    );
};

const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
    backgroundColor: '#ffffff',
    margin: '40px auto',
    padding: '32px',
    borderRadius: '12px',
    border: '1px solid #eee',
    maxWidth: '560px',
};

const h1 = {
    color: '#111827',
    fontSize: '18px',
    fontWeight: '700',
    margin: '0 0 16px',
};

const meta = {
    color: '#6b7280',
    fontSize: '13px',
    margin: '0 0 4px',
};

const bodyText = {
    color: '#374151',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0',
    whiteSpace: 'pre-wrap' as const,
};

const hr = {
    borderColor: '#e5e7eb',
    margin: '16px 0',
};

const link = {
    color: '#E10600',
    fontSize: '14px',
    fontWeight: '600',
};

export default SupportAdminAlertEmail;
