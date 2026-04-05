import axios from 'axios';

async function testPureDotDrama() {
    const keyword = 'pernikahan';
    const baseUrl = 'https://vidrama.asia/api/dotdrama';
    
    const headers = { 
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://vidrama.asia/provider/dotdrama'
    };

    try {
        console.log("Testing Dot Drama direct endpoint WITHOUT auth...");
        const res = await axios.get(`${baseUrl}?action=search&q=${encodeURIComponent(keyword)}`, { headers });
        console.log("Status:", res.status);
        const data = res.data?.data || res.data || [];
        console.log(`Direct DotDrama Count: ${data.length || 0}`);
    } catch (e) {
        console.error("Direct error:", e.response?.status || e.message);
    }
}

testPureDotDrama();
