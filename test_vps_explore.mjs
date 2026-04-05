import CryptoJS from 'crypto-js';
import axios from 'axios';

const SECRET_KEY = 'Sansekai-SekaiDrama'; // Kunci yang sama dengan VPS

export function decrypt(cipheredData) {
    try {
        const bytes = CryptoJS.AES.decrypt(cipheredData, SECRET_KEY);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedString);
    } catch (error) {
        console.error("Decryption failed:", error.message);
        return null;
    }
}

async function testVpsExplore() {
    try {
        const res = await axios.get("https://dracindo.asia/api/stardusttv/explore");
        if (res.data.success && res.data.data) {
            const parsed = decrypt(res.data.data);
            console.log("Decrypted Items (1-3):", JSON.stringify(parsed?.slice(0, 3) || parsed, null, 2));
        } else {
            console.log("Response:", res.data);
        }
    } catch(e) { console.error(e.message); }
}

testVpsExplore();
