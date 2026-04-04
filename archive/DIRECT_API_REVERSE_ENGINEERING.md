# DramaBox API Reverse Engineering Report

## 1. API Architecture
- **Base Domain**: `https://sapi.dramaboxdb.com`
- **Path Prefix**: `/drama-box`
- **Auth Strategy**: RSA-SHA256 Signature (`sn`) + Platform ID (`p`)

## 2. Signature Algorithm (sn)
Signature dibuat dengan menandai (signing) string mentah menggunakan **RSA Private Key** (SHA256withRSA).

### Template String Signature:
```text
timestamp={ts}{body}{deviceId}{androidId}{token}
```
**Komponen:**
1. `{ts}`: Timestamp millisecond (sama dengan query param `timestamp` dan header `active-time`).
2. `{body}`: JSON string dari request body (harus minified, tanpa spasi). Jika tidak ada body, gunakan string kosong `""`.
3. `{deviceId}`: ID unik perangkat (format: `ffffffff...`).
4. `{androidId}`: Android ID (format: `d2d40675ca3d9e03`).
5. `{token}`: Nilai dari header `tn`. Gunakan string kosong `""` jika belum login.

## 3. Mandatory Headers
Setiap request wajib menyertakan header berikut agar tidak dianggap "Illegal Parameter":

| Header | Key | Value / Source |
| :--- | :--- | :--- |
| **Platform** | `p` | `android` (atau nilai obfuscated dari `OFIfyPR`) |
| **Signature** | `sn` | Hasil RSA Sign (Base64) |
| **App Type** | `pline` | `ANDROID` |
| **Version Name** | `vn` | `3.1.2` |
| **Version Code**| `version` | `312` |
| **Device ID** | `device-id`| Sesuai yang di-sign |
| **Android ID** | `android-id`| Sesuai yang di-sign |
| **Timestamp** | `active-time`| Sama dengan `{ts}` |

## 4. Discovered Endpoints
Berdasarkan investigasi `yd/l.java`:
- **Ranking**: `/he001/rank` (Body: `{"rankType":3}`)
- **Bootstrap**: `/ap001/bootstrap` (Body: `{"distinctId":"..."}`)
- **Theater**: `/he001/theater`
- **Config**: `/ap001/confload`

## 5. Current Blockers
- **Status 100**: Server mengembalikan "Internal Server Error" (服务器内部错误) meskipun signature valid.
- **Hypothesis**: Server melakukan validasi IP (Geo-blocking) atau membutuhkan `device-id` yang sudah terdaftar melalui proses handshake Google Play.

## 6. Implementation (Node.js)
Gunakan file `backend/src/utils/SignatureGeneratorV2.js` untuk membuat signature secara programmatis.
