// Test berbagai endpoint tanpa token sama sekali
import axios from 'axios';

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

const baseHeaders = {
    'User-Agent': UA_IPHONE,
    'Referer': 'https://vidrama.asia/',
    'Origin': 'https://vidrama.asia',
    'Accept-Language': 'id-ID,id;q=0.9',
    'Accept': 'application/json, text/plain, */*',
};

const candidates = [
    { url: 'https://vidrama.asia/api/dramabox?action=list&page=1', desc: 'dramabox no auth' },
    { url: 'https://vidrama.asia/api/dramabox?action=list&page=1', desc: 'dramabox anon key', extraHeaders: { 'Apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrY25ibmxmcWRsb3RuamFpenh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjQ5ODEsImV4cCI6MjA4NDA0MDk4MX0.EFP6qcUAT_Dk0bV3ycjxpduZ1MBuhCWOTE0ArIsS9Xo', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrY25ibmxmcWRsb3RuamFpenh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjQ5ODEsImV4cCI6MjA4NDA0MDk4MX0.EFP6qcUAT_Dk0bV3ycjxpduZ1MBuhCWOTE0ArIsS9Xo' } },
    { url: 'https://vidrama.asia/api/dramabox2?action=list&page=1', desc: 'dramabox2 no auth' },
    { url: 'https://vidrama.asia/api/dramabox?action=combined&page=1', desc: 'dramabox combined' },
    { url: 'https://vidrama.asia/api/dramabox?action=hotrank&page=1', desc: 'dramabox hotrank' },
    { url: 'https://vidrama.asia/api/dramabox?action=latest&page=1', desc: 'dramabox latest' },
    { url: 'https://vidrama.asia/api/dramabox?action=foryou&page=1', desc: 'dramabox foryou' },
];

for (const c of candidates) {
    try {
        const res = await axios.get(c.url, {
            headers: { ...baseHeaders, ...(c.extraHeaders || {}) },
            timeout: 10000
        });
        const data = res.data;
        const count = data?.data?.book?.length || data?.data?.length || data?.data?.list?.length || 'unknown';
        console.log(`✅ ${c.desc}: status=${res.status}, count=${count}, keys=${Object.keys(data?.data || {})}`);
        if (data?.data?.book?.[0]) {
            console.log(`   Sample: id=${data.data.book[0].id}, title=${data.data.book[0].title}`);
        }
    } catch(e) {
        console.log(`❌ ${c.desc}: ${e.response?.status || e.message}`);
    }
}
