import fetch from 'node-fetch';

async function testSign() {
  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrY25ibmxmcWRsb3RuamFpenh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NjQ5ODEsImV4cCI6MjA4NDA0MDk4MX0.EFP6qcUAT_Dk0bV3ycjxpduZ1MBuhCWOTE0ArIsS9Xo';
  const url = 'https://gkcnbnlfqdlotnjaizxx.supabase.co/auth/v1/signup';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `aetest${Date.now()}@gmail.com`, password: 'password123!' })
    });
    const info = await res.json();
    console.log("ATOKEN:", info.access_token);
    console.log("RTOKEN:", info.refresh_token);
  } catch (e) {
    console.log(e);
  }
}
testSign();
