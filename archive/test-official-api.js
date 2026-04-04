import axios from 'axios';

console.log('='.repeat(60));
console.log('BRUTE-FORCING DRAMABOX OFFICIAL API');
console.log('Target: https://sapi.dramaboxdb.com');
console.log('='.repeat(60));
console.log('');

const BASE_URL = 'https://sapi.dramaboxdb.com';
const TARGET_ENDPOINT = '/drama-box/chapter/list';
const BOOK_ID = '42000003970';

// Common User Agent
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.dramabox.com',
    'Referer': 'https://www.dramabox.com/'
};

async function testParameters() {
    console.log(`\nTARGET LOCKED: ${TARGET_ENDPOINT}`);
    console.log('Brute-forcing parameters...\n');

    const variations = [
        { book_id: BOOK_ID },
        { bookId: BOOK_ID },
        { id: BOOK_ID },
        { bid: BOOK_ID },
        // With paging
        { book_id: BOOK_ID, page_num: 1, page_size: 20 },
        { bookId: BOOK_ID, pageNum: 1, pageSize: 20 },
        { book_id: BOOK_ID, page_index: 0, page_size: 20 },
        // With other potential fields
        { book_id: BOOK_ID, type: 1 },
        { book_id: BOOK_ID, sort: 'asc' },
        // Empty to see error structure
        {}
    ];

    for (const data of variations) {
        console.log(`Trying payload: ${JSON.stringify(data)}`);
        try {
            const res = await axios.post(`${BASE_URL}${TARGET_ENDPOINT}`, data, { headers: HEADERS });
            console.log(`  Response Code: ${res.data.status || res.data.code}`);
            console.log(`  Message: ${res.data.message || res.data.msg}`);

            if (res.data.data) {
                console.log('  🎯 JACKPOT!!! Data found!');
                if (Array.isArray(res.data.data)) {
                    console.log(`  Items count: ${res.data.data.length}`);
                } else {
                    console.log(`  Data keys: ${Object.keys(res.data.data).join(', ')}`);
                }
            }
        } catch (e) {
            console.log(`  Error: ${e.message}`);
            if (e.response) {
                console.log(`  Status: ${e.response.status}`);
            }
        }
        console.log('');
    }
}

testParameters();
