
import axios from 'axios';

async function diagnose() {
    const baseUrl = 'https://vidrama.asia';
    const actionId = '406d8e0caefc77495a4c251c1367b17ccf461cb2d9';
    const payload = ['recommend'];

    const tests = [
        { name: 'POST to /provider/shortmax', url: `${baseUrl}/provider/shortmax` },
        { name: 'POST to root /', url: `${baseUrl}/` },
        { name: 'GET to /provider/shortmax', url: `${baseUrl}/provider/shortmax`, method: 'GET' }
    ];

    console.log('--- DIAGNOSA SHORTMAX (VIDRAMA) ---');

    for (const test of tests) {
        try {
            console.log(`\nTesting ${test.name}...`);
            const config = {
                method: test.method || 'POST',
                url: test.url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/x-component',
                    'Content-Type': 'text/plain;charset=UTF-8',
                    'Next-Action': actionId,
                    'Next-Router-State-Tree': '%5Bnull%2Cnull%2Cnull%2Cnull%5D',
                    'Origin': baseUrl,
                    'Referer': `${baseUrl}/provider/shortmax`
                },
                timeout: 5000
            };
            
            if (config.method === 'POST') config.data = JSON.stringify(payload);

            const res = await axios(config);
            console.log(`✅ ${test.name} SUCCESS (Status: ${res.status})`);
            console.log(`Data Preview: ${String(res.data).substring(0, 100)}...`);
        } catch (e) {
            console.log(`❌ ${test.name} FAILED: ${e.response?.status || e.message}`);
        }
    }
}

diagnose();
