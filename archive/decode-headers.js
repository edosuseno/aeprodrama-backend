import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load hasil analisa
const resultPath = path.join(__dirname, 'apk-analysis-result.json');
const analysis = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

console.log('🔍 DECODING SUSPICIOUS HEADERS...\n');

const clues = [];

if (analysis.headers) {
    analysis.headers.forEach(header => {
        // Cek format "p":"data:image/png;base64,..."
        if (header.includes('data:image/png;base64,')) {
            try {
                // Ambil bagian base64
                // Header format contoh: "p":"data:image/png;base64,iVBORw0K..."
                const parts = header.split('base64,');
                if (parts.length > 1) {
                    const base64Data = parts[1].replace(/"$/, '');

                    // Decode
                    const buffer = Buffer.from(base64Data, 'base64');
                    const decidedText = buffer.toString('utf8');

                    console.log(`\n📦 Header Found: ${header.substring(0, 30)}...`);

                    // Coba cari string yang terbaca di dalam binary data
                    // Seringkali developer taruh text setelah byte gambar PNG
                    const printable = decidedText.replace(/[^\x20-\x7E]/g, '');

                    // Filter out common PNG header stuff like "IHDR", "IDAT", "IEND"
                    const cleanPrintable = printable.replace(/(PNG|IHDR|sRGB|gAMA|pHYs|IDAT|IEND)/g, '');

                    if (cleanPrintable.length > 5) {
                        console.log(`   Possible Hidden Text: ${cleanPrintable}`);
                        clues.push(cleanPrintable);
                    } else {
                        console.log('   (Standard Image Content)');
                    }
                }

            } catch (e) {
                console.log('   Error decoding:', e.message);
            }
        } else {
            // Header biasa
            if (!header.startsWith('x-')) {
                // console.log(`   Normal Header: ${header}`);
            }
        }
    });
}

console.log('\n\n🎯 POTENTIAL CLUES FOUND:');
console.log(JSON.stringify(clues, null, 2));
