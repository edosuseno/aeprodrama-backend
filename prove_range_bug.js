
import axios from 'axios';

const proxyUrl = "http://localhost:5001/api/shortmax/hls";
const tsUrl = "https://akamai-static.shorttv.live/hls-encrypted/519730fa34c64df0900fdafa422188e3_720/main/segment-0.ts?auth_key=1775016787-0-0-ad554644a9f4dca7a09638793437ca69";

async function proveRangeBug() {
    try {
        console.log(`Menguji Proxy dengan Range 1KB (seperti browser)...`);
        // Catatan: Pastikan backend sedang berjalan di port 5001 secara lokal jika ingin tes nyata.
        // Namun di sini kita akan mensimulasikan logikanya saja jika backend tidak bisa diakses langsung.
        
        // Simulasi Logika Proxy
        const mockFetchFromShortmax = async (range) => {
             return await axios.get(tsUrl, {
                 headers: { 
                     'Range': range,
                     'User-Agent': 'Mozilla/5.0' 
                 },
                 responseType: 'arraybuffer'
             });
        };

        const res = await mockFetchFromShortmax('bytes=0-1023');
        const buffer = Buffer.from(res.data);
        console.log(`Ukuran yang didapat dari Shortmax: ${buffer.length} bytes`);
        
        let startOffset = -1;
        const maxSearch = Math.min(buffer.length - 376, 5000);
        for (let i = 0; i < maxSearch; i++) {
            if (buffer[i] === 0x47 && buffer[i + 188] === 0x47 && buffer[i + 376] === 0x47) {
                startOffset = i;
                break;
            }
        }

        console.log(`Offset ditemukan: ${startOffset}`);
        if (startOffset === -1) {
            console.log(`🚨 BUG TERKONFIRMASI: Proxy akan mengirimkan sampah ke browser karena offset tidak ditemukan di 1KB pertama.`);
        } else {
            console.log(`✅ Offset ditemukan (Logika Aman).`);
        }

    } catch (e) {
        console.error(`Gagal: ${e.message}`);
    }
}

proveRangeBug();
