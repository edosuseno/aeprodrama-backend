import axios from 'axios';

console.log('='.repeat(60));
console.log('🕵️  DEEP DIVE MEGAWE API');
console.log('='.repeat(60));
console.log('');

const BASE_URL = 'https://api.megawe.net/api';

// Kita coba cari drama dulu buat dapat ID valid
async function runDeepTest() {
    let bookId = '42000003970'; // Default valid ID

    // 1. Search
    console.log('1. Testing Search (to get valid ID)...');
    try {
        const searchRes = await axios.get(`${BASE_URL}/dramabox/search`, { params: { query: 'boss' } });
        if (searchRes.data.success && searchRes.data.data.length > 0) {
            const item = searchRes.data.data[0];
            bookId = item.bookId;
            console.log(`   ✅ Found drama: ${item.bookName} (ID: ${bookId})`);
        } else {
            console.log('   Warning: Search returned no results, using default ID.');
        }
    } catch (e) {
        console.log(`   ❌ Search Failed: ${e.message}`);
    }

    console.log(`\nUsing Book ID: ${bookId}\n`);

    // 2. Guessing Detail Endpoints
    const detailPaths = [
        `/dramabox/detail/${bookId}`,
        `/dramabox/book/${bookId}`,
        `/dramabox/detail?id=${bookId}`,
        `/dramabox/detail?bookId=${bookId}`
    ];

    console.log('2. Hunt for Detail Endpoint...');
    for (const path of detailPaths) {
        await tryEndpoint(path);
    }

    // 3. Hunt for Episode List (EXTENDED)
    const epPaths = [
        // GET Query Param
        `/dramabox/chapters?bookId=${bookId}`,
        `/dramabox/chapter?bookId=${bookId}`,
        `/dramabox/list?bookId=${bookId}`,
        `/dramabox/episode-list?bookId=${bookId}`,
        `/dramabox/chapter-list?bookId=${bookId}`,
        // URL Param
        `/dramabox/chapters/${bookId}`,
        `/dramabox/list/${bookId}`,
        // Original paths for checking
        `/dramabox/episode?bookId=${bookId}&size=50`,
        `/dramabox/episode/${bookId}`
    ];

    console.log('\n3. Hunt for Episode List (Extended)...');

    // Test GET
    for (const path of epPaths) {
        await tryEndpoint(path);
    }

    // Test POST (Common for lists)
    console.log('\n4. Testing POST methods...');
    const postPaths = [
        '/dramabox/chapter/list',
        '/dramabox/episode',
        '/dramabox/episodes',
        '/dramabox/list'
    ];

    for (const path of postPaths) {
        process.stdout.write(`   POST ${path} ... `);
        try {
            const res = await axios.post(`${BASE_URL}${path}`, { bookId: bookId });
            if (res.status === 200) {
                console.log('✅ 200 OK');
                let data = res.data.data || res.data;
                if (Array.isArray(data) && data.length > 0) {
                    console.log(`      🔥 FOUND DATA! Keys: ${Object.keys(data[0]).join(', ')}`);
                } else {
                    console.log(`      -> Response: ${JSON.stringify(res.data).substring(0, 100)}`);
                }
            }
        } catch (e) {
            if (e.response) process.stdout.write(`❌ ${e.response.status}\n`);
            else process.stdout.write(`❌ Error\n`);
        }
    }
}

async function tryEndpoint(path) {
    process.stdout.write(`   Testing ${path} ... `);
    try {
        const res = await axios.get(`${BASE_URL}${path}`, { timeout: 10000 });
        if (res.status === 200) {
            console.log('✅ 200 OK');

            // Cek isi data
            let data = res.data;
            if (data.data) data = data.data; // unwrap

            if (Array.isArray(data)) {
                console.log(`      -> Is Array! Length: ${data.length}`);
                if (data.length > 0) {
                    console.log(`      -> Sample Item Keys: ${Object.keys(data[0]).join(', ')}`);
                    // Cek Video URL
                    const item = data[0];
                    if (item.videoUrl || item.url || item.videoPath) {
                        console.log(`      🔥 VIDEO URL FOUND: ${item.videoUrl || item.url || item.videoPath}`);
                    }
                }
            } else if (typeof data === 'object') {
                console.log(`      -> Is Object. Keys: ${Object.keys(data).join(', ')}`);
            } else {
                console.log(`      -> Type: ${typeof data}`);
            }
        } else {
            console.log(`Status ${res.status}`);
        }
    } catch (e) {
        if (e.response) {
            console.log(`❌ ${e.response.status}`);
        } else {
            console.log(`❌ ${e.message}`);
        }
    }
}

runDeepTest();
