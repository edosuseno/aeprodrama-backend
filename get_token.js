const axios = require('axios');

async function getNewToken() {
    const supabaseUrl = 'https://gkcnbnlfqdlotnjaizxx.supabase.co';
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrY25ibmxmcWRsb3RuamFpenh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjQ5ODEsImV4cCI6MjA4NDA0MDk4MX0.EFP6qcUAT_Dk0bV3ycjxpduZ1MBuhCWOTE0ArIsS9Xo';
    
    try {
        console.log("Signing up new user to get token...");
        const res = await axios.post(
            `${supabaseUrl}/auth/v1/signup`,
            { email: `test${Date.now()}@gmail.com`, password: "password123!" },
            { headers: { 'apikey': apiKey, 'Content-Type': 'application/json' } }
        );
        console.log("AccessToken:", res.data.access_token);
        console.log("RefreshToken:", res.data.refresh_token);
    } catch (e) {
        console.error("Signup failed:", e.response?.data || e.message);
    }
}
getNewToken();
