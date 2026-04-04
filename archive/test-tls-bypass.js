import signatureGenerator from './src/utils/SignatureGenerator.js';
import axios from 'axios';
import https from 'https';
import crypto from 'crypto';

console.log('🚀 TESTING TLS FINGERPRINT MIMICRY (ANDROID 12)\n');

// Device Info (Samsung S21)
const DEVICE_ID = 'f7d2a8c3d4e5f6g7';

// Target
const URL = 'https://sapi.dramaboxdb.com/drama-box/ap001/bootstrap';

// ANDROID-LIKE CIPHERS
// Ini adalah daftar cipher suite yang biasa dikirim oleh OkHttp pada Android
const ANDROID_CIPHERS = [
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-RSA-AES128-SHA',
    'ECDHE-RSA-AES256-SHA',
    'AES128-GCM-SHA256',
    'AES256-GCM-SHA384',
    'AES128-SHA',
    'AES256-SHA'
].join(':');

// Custom Agent untuk meniru Android SSL Handshake
const agent = new https.Agent({
    ciphers: ANDROID_CIPHERS,
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    keepAlive: true
});

async function testTLS() {
    const body = {
        distinctId: DEVICE_ID,
        androidId: DEVICE_ID,
        brand: 'samsung',
        model: 'SM-G998B',
        os: 'Android',
        osVersion: '13',
        appVersion: '3.1.2'
    };

    const bodyString = JSON.stringify(body);
    const { headers, query } = signatureGenerator.getHeaders(bodyString);

    // Header Identity Override
    headers['device-id'] = DEVICE_ID;
    headers['android-id'] = DEVICE_ID;
    headers['User-Agent'] = 'Dalvik/2.1.0 (Linux; U; Android 13; SM-G998B Build/TP1A.220624.014)';
    headers['Connection'] = 'Keep-Alive';
    headers['Accept-Encoding'] = 'gzip' // Android biasanya gzip only

    const finalUrl = `${URL}?timestamp=${query.timestamp}`;

    console.log(`📡 Sending Request with Android TLS Ciphers...`);

    try {
        const res = await axios.post(finalUrl, body, {
            headers,
            httpsAgent: agent, // Pakai custom agent
            timeout: 15000,
            validateStatus: () => true
        });

        console.log(`📊 Status: ${res.status}`);
        console.log(`💬 Message: ${res.data.status} - ${res.data.message}`);

    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
        if (e.code) console.log(`   Code: ${e.code}`);
    }
}

testTLS();
