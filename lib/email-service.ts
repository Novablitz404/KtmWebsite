import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
    to,
    subject,
    reactData,
}: {
    to: string
    subject: string
    reactData: React.ReactElement
}) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is not defined. Skipping email send.')
        return { error: 'RESEND_API_KEY missing' }
    }

    try {
        const data = await resend.emails.send({
            from: 'KTM Sports <noreply@ktmsports.com>',
            to: [to],
            subject: subject,
            react: reactData,
        })

        return { data }
    } catch (error: any) {
        console.error('Error sending email:', error)
        return { error: error.message }
    }
}
