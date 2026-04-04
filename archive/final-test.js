import axios from 'axios';

async function testWebAPI() {
    console.log(`\n🌐 TESTING WEB API...`);

    try {
        // Coba endpoint rank ala web
        const res = await axios.post(`https://www.dramaboxapp.com/drama-box/he001/rank`, {
            "rankType": 3
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'p': 'web' // Seringkali API backend sama, cuma p-nya ganti
            },
            validateStatus: () => true
        });

        console.log('STATUS:', res.status);
        console.log('DATA:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('FAIL:', e.message);
    }
}

testWebAPI();
