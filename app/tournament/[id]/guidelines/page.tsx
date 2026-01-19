import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import GuidelinesView from './GuidelinesView'

// Placeholder Replacer Util
function replacePlaceholders(template: string, tournament: any) {
    let content = template
    content = content.replace(/{{Tournament Name}}/g, tournament.name)
    content = content.replace(/{{Date}}/g, new Date(tournament.startDate).toLocaleDateString())
    content = content.replace(/{{Venue}}/g, tournament.venue || 'TBA')
    // Add more as needed
    return content
}

export default async function GuidelinesPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
            guidelineTemplate: true
        }
    })

    if (!tournament || !tournament.guidelineTemplate || !tournament.guidelineTemplate.content) {
        return notFound()
    }

    const content = replacePlaceholders(tournament.guidelineTemplate.content, tournament)

    return <GuidelinesView tournament={tournament} content={content} />
}
