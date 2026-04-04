
import axios from 'axios';

const tsUrl = "https://akamai-static.shorttv.live/hls-encrypted/519730fa34c64df0900fdafa422188e3_720/main/segment-0.ts?auth_key=1775016787-0-0-ad554644a9f4dca7a09638793437ca69";
const spoofedUA = 'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 ShortMax/1.6.0';
const headers = { 'Host': new URL(tsUrl).host, 'User-Agent': spoofedUA, 'Referer': 'https://h5.shortmax.com/', 'X-Requested-With': 'com.shortmax.video' };

async function inspectPackets() {
    try {
        const res = await axios.get(tsUrl, { headers, responseType: 'arraybuffer' });
        const buffer = Buffer.from(res.data);
        
        let startOffset = 2168; // Kita tahu ini adalah sync byte pertama yang konsisten
        
        console.log(`Inspecting first 20 packets at offset ${startOffset}...`);
        for (let i = 0; i < 20; i++) {
            const off = startOffset + (i * 188);
            const packet = buffer.slice(off, off + 188);
            const pid = ((packet[1] & 0x1f) << 8) | packet[2];
            console.log(`Packet ${i}: PID=${pid} (0x${pid.toString(16)}), Hex: ${packet.slice(0, 16).toString('hex')}...`);
        }

    } catch (e) {
        console.error(e.message);
    }
}

inspectPackets();
