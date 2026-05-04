import * as React from 'react'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.wotf-global.com'

interface VerifyOTPEmailProps {
    code: string
    name?: string
}

export default function VerifyOTPEmail({ code, name }: VerifyOTPEmailProps) {
    return (
        <div style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            maxWidth: '480px',
            margin: '0 auto',
            backgroundColor: '#000000',
            color: '#ffffff',
            padding: '0',
        }}>
            {/* Header */}
            <div style={{
                textAlign: 'center' as const,
                padding: '40px 32px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
                <img
                    src={`${appUrl}/wotf-global/Wotf_logo_Final.png`}
                    alt="WOTF"
                    width={72}
                    height={72}
                    style={{ margin: '0 auto 16px', display: 'block' }}
                />
                <h1 style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    letterSpacing: '2px',
                    textTransform: 'uppercase' as const,
                    margin: 0,
                    color: '#ffffff',
                }}>
                    Verify Your Email
                </h1>
            </div>

            {/* Body */}
            <div style={{ padding: '32px' }}>
                <p style={{
                    color: '#9ca3af',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    margin: '0 0 24px',
                }}>
                    {name ? `Hi ${name}, ` : ''}Enter this verification code to complete your registration:
                </p>

                {/* OTP Code */}
                <div style={{
                    textAlign: 'center' as const,
                    padding: '24px',
                    backgroundColor: '#0A0A0A',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    marginBottom: '24px',
                }}>
                    <div style={{
                        fontSize: '36px',
                        fontWeight: 800,
                        letterSpacing: '12px',
                        color: '#ffffff',
                        fontFamily: 'monospace',
                    }}>
                        {code}
                    </div>
                </div>

                <p style={{
                    color: '#6b7280',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    margin: '0 0 8px',
                }}>
                    This code expires in <strong style={{ color: '#9ca3af' }}>10 minutes</strong>.
                </p>
                <p style={{
                    color: '#6b7280',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    margin: 0,
                }}>
                    If you did not request this, you can safely ignore this email.
                </p>
            </div>

            {/* Footer */}
            <div style={{
                textAlign: 'center' as const,
                padding: '24px 32px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
            }}>
                {/* Olympic dots */}
                <div style={{ marginBottom: '12px' }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#0085C7', margin: '0 3px' }} />
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#F4C300', margin: '0 3px' }} />
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ffffff', margin: '0 3px' }} />
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#009F3D', margin: '0 3px' }} />
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#DF0024', margin: '0 3px' }} />
                </div>
                <p style={{
                    color: '#4b5563',
                    fontSize: '11px',
                    margin: 0,
                }}>
                    World Olympic Taekwondo Federation
                </p>
            </div>
        </div>
    )
}
