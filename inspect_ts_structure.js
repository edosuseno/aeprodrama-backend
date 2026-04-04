
import axios from 'axios';
import fs from 'fs';

const tsUrl = "https://akamai-static.shorttv.live/hls-encrypted/519730fa34c64df0900fdafa422188e3_720/main/segment-0.ts?auth_key=1775016787-0-0-ad554644a9f4dca7a09638793437ca69";
const spoofedUA = 'Mozilla/5.0 (Linux; Android 13; SM-A536B Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 ShortMax/1.4.2';
const referer = 'https://www.shortmax.com/';

async function downloadAndInspect() {
    try {
        console.log(`Mendownload segmen TS penuh untuk inspeksi...`);
        const response = await axios({
            method: 'get',
            url: tsUrl,
            responseType: 'arraybuffer',
            headers: {
                'Referer': referer,
                'User-Agent': spoofedUA,
                'X-Requested-With': 'com.shortmax.video'
            }
        });

        let buffer = Buffer.from(response.data);
        console.log(`Ukuran diterima: ${buffer.length} bytes`);

        // Logika Backend
        let startOffset = -1;
        for (let i = 0; i < 5000; i++) {
            if (buffer[i] === 0x47 && buffer[i + 188] === 0x47 && buffer[i + 376] === 0x47) {
                startOffset = i;
                break;
            }
        }

        if (startOffset !== -1) {
            console.log(`Offset ditemukan: ${startOffset}`);
            const clean = buffer.subarray(startOffset);
            
            // Simpan segmen yang sudah dibersihkan untuk dicek secara manual (jika perlu)
            // Namun di lingkungan ini kita hanya bisa cek isinya
            console.log(`50 byte pertama segmen bersih (Hex):\n${clean.slice(0, 50).toString('hex')}`);
            
            // Periksa beberapa paket TS berikutnya
            let allSync = true;
            for (let j = 0; j < 10; j++) {
                 if (clean[j * 188] !== 0x47) {
                     allSync = false;
                     console.log(`Meleset di paket ke-${j} pada offset ${j*188}`);
                 }
            }
            console.log(`Apakah 10 paket pertama punya sync byte valid? ${allSync ? 'YA' : 'TIDAK'}`);

        } else {
            console.log(`EROR: Sync byte tidak ditemukan!`);
        }

    } catch (e) {
        console.error(`Gagal: ${e.message}`);
    }
}

downloadAndInspect();
