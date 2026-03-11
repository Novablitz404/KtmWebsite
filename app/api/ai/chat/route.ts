import { GoogleGenerativeAI } from '@google/generative-ai'
import { NextRequest, NextResponse } from 'next/server'
import { PLATFORM_SYSTEM_PROMPT } from '@/lib/ai/system-prompt'
import { getPlatformStats } from '@/lib/ai/platform-stats'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(req: NextRequest) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'AI assistant not configured' }, { status: 500 })
        }

        const { messages } = await req.json()

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Messages required' }, { status: 400 })
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

        // Fetch live platform data
        const stats = await getPlatformStats()

        let liveDataPrompt = ''
        if (stats) {
            liveDataPrompt = `

## Live Platform Data (as of today)
- Total affiliated clubs: ${stats.clubCount}
- Total registered athletes: ${stats.athleteCount}
- Total tournaments created: ${stats.tournamentCount}
- Total seminars created: ${stats.seminarCount}
- Total promotion/belt tests created: ${stats.promotionCount}

### Affiliated Club Names
${stats.clubNames.map((n: string) => `- ${n}`).join('\n')}

### Upcoming Tournaments
${stats.upcomingTournaments.length > 0 ? stats.upcomingTournaments.map((t: { name: string; date: string }) => `- ${t.name} (${t.date})`).join('\n') : 'No upcoming tournaments'}

### Upcoming Seminars
${stats.upcomingSeminars.length > 0 ? stats.upcomingSeminars.map((s: { name: string; date: string }) => `- ${s.name} (${s.date})`).join('\n') : 'No upcoming seminars'}

### Upcoming Belt Tests
${stats.upcomingPromotions.length > 0 ? stats.upcomingPromotions.map((p: { name: string; date: string }) => `- ${p.name} (${p.date})`).join('\n') : 'No upcoming belt tests'}

Use this real data when answering questions about platform statistics, club counts, upcoming events, etc.
`
        }

        const fullPrompt = PLATFORM_SYSTEM_PROMPT + liveDataPrompt

        // Build conversation history for Gemini
        const history = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }))

        const chat = model.startChat({
            history,
            systemInstruction: {
                role: 'user',
                parts: [{ text: fullPrompt }],
            },
        })

        const lastMessage = messages[messages.length - 1].content

        // Stream the response
        const result = await chat.sendMessageStream(lastMessage)

        // Create a ReadableStream for streaming response
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const text = chunk.text()
                        if (text) {
                            controller.enqueue(new TextEncoder().encode(text))
                        }
                    }
                    controller.close()
                } catch (error) {
                    controller.error(error)
                }
            },
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
            },
        })
    } catch (error: any) {
        console.error('AI Chat Error:', error)

        // Handle rate limit errors gracefully
        if (error?.status === 429 || error?.message?.includes('429')) {
            return NextResponse.json(
                { error: 'The AI assistant is temporarily busy. Please wait a few seconds and try again.' },
                { status: 429 }
            )
        }

        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        )
    }
}
