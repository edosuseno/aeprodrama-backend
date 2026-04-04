# 🎯 DRAMABOX API CRACKING TOOLKIT

**Complete toolkit untuk reverse-engineer dan mengakses API resmi DramaBox**

> Status: ✅ Tools Ready | Awaiting APK Decompile & Testing

---

## 📌 QUICK START

### 1. Persiapan (TODO)
```bash
# Download APK DramaBox terbaru dari:
# https://apkpure.com/dramabox/com.dramabox.app

# Decompile dengan JADX:
# https://github.com/skylot/jadx/releases
```

### 2. Analisa APK
```bash
cd d:\aeprodrama\backend
node apk-analyzer.js D:\Path\To\Decompiled\APK
```

### 3. Test API
```bash
# Quick test (recommended untuk mulai)
node ultimate-tester.js quick

# Debug mode untuk lihat signature details
node ultimate-tester.js debug

# Brute force (comprehensive, ~10-30 menit)
node ultimate-tester.js brute
```

---

## 🛠️ TOOLS YANG TERSEDIA

### 1. **apk-analyzer.js** - APK Intelligence Extractor
Mengekstrak informasi penting dari APK yang sudah di-decompile.

**Output:**
- Base URLs API
- API Endpoints
- Headers requirements
- Secret keys
- Signature algorithms
- Private RSA keys

**File Output:** `apk-analysis-result.json`

---

### 2. **AdvancedSignatureGenerator.js** - Multi-Strategy Signature Generator
Class untuk generate signature dengan berbagai algoritma.

**Supported Methods:**
- ✅ RSA-SHA256 (Official DramaBox method)
- ✅ MD5 (Fallback)
- ✅ SHA256 (Fallback)
- ✅ HMAC-SHA256 (Fallback)

**Usage:**
```javascript
import AdvancedSignatureGenerator from './src/utils/AdvancedSignatureGenerator.js';

const sigGen = new AdvancedSignatureGenerator();
const headers = sigGen.generateHeaders(payload, token, 'rsa');
```

---

### 3. **ultimate-tester.js** - Comprehensive API Tester
Tool untuk brute-force testing berbagai kombinasi.

**Modes:**
- `quick` - Test endpoint paling promising (fast)
- `brute` - Test semua kombinasi lengkap (slow)
- `debug` - Show signature details + cURL export

**Fitur:**
- Auto-save successful configuration
- Intelligent error filtering
- Progress tracking
- Integration dengan APK analysis results

---

### 4. **signature-validator.js** - Signature Debugger & Comparator
Tool untuk debugging dan validasi signature.

**Fitur:**
- Validate signature string format
- Generate all signature variations
- Compare dengan expected signature (dari intercept)
- Export Postman/Insomnia config
- Similarity analysis

---

## 📂 FILE STRUCTURE

```
backend/
├── 📄 README_CRACKING.md              # File ini - Quick reference
├── 📘 DRAMABOX_CRACKING_GUIDE.md      # Panduan lengkap step-by-step
├── 📘 TOOLS_SUMMARY.md                 # Summary detail semua tools
│
├── 🔧 apk-analyzer.js                  # Tool #1: APK Analyzer
├── 🔧 ultimate-tester.js               # Tool #3: API Tester
├── 🔧 signature-validator.js           # Tool #4: Signature Validator
│
├── src/utils/
│   └── 🔧 AdvancedSignatureGenerator.js  # Tool #2: Signature Generator
│
├── 🔑 private_key.pem                  # RSA Private Key (sudah ada)
├── 🔑 private_key_v5.pem               # RSA Private Key v5 (sudah ada)
│
├── 📊 apk-analysis-result.json         # Output dari analyzer (akan dibuat)
└── 📊 successful-config-*.json         # Output dari tester (jika sukses)
```

---

## 🎯 WORKFLOW RECOMMENDED

```
┌─────────────────────┐
│  1. Download APK    │  ← apkpure.com/dramabox
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  2. Decompile APK   │  ← JADX GUI/CLI
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  3. Run Analyzer    │  ← node apk-analyzer.js <path>
│  Get URLs/Endpoints │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  4. Quick Test      │  ← node ultimate-tester.js quick
└──────────┬──────────┘
           ↓
      ┌────┴────┐
      │ Success?│
      └────┬────┘
           │
    No ←───┴───→ Yes
    │              │
    ↓              ↓
┌─────────────────────┐   ┌─────────────────────┐
│  5. Brute Force     │   │  6. Implement       │
│  or Intercept App   │   │  to Production      │
└─────────────────────┘   └─────────────────────┘
```

---

## 🎬 CONTOH PENGGUNAAN

### Scenario: Testing dengan Quick Mode

```bash
$ node ultimate-tester.js quick

================================================================================
⚔️  ULTIMATE DRAMABOX API CRACKER  ⚔️
================================================================================

✅ Private key loaded
⚡ QUICK TEST MODE
Testing most promising endpoints...

🎯 Testing: https://sapi.dramaboxdb.com/drama-box/chapter/list

🧪 TESTING SIGNATURES: /drama-box/chapter/list
🔸 Testing strategy: RSA
  Status: 401 Unauthorized
  Response Code: 100
  Message: Invalid signature

🔸 Testing strategy: MD5
  Status: 401 Unauthorized
  ...
```

### Scenario: Menemukan Kombinasi yang Benar

```bash
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉
💥 JACKPOT! WE FOUND IT! 💥
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉

✅ URL: https://sapi.dramaboxdb.com/drama-box/chapter/list
✅ Method: POST
✅ Strategy: rsa
✅ Payload: {"book_id":"42000003970"}

📦 Response:
{
  "status": 200,
  "data": [ ... ]
}

💾 Configuration saved to: successful-config-1706943600000.json
```

---

## 🚨 TROUBLESHOOTING

| Error | Meaning | Action |
|-------|---------|--------|
| `404 Not Found` | Endpoint salah | Coba endpoint lain |
| `401/403 Auth` | **Signature salah (tapi URL benar!)** | Fix signature method |
| `500 Internal` | Device ID/Geo-blocking | Intercept app asli |
| `Invalid Parameter` | Payload format salah | Coba payload variations |

**Tips:**
- ✅ Error `401/403` = **Good news!** URL dan endpoint sudah benar, tinggal signature.
- ✅ Jika semua gagal, intercept traffic dari app asli dengan mitmproxy
- ✅ Private key RSA adalah kunci utama - harus exact match dengan yang di APK

---

## 📚 DOCUMENTATION

### Lengkap
📖 **DRAMABOX_CRACKING_GUIDE.md** - Panduan step-by-step lengkap dari download APK sampai implementasi production

### Reference
📖 **TOOLS_SUMMARY.md** - Detail lengkap setiap tool, parameter, dan usage examples

### Quick Ref
📄 **README_CRACKING.md** (file ini) - Quick reference untuk daily usage

---

## ⚡ NEXT STEPS

### Jika Belum Mulai:
1. [ ] Download APK DramaBox terbaru
2. [ ] Decompile dengan JADX
3. [ ] Run `apk-analyzer.js`
4. [ ] Run `ultimate-tester.js quick`

### Jika Sudah Ada APK Decompile:
1. [ ] `node apk-analyzer.js D:\Path\To\APK`
2. [ ] Review `apk-analysis-result.json`
3. [ ] `node ultimate-tester.js quick`
4. [ ] Jika perlu: `node ultimate-tester.js brute`

### Jika Menemukan Kombinasi yang Berhasil:
1. [ ] Backup file `successful-config-*.json`
2. [ ] Update `DramaboxService.js` dengan config yang benar
3. [ ] Test dengan berbagai bookId
4. [ ] Implement error handling
5. [ ] Add caching & rate limiting
6. [ ] Deploy to production

---

## 🔗 EXTERNAL RESOURCES

### APK Sources:
- https://apkpure.com/dramabox/com.dramabox.app
- https://www.apkmirror.com/apk/dramabox/

### Decompile Tools:
- **JADX**: https://github.com/skylot/jadx/releases
- **APKTool**: https://ibotpeaches.github.io/Apktool/
- **Online**: https://www.javadecompilers.com/apk

### Network Interception:
- **mitmproxy**: https://mitmproxy.org/
- **Charles Proxy**: https://www.charlesproxy.com/

---

## 💪 CURRENT PROGRESS

| Task | Status | Notes |
|------|--------|-------|
| Tools Development | ✅ Complete | 4 tools ready |
| Private Key Extraction | ✅ Available | `private_key.pem` exists |
| APK Download | ⏳ Pending | User needs to download |
| APK Decompile | ⏳ Pending | Use JADX |
| API Analysis | ⏳ Pending | Run `apk-analyzer.js` |
| API Testing | ⏳ Pending | Run `ultimate-tester.js` |
| Production Impl | ⏳ Pending | After finding working combo |

---

## 🎓 TIPS & BEST PRACTICES

1. **Start Small** - Gunakan `quick` mode dulu sebelum `brute`
2. **Document Everything** - Save semua error messages untuk analisa
3. **Test Responsibly** - Jangan spam server, use delays
4. **Use Latest APK** - API bisa berubah, selalu update tools
5. **Backup Configs** - Save successful configs untuk rollback
6. **Monitor Changes** - Set up alerts jika API berubah

---

## 📞 SUPPORT

**Documentation:**
- Quick Start: README_CRACKING.md (ini)
- Full Guide: DRAMABOX_CRACKING_GUIDE.md
- Tools Detail: TOOLS_SUMMARY.md

**Files:**
- Analyzer: `apk-analyzer.js`
- Tester: `ultimate-tester.js`
- Validator: `signature-validator.js`
- Generator: `src/utils/AdvancedSignatureGenerator.js`

---

**Status**: 🔥 Ready to Rock! Tinggal download + decompile APK, lalu test!

**Good Luck! 🚀**
