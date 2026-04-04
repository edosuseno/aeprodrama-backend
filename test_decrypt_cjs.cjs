const CryptoJS = require('crypto-js');

// Data ciphertext dari hasil inspeksi situs dracindo-web.vercel.app
const ciphertext = "U2FsdGVkX1/T/kJl+bu3NrDi+atfllyXIX6n8qNPhJA="; 

// Mencoba berbagai kemungkinan variasi kunci rahasia
const secrets = [
    "Sansekai-SekaiDrama",
    "Sansekai-SekaiDrama ", 
    " Sansekai-SekaiDrama",
    "SekaiDrama",
    "dracindo-secret",
    "Sansekai-SekaiDrama\n",
    "Sansekai-SekaiDrama\r\n",
    "Sansekai-SekaiDrama\r"
];

console.log("--- DIAGNOSA ENKRIPSI ---");
console.log("Ciphertext:", ciphertext);

secrets.forEach(secret => {
    try {
        const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        
        if (decryptedString) {
            console.log(`✅ BERHASIL dengan kunci: "${secret.replace(/\n|\r/g, '\\n')}"`);
            console.log(`   Hasil: ${decryptedString}`);
        } else {
            console.log(`❌ GAGAL dengan kunci: "${secret.replace(/\n|\r/g, '\\n')}"`);
        }
    } catch (e) {
        console.log(`❌ ERROR dengan kunci: "${secret}" - ${e.message}`);
    }
});
