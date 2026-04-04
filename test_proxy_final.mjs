
import axios from 'axios';
import CryptoJS from 'crypto-js';

const BACKEND_URL = 'http://localhost:5001';
const SECRET_KEY = "Sansekai-SekaiDrama";

function decryptData(ciphertext) {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    try { return JSON.parse(decryptedString); } catch (e) { return decryptedString; }
  } catch (error) { return null; }
}

async function test() {
    console.log('--- START DEEP PROXY VALIDATION ---');
    try {
        console.log('[1] Fetching Stream URL via API...');
        const resLatest = await axios.get(`${BACKEND_URL}/api/shortmax/latest`);
        const items = decryptData(resLatest.data.data);
        const pid = items[0].shortPlayId || items[0].id;
        
        const resStream = await axios.get(`${BACKEND_URL}/api/shortmax/episode?shortPlayId=${pid}&episodeNumber=1`);
        const stream = decryptData(resStream.data.data);
        const proxyManifestUrl = stream.url.startsWith('http') ? stream.url : `${BACKEND_URL}${stream.url}`;
        
        console.log(`✅ Manifest Proxy URL: ${proxyManifestUrl}`);

        console.log('[2] Fetching Manifest Content...');
        const resManifest = await axios.get(proxyManifestUrl);
        const manifestText = resManifest.data;
        
        if (manifestText.includes('#EXTM3U')) {
            console.log('✅ Manifest structure detected (HLS).');
            const lines = manifestText.split('\n');
            const firstSegmentUrl = lines.find(l => l.includes('/api/shortmax/proxy?url='));
            
            if (firstSegmentUrl) {
                console.log(`✅ Rewritten segment/submanifest found: ${firstSegmentUrl.substring(0, 100)}...`);
                
                console.log('[3] Verifying Segment/Submanifest playback (Relay test)...');
                const fragmentUrl = firstSegmentUrl.startsWith('http') ? firstSegmentUrl : `${BACKEND_URL}${firstSegmentUrl}`;
                const resFrag = await axios.get(fragmentUrl, { responseType: 'arraybuffer' });
                
                console.log(`✅ Fragment Response Status: ${resFrag.status}`);
                console.log(`✅ Fragment Content Length: ${resFrag.data.byteLength} bytes`);
                
                if (resFrag.status === 200 && resFrag.data.byteLength > 0) {
                   console.log('\n🌟 FINAL VERDICT: VIDEO DATA STREAMING SUCCESS!');
                   console.log('Playback should work perfectly in browser.');
                }
            } else {
                console.error('❌ FAILED: No rewritten segments found in manifest.');
                console.log('Manifest Sample:', manifestText.substring(0, 500));
            }
        } else {
             console.error('❌ FAILED: Manifest content is not HLS.');
             console.log('Content:', manifestText);
        }

    } catch (e) {
        console.error('❌ Test failed with error:', e.message);
        if (e.response) console.error('Response data:', e.response.data.toString());
    }
}

test();
