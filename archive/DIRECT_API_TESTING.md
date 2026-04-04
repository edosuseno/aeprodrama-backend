# 🎯 Direct DramaBox API Testing Guide

## 📋 Overview
Service eksperimental untuk hit langsung ke API Official DramaBox dengan berbagai strategi signature dan authentication.

## 🔧 Cara Testing

### 1. Start Backend
Pastikan backend sudah running di `http://localhost:5001`

### 2. Testing Endpoints

#### Test Trending
```bash
curl http://localhost:5001/api/directapi/test/trending
```

#### Test Detail
```bash
curl http://localhost:5001/api/directapi/test/detail/42000004347
```

#### Test Episodes
```bash
curl http://localhost:5001/api/directapi/test/episodes/42000004347
```

#### Test Search
```bash
curl "http://localhost:5001/api/directapi/test/search?query=love"
```

## 📊 Monitoring Logs

Saat Anda menjalankan test, pantau terminal backend. Anda akan melihat:

### Format Log
```
🎯 [DirectAPI] Aggressive request to: /drama/detail/12345
  🔸 Trying: v1 with signature_v1
  ❌ 403: Forbidden
  🔸 Trying: v1 with signature_v2
  ❌ 401: Unauthorized
  🔸 Trying: v2 with premium_bypass
  🔐 Auth required (401) - Headers might be close!
  💬 Message: Invalid signature
  ...
  ✅ SUCCESS! https://api.dramaboxdb.com/api/v1 with signature_v3
  📦 Response sample: {"success":true,"data":{"bookId":"12345"...
```

## 🔍 Analisis Hasil

### Success (200)
Jika ada yang berhasil, perhatikan:
- Base URL yang berhasil
- Strategy signature yang berhasil
- Format response

**ACTION**: Simpan kombinasi yang berhasil!

### Auth Required (401/403)
Ini berarti kita "hampir" benar:
- Base URL kemungkinan benar
- Endpoint path benar
- Tapi signature salah

**ACTION**: Analisis error message untuk clue

### Not Found (404)
- Base URL atau endpoint path salah
- Coba endpoint lain

### Connection Error
- Base URL tidak valid
- API mungkin tidak exist

## 🎨 Signature Strategies

Service ini mencoba 5 strategi:

1. **default**: Basic signature MD5
2. **signature_v1**: MD5 dengan Bearer token
3. **signature_v2**: SHA256 dengan custom token
4. **signature_v3**: HMAC-SHA256 (paling secure)
5. **premium_bypass**: Headers bypass untuk unlock premium

## 🔑 Secret Keys Testing

Service mencoba 5 kandidat secret key:
1. `dramabox_2024_secret`
2. `DB@2024#Secret`
3. `dramabox_app_key`
4. `db_mobile_secret`
5. `1234567890abcdef`

## 📝 Custom Testing

Jika Anda menemukan clue dari error message, edit file:
`backend/src/services/DirectDramaboxService.js`

Tambahkan:
- Secret key baru di `this.possibleSecrets`
- Base URL baru di `this.apiCandidates`
- Endpoint path baru di method `getDetail()`, `getEpisodes()`, dll

## 🎯 Next Steps

### Jika Menemukan Kombinasi yang Berhasil:
1. Catat base URL + strategy yang work
2. Update `DramaboxService.js` untuk menggunakan kombinasi tersebut
3. Test dengan berbagai bookId untuk validasi
4. Implementasikan ke production

### Jika Semua Gagal:
1. Cek error messages untuk clue
2. Coba reverse-engineer APK DramaBox
3. Gunakan mitmproxy untuk intercept app traffic
4. Tetap gunakan aggregator API (Sansekai/Megawe) sebagai fallback

## 🚀 Advanced: APK Decompile

Jika testing manual gagal, gunakan tools:
```bash
# Download APK
wget https://...dramabox.apk

# Decompile dengan apktool
apktool d dramabox.apk

# Cari base URL dan secret
grep -r "api.dramabox" dramabox/
grep -r "signature" dramabox/
grep -r "secret" dramabox/
```

## 📞 Support

Jika menemukan kombinasi yang berhasil atau butuh bantuan, dokumentasikan:
- Base URL yang work
- Strategy yang work
- Format request & response
- Error messages yang muncul

Good luck! 🍀
