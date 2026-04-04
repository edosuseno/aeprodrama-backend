
import app from './src/index.js';
import axios from 'axios';

// Simulasi DB SALAH agar Crash jika tidak Fail-Safe
process.env.MONGODB_URI = 'mongodb://localhost:27017/invalid_db_test_only';

async function verify() {
    const server = app.listen(5005, async () => {
        console.log('--- TEST: DATABASE GAGAL CONNECT ---');
        try {
            // 1. Test Stats (Garis Terdepan Error 500)
            console.log('Testing /api/stats/online...');
            const resStats = await axios.get('http://localhost:5005/api/stats/online');
            console.log('✅ Stats Response:', resStats.data);

            // 2. Test Shortmax (Tujuan Utama)
            console.log('Testing /api/shortmax/latest...');
            const resShort = await axios.get('http://localhost:5005/api/shortmax/latest');
            console.log('✅ Shortmax Response Success:', resShort.data.success);
            
            console.log('\n--- KESIMPULAN: API AMAN DARI CRASH DB ---');
        } catch (e) {
            console.error('❌ API TETAP CRASH:', e.message);
        } finally {
            server.close();
            process.exit(0);
        }
    });
}

verify();
