# 🎯 DRAMABOX API CRACKING - TOOLS SUMMARY

Kumpulan tool lengkap untuk reverse-engineer dan mengakses API resmi DramaBox.

---

## 📦 DAFTAR TOOLS

### 1. **apk-analyzer.js**
🔍 **Fungsi:** Menganalisa hasil decompile APK untuk menemukan:
- Base URLs API
- API Endpoints
- Header requirements
- Secret keys
- Signature algorithms
- Private keys RSA

**Cara Pakai:**
```bash
node apk-analyzer.js D:\path\to\decompiled-apk
```

**Output:**
- Console output dengan findings
- File `apk-analysis-result.json` dengan semua data
- Generated test code siap pakai

**Kapan Digunakan:**
- Setelah decompile APK DramaBox terbaru
- Saat ingin mencari endpoint atau URL baru
- Untuk menemukan private key yang tersembunyi

---

### 2. **src/utils/AdvancedSignatureGenerator.js**
🔐 **Fungsi:** Generate signature dengan berbagai metode:
- RSA-SHA256 (official method)
- MD5 (fallback)
- SHA256 (fallback)
- HMAC-SHA256 (fallback)

**Cara Pakai:**
```javascript
import AdvancedSignatureGenerator from './src/utils/AdvancedSignatureGenerator.js';

const sigGen = new AdvancedSignatureGenerator();

// Generate headers
const headers = sigGen.generateHeaders(
  { book_id: '42000003970' },  // body/payload
  '',                           // token (kosong jika belum login)
  'rsa'                         // strategy: rsa, md5, sha256, atau hmac
);

// Atau generate semua variasi sekaligus
const allVariations = sigGen.generateAllVariations({ book_id: '42000003970' });
```

**Kapan Digunakan:**
- Saat membuat request ke API DramaBox
- Untuk generate signature yang valid
- Di production code setelah menemukan method yang benar

---

### 3. **ultimate-tester.js**
⚔️ **Fungsi:** Testing comprehensive dengan brute-force approach

**Cara Pakai:**
```bash
# Mode Quick - Test endpoint paling promising
node ultimate-tester.js quick

# Mode Brute Force - Test semua kombinasi (lambat)
node ultimate-tester.js brute

# Mode Debug - Show signature details
node ultimate-tester.js debug
```

**Fitur:**
- Auto-test semua kombinasi base URL + endpoint + payload + signature
- Auto-save jika menemukan kombinasi yang berhasil
- Support GET dan POST methods
- Detailed logging untuk troubleshooting

**Kapan Digunakan:**
- Saat mencari kombinasi URL + endpoint + signature yang benar
- Setelah dapat hasil dari apk-analyzer.js
- Untuk exhaustive testing

---

### 4. **signature-validator.js**
🔬 **Fungsi:** Validasi dan compare signature

**Cara Pakai:**
```bash
node signature-validator.js
```

**Fitur:**
- Generate semua variasi signature untuk satu request
- Compare dengan signature expected (dari intercept)
- Validate header completeness
- Export config untuk Postman/Insomnia
- Similarity analysis

**Kapan Digunakan:**
- Saat signature tidak diterima server
- Untuk compare dengan request yang di-intercept dari app asli
- Debugging signature generation
- Manual testing preparation

---

## 🚀 WORKFLOW RECOMMENDED

### Scenario 1: Awal Project (Belum Ada APK)

```bash
# 1. Download dan decompile APK terbaru
# (Lihat DRAMABOX_CRACKING_GUIDE.md untuk detail)

# 2. Analisa APK
node apk-analyzer.js D:\APK\dramabox-decompiled

# 3. Quick test dulu
node ultimate-tester.js quick

# 4. Jika quick test gagal, brute force
node ultimate-tester.js brute

# 5. Jika menemukan kombinasi sukses, implement ke production
# Edit DramaboxService.js sesuai hasil
```

### Scenario 2: Sudah Ada APK Analysis

```bash
# 1. Pastikan apk-analysis-result.json ada
# (Tool akan auto-load findings)

# 2. Test langsung
node ultimate-tester.js quick

# 3. Jika perlu, debug signature
node signature-validator.js
```

### Scenario 3: Signature Tidak Match

```bash
# 1. Intercept request dari app asli (gunakan mitmproxy)

# 2. Jalankan validator
node signature-validator.js

# 3. Edit file, uncomment dan isi interceptedRequest object

# 4. Compare signature generated vs expected

# 5. Fix signature generation berdasarkan diff
```

### Scenario 4: Production Implementation

```javascript
// File: src/services/DramaboxServiceOfficial.js

import AdvancedSignatureGenerator from '../utils/AdvancedSignatureGenerator.js';
import axios from 'axios';

class DramaboxServiceOfficial {
  constructor() {
    this.baseUrl = 'URL_DARI_SUCCESS_CONFIG';
    this.sigGen = new AdvancedSignatureGenerator();
    this.strategy = 'STRATEGY_DARI_SUCCESS_CONFIG'; // rsa, md5, etc
  }
  
  async request(endpoint, payload) {
    const headers = this.sigGen.generateHeaders(payload, '', this.strategy);
    
    const response = await axios.post(
      `${this.baseUrl}${endpoint}`,
      payload,
      { headers }
    );
    
    return response.data;
  }
  
  async getEpisodes(bookId) {
    return this.request('/drama-box/chapter/list', {
      book_id: bookId,
      page_num: 1,
      page_size: 100
    });
  }
}

export default new DramaboxServiceOfficial();
```

---

## 📊 EXPECTED OUTPUT

### Jika Berhasil Menemukan Kombinasi yang Benar:

```
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉
💥 JACKPOT! WE FOUND IT! 💥
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉

✅ URL: https://sapi.dramaboxdb.com/drama-box/chapter/list
✅ Method: POST
✅ Strategy: rsa
✅ Payload: {"book_id":"42000003970","page_num":1,"page_size":20}

📦 Response:
{
  "status": 200,
  "message": "success",
  "data": [
    {
      "chapterId": "123",
      "chapterName": "Episode 1",
      ...
    }
  ]
}

💾 Configuration saved to: successful-config-1706943600000.json
```

File `successful-config-{timestamp}.json` akan berisi semua info yang perlu untuk production.

---

## 🔧 TROUBLESHOOTING QUICK REFERENCE

| Error | Kemungkinan Penyebab | Solusi |
|-------|---------------------|---------|
| 404 Not Found | Endpoint salah | Coba endpoint lain dari apk-analysis |
| 401/403 Auth Error | Signature salah | ✅ URL/endpoint benar! Fix signature |
| 500 Internal Error | Device ID invalid, geo-block | Try VPN, intercept dari app asli |
| Invalid Parameter | Payload format salah | Coba payload variations |
| Connection Timeout | Base URL salah | Coba base URL lain |

---

## 📁 FILE STRUCTURE

```
backend/
├── apk-analyzer.js              # Tool #1: APK Analysis
├── ultimate-tester.js           # Tool #3: Comprehensive Tester
├── signature-validator.js       # Tool #4: Signature Validator
├── src/
│   └── utils/
│       └── AdvancedSignatureGenerator.js  # Tool #2: Signature Generator
├── private_key.pem              # Private key (jika sudah ada)
├── apk-analysis-result.json     # Output dari apk-analyzer
├── successful-config-*.json     # Output dari ultimate-tester (jika sukses)
├── DRAMABOX_CRACKING_GUIDE.md   # Panduan lengkap
└── TOOLS_SUMMARY.md             # File ini
```

---

## 🎓 LEARNING RESOURCES

### Reverse Engineering APK:
- JADX: https://github.com/skylot/jadx
- APKTool: https://ibotpeaches.github.io/Apktool/
- Online decompiler: https://www.javadecompilers.com/apk

### Network Interception:
- mitmproxy: https://mitmproxy.org/
- Charles Proxy: https://www.charlesproxy.com/
- HTTP Toolkit: https://httptoolkit.tech/

### APK Download:
- APKPure: https://apkpure.com/
- APKMirror: https://www.apkmirror.com/

---

## 💡 TIPS & BEST PRACTICES

1. **Selalu gunakan APK terbaru** - API bisa berubah
2. **Dokumentasikan setiap findings** - Berguna untuk troubleshooting
3. **Test di jam low-traffic** - Hindari rate limiting
4. **Backup successful config** - API bisa berubah, config lama tetap berguna
5. **Use VPN jika perlu** - Beberapa API geo-restricted
6. **Intercept app asli** - Golden standard untuk validasi
7. **Monitor error messages** - Sering ada clue dari error
8. **Be patient** - Brute force bisa takes time

---

## 🎯 PRIORITY CHECKLIST

Sebelum mulai testing, pastikan:

- [ ] APK DramaBox sudah di-download
- [ ] APK sudah di-decompile dengan JADX
- [ ] Node.js dan dependencies sudah terinstall (`npm install`)
- [ ] File `private_key.pem` sudah ada (jika sudah ditemukan)
- [ ] Network connection stabil
- [ ] Sudah baca `DRAMABOX_CRACKING_GUIDE.md`

Urutan eksekusi:
1. [ ] `node apk-analyzer.js <path>`
2. [ ] Review `apk-analysis-result.json`
3. [ ] `node ultimate-tester.js quick`
4. [ ] Jika gagal: `node ultimate-tester.js brute`
5. [ ] Jika masih gagal: `node signature-validator.js` + intercept app
6. [ ] Implement ke production jika sukses

---

## 📞 NEXT STEPS

Setelah menemukan kombinasi yang berhasil:

1. ✅ Save `successful-config-*.json`
2. ✅ Update `DramaboxService.js` dengan config yang benar
3. ✅ Test dengan berbagai bookId untuk validasi
4. ✅ Add error handling dan retry logic
5. ✅ Add caching untuk rate limiting
6. ✅ Setup monitoring untuk detect API changes
7. ✅ Dokumentasi untuk team

---

**Good luck! 🚀**

Jika ada pertanyaan atau menemukan issue, dokumentasikan dan iterate!
