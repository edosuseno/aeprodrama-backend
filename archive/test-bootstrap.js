import signatureGenerator from './src/utils/SignatureGenerator.js';
import axios from 'axios';
import crypto from 'crypto';

console.log('🚀 TESTING BOOTSTRAP WITH OBFUSCATED HEADERS\n');

// Device Info
const DEVICE_ID = signatureGenerator.deviceId;

// Target URL
const BASE_URL = 'https://sapi.dramaboxdb.com/drama-box';
const BOOTSTRAP_PATH = '/ap001/bootstrap';

const PAYLOAD = {
    distinctId: DEVICE_ID
};

async function testBootstrap() {
    const url = `${BASE_URL}${BOOTSTRAP_PATH}`;
    const bodyString = JSON.stringify(PAYLOAD);

    // VARIATION 1: Standard
    await tryRequest('Standard', url, bodyString, {});

    // VARIATION 2: Obfuscated Platform
    await tryRequest('Obfuscated Platform', url, bodyString, {
        'p': 'OFIfyPR'
    });

    // VARIATION 3: Lowercase Pline
    await tryRequest('Lowercase Pline', url, bodyString, {
        'pline': 'android'
    });

    // VARIATION 4: Short Pline
    await tryRequest('Short Pline', url, bodyString, {
        'pline': 'af'
    });
}

async function tryRequest(name, url, bodyString, extraHeaders) {
    const { headers, query } = signatureGenerator.getHeaders(bodyString);

    // Merge headers
    const finalHeaders = { ...headers, ...extraHeaders, 'x-startup': '1' };
    const finalUrl = `${url}?timestamp=${query.timestamp}`;

    console.log(`📡 Try: ${name}`);

    try {
        const res = await axios.post(finalUrl, JSON.parse(bodyString), {
            headers: finalHeaders,
            timeout: 10000,
            validateStatus: () => true
        });

        console.log(`📊 Status: ${res.data.status} - ${res.data.message}`);

        if (res.data.status === 0 || res.data.success === true) {
            console.log('🎉🎉 SUKSES!');
            console.log(JSON.stringify(res.data, null, 2));
            process.exit(0);
        }
    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    }
    console.log('---');
    await new Promise(r => setTimeout(r, 1000));
}

testBootstrap();
