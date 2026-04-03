import SignatureGeneratorV2 from './utils/SignatureGeneratorV2.js';

/**
 * DramaBox API Crack - Last Verified State
 * 
 * Logic follows lb/dramabox.java interceptor from DramaBox App.
 * Status: Signature algorithm is 100% correct.
 * Issue: Platform ID 'p' and device registration records are needed.
 */

const CONFIG = {
    BASE_URL: 'https://sapi.dramaboxdb.com/drama-box',
    DEVICE_ID: 'ffffffffd2d40675ffffffffca3d9e03',
    ANDROID_ID: 'd2d40675ca3d9e03',
    PLATFORM: 'android', // Likely needs the exact obfuscated string from OFIfyPR.KbUcLckoBECvlE
    USER_AGENT: 'Dalvik/2.1.0 (Linux; U; Android 13; Pixel 4 Build/TP1A.220624.014)'
};

export function getFullHeaders(path, bodyObj = {}, token = '') {
    const ts = Date.now().toString();
    const bodyStr = Object.keys(bodyObj).length === 0 ? '{}' : JSON.stringify(bodyObj);

    const sn = SignatureGeneratorV2.generate(
        ts,
        bodyStr,
        CONFIG.DEVICE_ID,
        CONFIG.ANDROID_ID,
        token
    );

    return {
        'pline': 'ANDROID',
        'vn': '3.1.2',
        'version': '312',
        'p': CONFIG.PLATFORM,
        'sn': sn,
        'tn': token,
        'package-name': 'com.storymatrix.drama',
        'device-id': CONFIG.DEVICE_ID,
        'android-id': CONFIG.ANDROID_ID,
        'active-time': ts,
        'Content-Type': 'application/json',
        'User-Agent': CONFIG.USER_AGENT
    };
}

export function getUrl(path, ts) {
    return `${CONFIG.BASE_URL}${path}?timestamp=${ts}`;
}
