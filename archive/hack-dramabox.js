import axios from 'axios';
import crypto from 'crypto';

console.log('='.repeat(60));
console.log('⚔️  OPERATION: CRACK DRAMABOX API  ⚔️');
console.log('Target: https://sapi.dramaboxdb.com');
console.log('='.repeat(60));

const BASE_URL = 'https://sapi.dramaboxdb.com';
const BOOK_ID = '42000003970';

// Random Device ID generator
const generateDeviceId = () => crypto.randomUUID();
const DEVICE_ID = generateDeviceId();
const TIMESTAMP = Date.now();

// Common Endpoints
const ENDPOINTS = [
    '/drama-box/box/book/chapter/list',
    '/drama-box/chapter/list',
    '/drama-box/box/chapter/list'
];

// Common Headers mimicking Real Browser
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Origin': 'https://www.dramabox.com',
    'Referer': 'https://www.dramabox.com/',
    'Accept': 'application/json, text/plain, */*',
    'x-requested-with': 'XMLHttpRequest'
};

// Parameter Variations to Try
const PAYLOAD_TEMPLATES = [
    // Simple
    { book_id: BOOK_ID },
    { bookId: BOOK_ID },
    { id: BOOK_ID },

    // With Paging
    { book_id: BOOK_ID, page_num: 1, page_size: 100 },
    { bookId: BOOK_ID, pageNum: 1, pageSize: 100 },

    // With Context info
    { book_id: BOOK_ID, platform: 'h5' },
    { book_id: BOOK_ID, platform: 'web' },
    { book_id: BOOK_ID, device_id: DEVICE_ID },

    // Complex Structure (Common in Chinese Apps)
    { data: { book_id: BOOK_ID } },
    { query: { book_id: BOOK_ID } },

    // camelCase combos
    { bookId: BOOK_ID, pageIndex: 0, pageSize: 20 },

    // app specific
    { book_id: BOOK_ID, items_per_page: 20, page: 1 },

    // Empty to provoke error message leak
    {}
];

async function attack() {
    console.log(`Device ID: ${DEVICE_ID}`);

    for (const endpoint of ENDPOINTS) {
        console.log(`\n🎯 Attacking Endpoint: ${endpoint}`);

        for (const payload of PAYLOAD_TEMPLATES) {
            // Add Timestamp to some
            const payloadWithTime = { ...payload, timestamp: TIMESTAMP, _t: TIMESTAMP };

            // Try raw payload
            await fire(endpoint, payload);

            // Try with timestamp
            await fire(endpoint, payloadWithTime);
        }
    }
}

async function fire(endpoint, data) {
    try {
        const res = await axios.post(`${BASE_URL}${endpoint}`, data, { headers: HEADERS });

        const status = res.data.status || res.data.code;
        const msg = res.data.message || res.data.msg;

        // Filter out "Invalid Parameter" noise (usually code 1 or 400)
        if (msg && (msg.includes('非法') || msg.includes('Invalid') || msg.includes('Parameter'))) {
            process.stdout.write('.'); // Dot progress for failures
            return;
        }

        console.log(`\n🔥 HIT! Payload: ${JSON.stringify(data)}`);
        console.log(`   Response: ${JSON.stringify(res.data).substring(0, 200)}`);

        if (res.data.data) {
            console.log('   ✅ WE GOT DATA!');
            process.exit(0); // Stop immediately if found
        }

    } catch (e) {
        if (e.response && e.response.status === 404) {
            // endpoint not found, ignore
        } else {
            process.stdout.write('x');
        }
    }
}

attack().then(() => console.log('\n\nAttack Complete.'));
