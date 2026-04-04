# 🎯 ULTIMATE DRAMABOX API CRACKING GUIDE

Panduan lengkap untuk reverse-engineer dan mengakses API resmi DramaBox menggunakan tool-tool yang telah dibuat.

---

## 📋 DAFTAR ISI

1. [Prerequisites](#prerequisites)
2. [Step 1: Download & Decompile APK](#step-1-download--decompile-apk)
3. [Step 2: Analisa APK](#step-2-analisa-apk)
4. [Step 3: Testing API](#step-3-testing-api)
5. [Step 4: Implementasi](#step-4-implementasi)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Tools yang Dibutuhkan:

1. **JADX** (Java Decompiler)
   - Download: https://github.com/skylot/jadx/releases
   - Atau gunakan online: https://www.javadecompilers.com/

2. **APKPure/APKMirror** (untuk download APK)
   - APKPure: https://apkpure.com/
   - APKMirror: https://www.apkmirror.com/

3. **Node.js** (sudah terinstall)

### File-file Tool:

- ✅ `apk-analyzer.js` - Menganalisa hasil decompile APK
- ✅ `src/utils/AdvancedSignatureGenerator.js` - Generate signature
- ✅ `ultimate-tester.js` - Testing comprehensive

---

## Step 1: Download & Decompile APK

### 1.1 Download APK DramaBox Terbaru

```bash
# Buka browser dan download dari:
# https://apkpure.com/dramabox/com.dramabox.app
# atau
# https://www.apkmirror.com/apk/dramabox/

# Simpan ke folder, misalnya:
# D:\APK\dramabox-v3.1.2.apk
```

### 1.2 Decompile dengan JADX

**Cara 1: Menggunakan JADX GUI (Mudah)**

1. Download JADX GUI dari https://github.com/skylot/jadx/releases
2. Extract dan jalankan `jadx-gui.bat`
3. Buka APK dengan menu "File > Open Files"
4. Tunggu proses decompile selesai
5. Save semua source: "File > Save All" → Pilih folder output, misal `D:\APK\dramabox-decompiled`

**Cara 2: Menggunakan JADX CLI**

```bash
# Download jadx
# Extract file jadx

# Decompile
jadx -d D:\APK\dramabox-decompiled D:\APK\dramabox-v3.1.2.apk

# Tunggu sampai selesai
```

**Cara 3: Online Decompiler (Jika APK kecil)**

1. Buka https://www.javadecompilers.com/apk
2. Upload APK
3. Download hasil decompile

### 1.3 Struktur Folder Hasil Decompile

Setelah decompile, struktur folder biasanya seperti ini:

```
dramabox-decompiled/
├── sources/               # Source code Java
│   ├── com/
│   │   ├── dramabox/
│   │   │   ├── app/
│   │   │   ├── api/       ⭐ PENTING! Cek folder ini
│   │   │   ├── network/   ⭐ PENTING! Cek folder ini
│   │   │   ├── utils/     ⭐ PENTING! Cek folder ini
│   └── ...
├── resources/            # Resource files
└── assets/              # Asset files
```

---

## Step 2: Analisa APK

### 2.1 Jalankan APK Analyzer

```bash
cd D:\aeprodrama\backend

# Jalankan analyzer dengan path ke folder decompile
node apk-analyzer.js D:\APK\dramabox-decompiled
```

### 2.2 Output yang Dihasilkan

Tool akan:
1. Scan semua file `.java`, `.smali`, `.xml`, `.js`, `.json`
2. Mencari pattern:
   - Base URLs API
   - API Endpoints
   - Header requirements
   - Secret keys
   - Signature algorithms
   - Private keys RSA

3. Generate file `apk-analysis-result.json` dengan semua findings

### 2.3 Review Hasil Analisa

Buka file `apk-analysis-result.json`:

```json
{
  "urls": [
    "https://sapi.dramaboxdb.com",
    "https://api.dramabox.com",
    ...
  ],
  "endpoints": [
    "/drama-box/chapter/list",
    "/he001/rank",
    ...
  ],
  "headers": [
    "p",
    "sn",
    "device-id",
    ...
  ],
  "secrets": [
    "some_secret_key",
    ...
  ]
}
```

### 2.4 Manual Analysis (Tambahan)

Jika analyzer tidak menemukan cukup info, cari manual:

**Cari Base URL:**
```bash
cd D:\APK\dramabox-decompiled\sources

# Windows PowerShell
Get-ChildItem -Recurse -Filter *.java | Select-String "https://" | Select-Object -First 20

# Atau buka file-file ini di text editor:
# - com/dramabox/api/ApiConfig.java
# - com/dramabox/network/NetworkConfig.java
# - com/dramabox/BuildConfig.java
```

**Cari Signature Method:**
```bash
# Cari file yang mengandung "signature" atau "sign"
Get-ChildItem -Recurse -Filter *.java | Select-String "signature" -CaseSensitive | Select-Object -First 20

# File yang biasanya penting:
# - SignatureUtil.java
# - RequestInterceptor.java
# - ApiClient.java
```

**Cari Private Key:**
```bash
# Cari RSA key
Get-ChildItem -Recurse -Filter *.java | Select-String "BEGIN.*KEY" | Select-Object -First 10

# Cari di assets/resources juga
Get-ChildItem -Path "D:\APK\dramabox-decompiled\resources" -Recurse | Select-String "BEGIN"
```

---

## Step 3: Testing API

### 3.1 Quick Test (Cepat)

Test endpoint-endpoint paling promising:

```bash
cd D:\aeprodrama\backend

node ultimate-tester.js quick
```

Output akan menunjukkan:
- Setiap endpoint yang dicoba
- Signature strategy yang digunakan
- Response status dan message
- **SUKSES jika menemukan kombinasi yang benar!**

### 3.2 Debug Mode

Lihat detail signature generation:

```bash
node ultimate-tester.js debug
```

Output menunjukkan:
- Signature string yang di-generate
- Semua variasi signature (RSA, MD5, SHA256, HMAC)
- cURL command siap pakai untuk testing manual

### 3.3 Brute Force Mode (Komprehensif)

Test semua kombinasi yang mungkin:

```bash
node ultimate-tester.js brute
```

⚠️ **Warning:** Ini akan testing ribuan kombinasi, mungkin takes 10-30 menit!

Tool akan otomatis:
- Test semua base URLs
- Test semua endpoints
- Test semua payloads
- Test semua signature strategies
- Test GET dan POST methods

**Jika menemukan kombinasi yang berhasil:**
- Tool otomatis save ke file `successful-config-{timestamp}.json`
- Tool akan berhenti dan menampilkan konfigurasi sukses

### 3.4 Manual Testing dengan cURL

Jika ingin test manual:

```bash
# Generate cURL command dulu
node ultimate-tester.js debug

# Copy cURL command yang muncul, edit endpoint dan body
# Lalu paste ke terminal
```

---

## Step 4: Implementasi

### 4.1 Jika Menemukan Kombinasi yang Berhasil

File `successful-config-{timestamp}.json` berisi:

```json
{
  "baseUrl": "https://sapi.dramaboxdb.com",
  "endpoint": "/drama-box/chapter/list",
  "method": "POST",
  "strategy": "rsa",
  "headers": { ... },
  "payload": { ... },
  "sampleResponse": { ... }
}
```

### 4.2 Update Service Production

Edit file `backend/src/services/DramaboxService.js`:

```javascript
import AdvancedSignatureGenerator from '../utils/AdvancedSignatureGenerator.js';

class DramaboxService {
  constructor() {
    this.baseUrl = 'URL_YANG_BERHASIL'; // Dari successful-config
    this.sigGen = new AdvancedSignatureGenerator();
  }
  
  async getEpisodes(bookId) {
    const payload = {
      book_id: bookId,
      page_num: 1,
      page_size: 100
    };
    
    const headers = this.sigGen.generateHeaders(payload, '', 'STRATEGY_YANG_BERHASIL');
    
    const response = await axios.post(
      `${this.baseUrl}/ENDPOINT_YANG_BERHASIL`,
      payload,
      { headers }
    );
    
    return response.data;
  }
}
```

### 4.3 Test Service

```bash
# Test dengan backend server
cd D:\aeprodrama\backend
npm start

# Di terminal lain, test endpoint:
curl http://localhost:5001/api/dramabox/allepisode/42000003970
```

---

## Troubleshooting

### Problem 1: APK Analyzer Tidak Menemukan Apa-apa

**Solusi:**
1. Pastikan path decompile benar
2. Coba decompile ulang dengan tool berbeda
3. Manual search dengan keyword:
   ```
   "sapi.dramabox"
   "signature"
   "private_key"
   "BASE_URL"
   ```

### Problem 2: Semua Test Gagal dengan "Invalid Parameter"

**Solusi:**
1. Cek apakah private key sudah benar di `backend/private_key.pem`
2. Coba strategy berbeda: RSA → MD5 → SHA256 → HMAC
3. Analisa error message untuk clue
4. Cek apakah perlu header tambahan

### Problem 3: Test Gagal dengan "401 Unauthorized" atau "403 Forbidden"

**Solusi:**
1. ✅ **GOOD NEWS!** Ini berarti endpoint dan base URL BENAR!
2. Masalahnya di signature
3. Cek:
   - Apakah private key benar?
   - Apakah signature string format benar?
   - Apakah timestamp format benar?
   - Apakah device ID valid?

### Problem 4: Private Key Tidak Ditemukan

**Solusi:**

**Manual Search di APK:**

1. Buka JADX GUI
2. Search (Ctrl+F): "BEGIN PRIVATE KEY" atau "BEGIN RSA"
3. Atau search: "MII" (RSA keys biasanya dimulai dengan MII)
4. Cek file-file ini:
   - `assets/keys/`
   - `resources/raw/`
   - `BuildConfig.java`
   - File yang namanya mengandung "key", "secret", "cert"

**Atau Extract dari String Resources:**

```bash
# Cari di strings.xml
Get-ChildItem -Path "D:\APK\dramabox-decompiled\resources" -Filter "strings.xml" -Recurse | Select-String "BEGIN"
```

**Reconstruct dari Segments:**

Kadang private key di-split jadi beberapa bagian:

```java
// Contoh di code:
String part1 = "MIIEvQIBADANB..."
String part2 = "gQEAkR2..."
String key = part1 + part2;
```

Jika menemukan pattern ini, reconstruct manual.

### Problem 5: Response "Internal Server Error" (Status 100/500)

**Kemungkinan:**
1. Server-side validation (geo-blocking, IP check)
2. Device ID belum terdaftar
3. Perlu handshake/bootstrap dulu

**Solusi:**
1. Coba endpoint `/ap001/bootstrap` dulu
2. Coba ubah device ID ke device ID dari emulator Android
3. Gunakan VPN dengan IP dari negara yang supported
4. Intercept traffic langsung dari app asli dengan mitmproxy

---

## Advanced: Network Interception

Jika semua cara di atas gagal, intercept traffic langsung dari app:

### Setup mitmproxy

```bash
# Install mitmproxy
pip install mitmproxy

# Jalankan
mitmweb

# Setup Android emulator/device untuk use proxy (localhost:8080)
# Browse ke mitm.it dan install certificate

# Buka app DramaBox dan browse content
# Lihat semua request di mitmweb interface http://localhost:8081
```

Dari sini bisa lihat:
- URL exact yang dipanggil
- Header exact yang digunakan
- Signature yang di-generate
- Response format

---

## Tips & Best Practices

1. **Mulai dari Quick Test** - Jangan langsung brute force
2. **Simpan semua findings** - Dokumentasikan setiap clue yang ditemukan
3. **Test di jam low-traffic** - Avoid rate limiting
4. **Use VPN jika perlu** - Beberapa API geo-restricted
5. **Bandingkan dengan app asli** - Intercept app traffic sebagai reference
6. **Update APK berkala** - API bisa berubah, decompile versi terbaru

---

## Next Steps Setelah Berhasil

1. ✅ Implementasi ke production service
2. ✅ Add caching untuk rate limiting
3. ✅ Add fallback ke aggregator API (Sansekai/Megawe)
4. ✅ Monitor untuk perubahan API
5. ✅ Dokumentasi konfigurasi untuk team

---

## Resources

- **JADX**: https://github.com/skylot/jadx
- **APKTool**: https://ibotpeaches.github.io/Apktool/
- **mitmproxy**: https://mitmproxy.org/
- **APKPure**: https://apkpure.com/
- **APKMirror**: https://www.apkmirror.com/

---

**Good luck! 🍀**

Jika menemukan yang berhasil, dokumentasikan dan share ke team!
