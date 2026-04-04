
import axios from 'axios';
import fs from 'fs';

const videoUrl = "https://akamai-static.shorttv.live/hls-encrypted/519730fa34c64df0900fdafa422188e3_720/main.m3u8?auth_key=1775016787-0-0-ad554644a9f4dca7a09638793437ca69";
const spoofedUA = 'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 ShortMax/1.4.2';
const referer = 'https://www.shortmax.com/';

async function diagnose() {
    try {
        console.log(`[1] Mencoba mengambil MANIFEST (.m3u8) langsung...`);
        const resM3u8 = await axios.get(videoUrl, {
            headers: {
                'User-Agent': spoofedUA,
                'Referer': referer,
                'Origin': 'https://www.shortmax.com'
            }
        });

        console.log(`Status: ${resM3u8.status}`);
        console.log(`Content-Type: ${resM3u8.headers['content-type']}`);
        
        const manifestContent = resM3u8.data;
        console.log(`Isi Manifest (10 baris pertama):\n${manifestContent.split('\n').slice(0, 10).join('\n')}`);

        // Cari segmen TS
        const lines = manifestContent.split('\n');
        let tsRelativeUrl = "";
        for (const line of lines) {
            if (line.trim() && !line.startsWith('#')) {
                tsRelativeUrl = line.trim();
                break;
            }
        }

        if (!tsRelativeUrl) {
            console.log("❌ Tidak ada segmen .ts ditemukan dalam manifest.");
            return;
        }

        const urlObj = new URL(videoUrl);
        const baseUrl = urlObj.origin + urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
        const searchParams = urlObj.search;
        
        const tsUrl = new URL(tsRelativeUrl, baseUrl).toString().split('?')[0] + searchParams;
        
        console.log(`\n[2] Mencoba mengambil SEGMEN (.ts) langsung: ${tsUrl}`);
        const resTs = await axios.get(tsUrl, {
            headers: {
                'User-Agent': spoofedUA,
                'Referer': referer,
                'Origin': 'https://www.shortmax.com',
                'Range': 'bytes=0-1023' // Ambil 1KB pertama saja
            },
            responseType: 'arraybuffer'
        });

        console.log(`Status TS: ${resTs.status}`);
        console.log(`Ukuran diterima: ${resTs.data.byteLength} bytes`);
        
        const buffer = Buffer.from(resTs.data);
        console.log(`16 Byte pertama (HEX): ${buffer.slice(0, 16).toString('hex')}`);

        // Cek Sync Byte MPEG-TS (0x47)
        let foundSync = -1;
        for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
            if (buffer[i] === 0x47) {
                foundSync = i;
                break;
            }
        }

        if (foundSync !== -1) {
            console.log(`✅ Sync Byte (0x47) ditemukan pada offset: ${foundSync}`);
            if (foundSync === 0) {
                console.log("Video format TS standar (Clean).");
            } else {
                console.log(`Video mengandung Obfuskasi/DRM sebesar ${foundSync} byte di awal.`);
            }
        } else {
            console.log("❌ Sync Byte (0x47) TIDAK ditemukan dalam 1KB pertama. File mungkin terenkripsi AES secara penuh atau format lain.");
        }

    } catch (e) {
        console.error(`Diagnosis Gagal: ${e.message}`);
        if (e.response) {
            console.log(`Status: ${e.response.status}`);
            console.log(`Headers: ${JSON.stringify(e.response.headers, null, 2)}`);
            // Jika 403, cek apakah ada body (mungkin Cloudflare HTML)
            if (e.response.data && e.response.data.length < 500) {
                 console.log(`Body: ${e.response.data.toString()}`);
            }
        }
    }
}

diagnose();
