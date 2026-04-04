import axios from 'axios';

const URL_SEARCH = 'https://sapi.dramaboxdb.com/drama-box/search/index';

const HEADERS = {
    'device-id': 'ffffffffd2d40675ffffffffca3d9e03',
    'android-id': 'd2d40675ca3d9e03',
    'vn': '3.1.2',
    'version': '312',
    'package-name': 'com.storymatrix.drama',
    'pline': 'ANDROID',
    'Content-Type': 'application/json; charset=UTF-8'
};

async function testZeroBody() {
    console.log('🚀 TESTING SEARCH INDEX WITH ZERO BODY (0 bytes)...');

    try {
        // Mengirim null atau undefined biasanya membuat axios tidak mengirim body
        const res = await axios.post(URL_SEARCH, null, {
            headers: HEADERS,
            params: { timestamp: Date.now().toString() },
            validateStatus: () => true
        });

        console.log('\n📡 RESPONSE:');
        console.log(`Status: ${res.status}`);
        console.log('Body:', JSON.stringify(res.data, null, 2));

    } catch (e) {
        console.error('\n❌ ERROR:', e.message);
    }
}

testZeroBody();
