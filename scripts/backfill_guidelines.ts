
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Backfilling guideline content...')

    const defaultContent = `
# Official Tournament Guidelines

## 1. General Rules
All competitors must adhere to the World Taekwondo Federation (WTF) rules.
Respect the referees, judges, and other competitors at all times.

## 2. Uniform (Dobok)
- All competitors must wear a clean, white WTF-approved dobok.
- Belts must correspond to the competitor's rank.
- Protective gear (mouthguard, groin guard, shin/arm guards) is mandatory for sparring.

## 3. Weigh-In
- Weigh-in will be conducted on the day before the match or the morning of the event.
- Competitors failing to make weight will be disqualified or moved to a higher weight class at the discretion of the organizer.

## 4. Disqualification
- Unsportsmanlike conduct.
- Excessive coaching disrupts the match.
- Failure to report to the court within 3 calls.

We wish all participants the best of luck!
- {{Tournament Name}} Organizing Committee
  `

    const updated = await prisma.guidelineTemplate.updateMany({
        where: {
            content: null
        },
        data: {
            content: defaultContent
        }
    })

    console.log(`Updated ${updated.count} templates with default content.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
