const fs = require('fs');

// BAGIAN 1: STRING MENTAH DARI SOURCE CODE (d5/dramaboxapp.java)
// Kita harus menyatukan potongan-potongan string dengan PRECISI TINGGI.
const part1 = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC9Q4Y5QX5j08HrnbY3irfKdkEllAU2OORnAjlXDyCzcm2Z6ZRrGvtTZUAMelfU5PWS6XGEm3d4kJEKbXi4Crl8o2E/E3YJPk1lQD1d0JTdrvZleETN1ViHZFSQwS3L94Woh0E3TPebaEYq88eExvKu1tDdjSoFjBbgMezySnas5Nc2xF28";

// Bagian tengah yang terenkripsi (Caesar Cipher)
const encryptedMiddle = "l|d,WL$EI,?xyw+*)^#?U`[whXlG`-GZif,.jCxbKkaY\"{w*y]_jax^/1iVDdyg(Wbz+z/$xVjCiH0lZf/d|%gZglW)\"~J,^~}w\"}m(E'eEunz)eyEy`XGaVF|_(Kw)|awUG\"'{{e#%$0E.ffHVU++$giHzdvC0ZLXG|U{aVUUYW{{YVU^x),J'If`nG|C[`ZF),xLv(-H'}ZIEyCfke0dZ%aU[V)\"V0}mhKvZ]Gw%-^a|m'`\\f}{(~kzi&zjG+|fXX0$IH#j`+hfnME\"|fa/{.j.xf,\"LZ.K^bZy%c.W^/v{x#(J},Ua,ew#.##K(ki)$LX{a-1\\MG/zL&JlEKEw'Hg|D&{EfuKYM[nGKx1V#lFu^V_LjVzw+n%+,Xd";

const part3 = "x52e71nafqfbjXxZuEtpu92oJd6A9mWbd0BZTk72ZHUmDcKcqjfcEH19SWOphMJFYkxU5FRoIEr3/zisyTO4Mt33ZmwELOrY9PdlyAAyed7ZoH+hlTr7c025QROvb2LmqgRiUT56tMECgYEA+jH5m6iMRK6XjiBhSUnlr3DzRybwlQrtIj5sZprWe2my5uYHG3jbViYIO7GtQvMTnDrBCxNhuM6dPrL0cRnbsp/iBMXe3pyjT/aWveBkn4R+UpBsnbtDn28r1MZpCDtr5UNc0TPj4KFJvjnV/e8oGoyYEroECqcw1LqNOGDiLhkCgYEAwaemNePYrXW+MVX/hatfLQ96tpxwf7yuHdENZ2q5AFw73GJWYvC8VY+TcoKPAmeoCUMltI3TrS6K5Q/GoLd5K2BsoJrSxQNQFd3ehWAtdOuPDvQ5rn/2fsvgvc3rOvJh7uNnwEZCI/45WQg+UFWref4PPc+ArNtp9Xj2y7LndwkCgYARojIQeXmhYZjG6JtSugWZLuHGkwUDzChYcIPd";
const part4 = "W25gdluokG/RzNvQn4+W/XfTryQjr7RpXm1VxCIrCBvYWNU2KrSYV4XUtL+B5ERNj6In6AOrOAifuVITy5cQQQeoD+AT4YKKMBkQfO2gnZzqb8+ox130e+3K/mufoqJPZeyrCQKBgC2fobjwhQvYwYY+DIUharri+rYrBRYTDbJYnh/PNOaw1CmHwXJt5PEDcml3+NlIMn58I1X2U/hpDrAIl3MlxpZBkVYFI8LmlOeR7ereTddN59ZOE4jY/OnCfqA480Jf+FKfoMHby5lPO5OOLaAfjtae1FhrmpUe3EfIx9wVuhKBAoGBAPFzHKQZbGhkqmyPW2ctTEIWLdUHyO37fm8dj1WjN4wjRAI4ohNiKQJRh3QE11E1PzBTl9lZVWT8QtEsSjnrA/tpGr378fcUT7WGBgTmBRaAnv1P1n/Tp0TSvh5XpIhhMuxcitIgrhYMIG3GbP9JNAarxO/qPW6Gi0xWaF7il7Or";

// BAGIAN 2: DEKRIPSI CAESAR CIPHER (-20 dengan WRAPPING)
// Logic dari d5/l.java:
// char c10 = (char) (charAt - 20);
// if (c10 < '!') { sb.append((char) ((c10 + '~') - 33)); } else { sb.append(c10); }

function decrypt(str) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const charCode = char.charCodeAt(0);

        // Hanya proses printable characters yang biasa diobfuscate
        if (charCode >= 33 && charCode <= 126) {
            let shifted = charCode - 20;

            // HANDLE WRAP AROUND! (INI YANG DULU KITA HILANGKAN)
            if (shifted < 33) { // 33 adalah '!'
                // Rumus Java: (c10 + '~') - 33
                // '~' adalah 126
                shifted = (shifted + 126) - 33;
            }

            result += String.fromCharCode(shifted);
        } else {
            result += char;
        }
    }
    return result;
}

// BAGIAN 3: EKSEKUSI
console.log('🔓 DECRYPTING KEY PART 2 (FIXED LOGIC)...');
const decryptedPart2 = decrypt(encryptedMiddle);

console.log('✅ Decrypted Part Preview:', decryptedPart2.substring(0, 50) + '...');

// Gabungkan Semua
const fullKeyBody = part1 + decryptedPart2 + part3 + part4;

// Format ke standar PEM (Header & Footer)
const pemKey = `-----BEGIN PRIVATE KEY-----\n${fullKeyBody}\n-----END PRIVATE KEY-----`;

console.log(`🔑 FULL KEY LENGTH: ${fullKeyBody.length}`);
console.log(`📄 SAVING TO 'private_key.pem'...`);

fs.writeFileSync('private_key.pem', pemKey);

console.log('✅ DONE! New Private Key extracted successfully.');
