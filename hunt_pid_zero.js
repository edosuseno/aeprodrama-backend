
import axios from 'axios';

const tsUrl = "https://akamai-static.shorttv.live/hls-encrypted/519730fa34c64df0900fdafa422188e3_720/main/segment-0.ts?auth_key=1775016787-0-0-ad554644a9f4dca7a09638793437ca69";
const spoofedUA = 'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 ShortMax/1.6.0';
const headers = { 'Host': new URL(tsUrl).host, 'User-Agent': spoofedUA, 'Referer': 'https://h5.shortmax.com/', 'X-Requested-With': 'com.shortmax.video' };

async function huntPidZero() {
    try {
        console.log("Hunting for PID 0 (PAT) in the whole segment...");
        const res = await axios.get(tsUrl, { headers, responseType: 'arraybuffer' });
        const buffer = Buffer.from(res.data);
        
        let foundOffsets = [];

        // Cari semua offset di mana byte 0x47 berada dan paket setelahnya memiliki PID 0
        for (let i = 0; i < buffer.length - 188; i++) {
            if (buffer[i] === 0x47) {
                const pid = ((buffer[i + 1] & 0x1f) << 8) | buffer[i + 2];
                if (pid === 0) {
                    // Verifikasi apakah 188 byte sebelumnya atau sesudahnya juga sinkron (jika ada)
                    foundOffsets.push(i);
                }
            }
        }

        console.log(`Ditemukan ${foundOffsets.length} paket dengan PID 0.`);
        if (foundOffsets.length > 0) {
            foundOffsets.slice(0, 10).forEach(off => {
                console.log(`PID 0 di offset: ${off} (Hex 16 byte: ${buffer.slice(off, off+16).toString('hex')})`);
            });
        } else {
            console.log("🚨 PID 0 benar-benar TIDAK ADA di seluruh file! Menjelajah PID lain...");
        }

    } catch (e) {
        console.error(e.message);
    }
}

huntPidZero();
