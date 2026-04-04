import DramaboxServiceSimple from './src/services/DramaboxServiceSimple.js';
import axios from 'axios';

console.log('='.repeat(60));
console.log('TESTING DIRECT DRAMABOX OFFICIAL API');
console.log('='.repeat(60));
console.log('');

// Possible Dramabox API endpoints
const possibleAPIs = [
    'https://www.dramabox.com/api',
    'https://api.dramabox.com',
    'https://m.dramabox.com/api',
    'https://app.dramabox.com/api',
    'https://dramabox.com/drama-api',
    'https://h5.dramabox.com/api'
];

async function testDramaboxDirect() {
    console.log('Testing possible Dramabox API endpoints...\n');

    for (const baseUrl of possibleAPIs) {
        console.log(`Testing: ${baseUrl}`);
        try {
            // Try common endpoints
            const endpoints = ['/foryou', '/list', '/recommend', '/hot', '/drama/list'];

            for (const endpoint of endpoints) {
                try {
                    const response = await axios.get(`${baseUrl}${endpoint}`, {
                        timeout: 5000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/json'
                        }
                    });

                    console.log(`  ✓ ${endpoint} → SUCCESS (${response.status})`);
                    console.log(`    Response type: ${typeof response.data}`);
                    if (response.data) {
                        console.log(`    Keys: ${Object.keys(response.data).slice(0, 5).join(', ')}...`);
                    }
                    return { baseUrl, endpoint, data: response.data };
                } catch (error) {
                    // Silent fail, try next
                }
            }
            console.log(`  ✗ No working endpoints found`);
        } catch (error) {
            console.log(`  ✗ Failed: ${error.message}`);
        }
        console.log('');
    }

    console.log('='.repeat(60));
    console.log('Trying GraphQL approach...\n');

    // Try GraphQL endpoint
    try {
        const response = await axios.post('https://www.dramabox.com/graphql', {
            query: `{ dramas { id title } }`
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 5000
        });

        console.log('✓ GraphQL endpoint found!');
        console.log(`Response:`, JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('✗ GraphQL failed:', error.message);
    }
}

async function inspectSansekaiResponse() {
    console.log('\n' + '='.repeat(60));
    console.log('INSPECTING SANSEKAI RESPONSE HEADERS');
    console.log('='.repeat(60));
    console.log('');

    try {
        const response = await axios.get('https://api.sansekai.my.id/api/dramabox/foryou', {
            validateStatus: () => true
        });

        console.log('Response Headers:');
        Object.entries(response.headers).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });

        // Check if headers reveal upstream API
        const serverHeader = response.headers['server'];
        const viaHeader = response.headers['via'];
        const xForwardedFor = response.headers['x-forwarded-for'];

        console.log('\nUpstream Clues:');
        console.log(`  Server: ${serverHeader || 'none'}`);
        console.log(`  Via: ${viaHeader || 'none'}`);
        console.log(`  X-Forwarded-For: ${xForwardedFor || 'none'}`);

    } catch (error) {
        console.log('Error:', error.message);
    }
}

async function main() {
    await testDramaboxDirect();
    await inspectSansekaiResponse();

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
}

main().catch(console.error);
