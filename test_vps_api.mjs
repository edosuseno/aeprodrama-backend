
import axios from 'axios';
import CryptoJS from 'crypto-js';

const SECRET_KEY = 'Sansekai-SekaiDrama';
const VPS_API = 'http://202.10.44.110/api/';

async function test() {
    try {
        console.log('--- MENGUJI API BACKEND VPS ---');
        console.log('Fetching:', VPS_API);
        const res = await axios.get(VPS_API, { 
            headers: { 'Host': 'dracindo.asia' },
            timeout: 10000 
        });
        const json = res.data;
        
        console.log('1. Raw Response from Backend:', JSON.stringify(json).substring(0, 200) + '...');
        
        if (json.data && typeof json.data === 'string') {
            console.log('Encrypted data found. Length:', json.data.length);
            try {
                const bytes = CryptoJS.AES.decrypt(json.data, SECRET_KEY);
                const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
                
                if (!decryptedString) {
                    console.log('Decryption failed: Empty result. Check if SECRET_KEY is correct.');
                    return;
                }
                
                const decrypted = JSON.parse(decryptedString);
                
                console.log('2. Decrypted Data Type:', typeof decrypted);
                console.log('3. Is Array?', Array.isArray(decrypted));
                
                // Netshort format is usually { data: [...] }
                const items = decrypted.data || (Array.isArray(decrypted) ? decrypted : []);
                console.log('4. Items count:', items.length);
                if (items.length > 0) {
                    console.log('5. Sample Item:', JSON.stringify(items[0], null, 2));
                }
            } catch (decryptErr) {
                console.error('Decryption error:', decryptErr.message);
            }
        } else if (json.data) {
            console.log('Data is not a string (maybe already decrypted or different format).');
            console.log('Sample data:', JSON.stringify(json.data).substring(0, 100));
        } else {
            console.log('No data found in response.');
            console.log('Full response keys:', Object.keys(json));
        }
    } catch (e) {
        console.error('Network Error:', e.message);
        if (e.response) {
            console.error('Response Status:', e.response.status);
            console.error('Response Data:', e.response.data);
        }
    }
}

test();
