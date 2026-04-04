import axios from 'axios';
import crypto from 'crypto';

// URL Analytics dari APK Analysis
const SA_URL = 'https://sc-sa.dramaboxdb.com/sa';

const DEVICE_ID = '9774d56d682e549c';

// Payload standar Sensors Analytics
const PAYLOAD = {
    distinct_id: DEVICE_ID,
    lib: {
        $lib: 'Android',
        $lib_version: '3.1.2',
        $lib_method: 'code'
    },
    properties: {
        $os: 'Android',
        $screen_width: 1080,
        $screen_height: 1920,
        $model: 'Pixel 4',
        $manufacturer: 'Google',
        $app_version: '1.6.0'
    },
    type: 'track',
    event: '$AppStart', // Event pura-pura baru buka app
    time: Date.now()
};

async function testAnalytics() {
    console.log('📡 Pinging Sensors Analytics to register device...');

    // SA biasanya butuh data dikirim sebagai form-data atau query param 'data'
    // Format: data=BASE64_ENCODED_JSON

    const jsonString = JSON.stringify(PAYLOAD);
    const base64Data = Buffer.from(jsonString).toString('base64');

    const url = `${SA_URL}?data=${encodeURIComponent(base64Data)}`;

    console.log(`🔗 ${url.substring(0, 100)}...`);

    try {
        const res = await axios.get(url);
        console.log(`📊 SA Response: ${res.status}`);
        console.log(`📦 Data:`, res.data);

        if (res.status === 200) {
            console.log('✅ Analytics sent! Device ID might be registered now.');
        }
    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
        if (e.response) console.log(e.response.data);
    }
}

testAnalytics();
