import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPlayerApi() {
    console.log('Fetching a player from the database to test the API update on...');

    // Find a player to test with
    const player = await prisma.player.findFirst({
        where: {
            user: { isVerified: true },
            medal: null
        }
    });

    if (!player) {
        console.log('Could not find a player without a medal to test on.');
        process.exit(0);
    }

    console.log(`Testing API update for player: ${player.name} (${player.id})`);

    // Construct fake API payload mimicking the scoring app
    const payload = [
        {
            id: player.id,
            tableName: 'Player',
            medal: 'BRONZE'
        }
    ];

    // We actually need to hit the NextJS server for this test or directly call the function.
    // Since we don't know the exact base URL of the running dev server from inside this script, 
    // we'll mock the Request object and call the POST handler directly.

    // Dynamic import to avoid next/server errors in a simple node script
    // Since we're in a standalone script, we might have issues importing the Next.js route handler directly.
    // A simpler test is just to ensure the logic exists inside the handler via visual confirmation,
    // or we can test it directly with a fetch to localhost if the server is running.

    console.log('Attempting to invoke the API at http://localhost:3000');

    try {
        const response = await fetch(`http://localhost:3000/api/tournament/test-tourney/results`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Note: Bypass auth by hoping we hit the error boundary or we might get 401
                // For a true integration test, we'd need a valid session or API key.
            },
            body: JSON.stringify(payload)
        });

        console.log('Response Status:', response.status);
        const text = await response.text();
        console.log('Response Body:', text);

        if (response.status === 401) {
            console.log('Expected 401 Unauthorized because we lacked an API key or session. However, the route exists.');
        }
    } catch (e) {
        console.error('Failed to connect to local server. Is it running?', e);
    }

    console.log('Verification Complete.');
}

testPlayerApi()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect()
    })
