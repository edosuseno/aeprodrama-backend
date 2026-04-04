import signatureGenerator from './src/utils/SignatureGenerator.js';
import axios from 'axios';

console.log('🚀 TESTING IDENTITY CLONE (Samsung S21 Ultra Profile)\n');

// URL
const BASE_URL = 'https://sapi.dramaboxdb.com/drama-box';
const BOOTSTRAP_PATH = '/ap001/bootstrap';

// Identity Profile: Samsung Galaxy S21 Ultra 5G
// Kita tiru se-mirip mungkin supaya server percaya ini HP beneran
const REAL_PROFILE = {
    distinctId: 'f7d2a8c3d4e5f6g7', // ID acak tapi format valid (hex 16 chars)
    androidId: 'f7d2a8c3d4e5f6g7',
    model: 'SM-G998B',
    brand: 'samsung',
    manufacturer: 'samsung',
    os: 'Android',
    osVersion: '13',
    appVersion: '3.1.2',
    versionCode: 312,
    screenW: 1440,
    screenH: 3200,
    timezone: 'Asia/Jakarta',
    lang: 'en',
    country: 'ID',
    network: 'WIFI',
    carrier: 'Telkomsel',
    googleAdId: '38400000-8cf0-11bd-b23e-10b96e4ef00d' // Format UUID dummy
};

// Kita update generator signature kita dengan identity baru ini
signatureGenerator.deviceId = REAL_PROFILE.distinctId;
signatureGenerator.androidId = REAL_PROFILE.androidId;

// Payload Bootstrap yang lebih meyakinkan
const BOOTSTRAP_BODY = {
    distinctId: REAL_PROFILE.distinctId,
    androidId: REAL_PROFILE.androidId,
    AdjustId: '', // Kosongkan, pura-pura belum dapet
    GoogleAdId: REAL_PROFILE.googleAdId,
    oaid: '',
    pushId: '',

    // Device Info
    brand: REAL_PROFILE.brand,
    model: REAL_PROFILE.model,
    os: REAL_PROFILE.os,
    osVersion: REAL_PROFILE.osVersion,
    appVersion: REAL_PROFILE.appVersion,
    screenHeight: REAL_PROFILE.screenH,
    screenWidth: REAL_PROFILE.screenW,

    // Locale
    language: REAL_PROFILE.lang,
    timezone: REAL_PROFILE.timezone,

    // Network
    networkType: REAL_PROFILE.network,
    simOperator: REAL_PROFILE.carrier
};

async function testClone() {
    const url = `${BASE_URL}${BOOTSTRAP_PATH}`;
    const bodyString = JSON.stringify(BOOTSTRAP_BODY);

    // Headers juga harus match
    const { headers, query } = signatureGenerator.getHeaders(bodyString);

    // Override headers agar sesuai profile
    headers['device-id'] = REAL_PROFILE.distinctId;
    headers['android-id'] = REAL_PROFILE.androidId;
    headers['brand'] = REAL_PROFILE.brand;
    headers['md'] = REAL_PROFILE.model;
    headers['vn'] = REAL_PROFILE.appVersion;

    // Header rahasia yang mungkin needed
    headers['x-startup'] = '1';

    const finalUrl = `${url}?timestamp=${query.timestamp}`;

    console.log(`📡 Sending Full Identity Clone...`);
    console.log(`🔗 URL: ${finalUrl}`);
    console.log(`📦 Body: ${bodyString.substring(0, 100)}...`);

    try {
        const res = await axios.post(finalUrl, BOOTSTRAP_BODY, {
            headers,
            timeout: 10000,
            validateStatus: () => true
        });

        console.log(`📊 Status: ${res.data.status} - ${res.data.message}`);

        if (res.data.status === 0 || res.data.success === true) {
            console.log('🎉🎉 SUKSES! DEVICE DITERIMA!');
            console.log(res.data);
        } else {
            console.log('⚠️  Masih gagal. Server menolak identity ini.');
        }

    } catch (e) {
        console.log(`❌ Network Error: ${e.message}`);
    }
}

testClone();
