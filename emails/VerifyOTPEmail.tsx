import * as React from 'react'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.tap-elite.com'

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
                borderBottom: '2px solid #E10600',
            }}>
                <img
                    src={`${appUrl}/tap-elite/tap_elite_horizontal_transparent.png`}
                    alt="Tap Elite"
                    width={180}
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
                <p style={{ color: '#6b7280', fontSize: '10px', margin: '0 0 6px' }}>
                    Powered by
                </p>
                <img
                    src="https://www.tap-elite.com/ktmnav_white.png"
                    width={54}
                    alt="KTM Sports"
                    style={{ margin: '0 auto 12px', opacity: 0.6 }}
                />
                <p style={{
                    color: '#4b5563',
                    fontSize: '11px',
                    margin: 0,
                }}>
                    Elite Taekwondo Association of the Philippines
                </p>
            </div>
        </div>
    )
}
