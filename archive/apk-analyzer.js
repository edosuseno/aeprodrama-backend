import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * 🔍 APK DECOMPILE ANALYZER
 * Tool untuk menganalisa hasil decompile APK DramaBox dan menemukan:
 * - Base URL API
 * - Endpoint patterns
 * - Header requirements
 * - Signature algorithms
 * - Secret keys / Private keys
 */

console.log('='.repeat(80));
console.log('🔍 APK DECOMPILE ANALYZER - DRAMABOX');
console.log('='.repeat(80));
console.log('');

// Patterns yang sering ditemukan di APK Android
const PATTERNS = {
    // URL Patterns
    baseUrl: [
        /https?:\/\/[a-zA-Z0-9\-\.]+\.dramabox[a-zA-Z0-9\-\.\/]*/gi,
        /https?:\/\/[a-zA-Z0-9\-\.]+api[a-zA-Z0-9\-\.\/]*/gi,
        /https?:\/\/sapi\.[a-zA-Z0-9\-\.\/]*/gi,
        /"BASE_URL"\s*[=:]\s*"([^"]+)"/gi,
        /'BASE_URL'\s*[=:]\s*'([^']+)'/gi,
        /BASE_API\s*[=:]\s*"([^"]+)"/gi,
    ],

    // Header Keys
    headers: [
        /"p"\s*[=:]\s*"([^"]+)"/gi,  // Platform header
        /"sn"\s*[=:]/gi,              // Signature header
        /"pline"\s*[=:]/gi,           // App Type
        /"device-id"\s*[=:]/gi,       // Device ID
        /"android-id"\s*[=:]/gi,      // Android ID
        /"active-time"\s*[=:]/gi,     // Timestamp
        /X-[A-Z\-]+/gi,               // Any X- headers
    ],

    // API Endpoints
    endpoints: [
        /\/drama-box\/[a-zA-Z0-9\/\-]+/gi,
        /\/he001\/[a-zA-Z0-9\/\-]+/gi,
        /\/ap001\/[a-zA-Z0-9\/\-]+/gi,
        /\/chapter\/[a-zA-Z0-9\/\-]+/gi,
        /\/book\/[a-zA-Z0-9\/\-]+/gi,
    ],

    // Secret Keys
    secrets: [
        /"secret"\s*[=:]\s*"([^"]+)"/gi,
        /"key"\s*[=:]\s*"([^"]+)"/gi,
        /"salt"\s*[=:]\s*"([^"]+)"/gi,
        /SECRET\s*=\s*"([^"]+)"/gi,
        /API_KEY\s*=\s*"([^"]+)"/gi,
    ],

    // Signature Related
    signature: [
        /SHA256withRSA/gi,
        /MD5/gi,
        /HMAC/gi,
        /sign\(/gi,
        /signature/gi,
        /timestamp=[^&]+/gi,
    ],

    // Private Key segments (RSA)
    privateKey: [
        /-----BEGIN [A-Z\s]+ KEY-----/g,
        /-----END [A-Z\s]+ KEY-----/g,
        /MII[A-Za-z0-9+\/=]{100,}/g,  // Base64 encoded key
    ]
};

/**
 * Scan file untuk pattern tertentu
 */
function scanFile(filePath, patterns) {
    const findings = {
        file: filePath,
        urls: new Set(),
        endpoints: new Set(),
        headers: new Set(),
        secrets: new Set(),
        signatures: new Set(),
        keys: new Set()
    };

    try {
        const content = fs.readFileSync(filePath, 'utf8');

        // Scan URLs
        patterns.baseUrl.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                findings.urls.add(match[0]);
            }
        });

        // Scan Endpoints
        patterns.endpoints.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                findings.endpoints.add(match[0]);
            }
        });

        // Scan Headers
        patterns.headers.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                findings.headers.add(match[0]);
            }
        });

        // Scan Secrets
        patterns.secrets.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                if (match[1]) findings.secrets.add(match[1]);
            }
        });

        // Scan Signature methods
        patterns.signature.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                findings.signatures.add(match[0]);
            }
        });

        // Scan Private Keys
        patterns.privateKey.forEach(pattern => {
            const matches = content.matchAll(pattern);
            for (const match of matches) {
                findings.keys.add(match[0]);
            }
        });

    } catch (error) {
        // Skip unreadable files
    }

    return findings;
}

/**
 * Scan directory secara rekursif
 */
function scanDirectory(dirPath, extensions = ['.java', '.smali', '.xml', '.js', '.json'], maxDepth = 10, currentDepth = 0) {
    const allFindings = {
        urls: new Set(),
        endpoints: new Set(),
        headers: new Set(),
        secrets: new Set(),
        signatures: new Set(),
        keys: new Set(),
        filesScanned: 0
    };

    if (currentDepth > maxDepth) return allFindings;

    try {
        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Rekursif scan subdirectory
                const subFindings = scanDirectory(fullPath, extensions, maxDepth, currentDepth + 1);

                // Merge findings
                subFindings.urls.forEach(u => allFindings.urls.add(u));
                subFindings.endpoints.forEach(e => allFindings.endpoints.add(e));
                subFindings.headers.forEach(h => allFindings.headers.add(h));
                subFindings.secrets.forEach(s => allFindings.secrets.add(s));
                subFindings.signatures.forEach(sig => allFindings.signatures.add(sig));
                subFindings.keys.forEach(k => allFindings.keys.add(k));
                allFindings.filesScanned += subFindings.filesScanned;

            } else if (stat.isFile()) {
                const ext = path.extname(fullPath).toLowerCase();

                if (extensions.includes(ext)) {
                    const findings = scanFile(fullPath, PATTERNS);

                    // Merge ke allFindings
                    findings.urls.forEach(u => allFindings.urls.add(u));
                    findings.endpoints.forEach(e => allFindings.endpoints.add(e));
                    findings.headers.forEach(h => allFindings.headers.add(h));
                    findings.secrets.forEach(s => allFindings.secrets.add(s));
                    findings.signatures.forEach(sig => allFindings.signatures.add(sig));
                    findings.keys.forEach(k => allFindings.keys.add(k));
                    allFindings.filesScanned++;

                    // Progress indicator
                    if (allFindings.filesScanned % 100 === 0) {
                        process.stdout.write(`\r🔍 Scanned ${allFindings.filesScanned} files...`);
                    }
                }
            }
        }
    } catch (error) {
        // Skip inaccessible directories
    }

    return allFindings;
}

/**
 * Generate report dari findings
 */
function generateReport(findings) {
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 ANALYSIS REPORT');
    console.log('='.repeat(80));
    console.log(`Files Scanned: ${findings.filesScanned}`);
    console.log('');

    // Base URLs Found
    console.log('🌐 BASE URLs FOUND:');
    if (findings.urls.size > 0) {
        Array.from(findings.urls).forEach((url, i) => {
            console.log(`  ${i + 1}. ${url}`);
        });
    } else {
        console.log('  ❌ No URLs found');
    }
    console.log('');

    // Endpoints Found
    console.log('🎯 API ENDPOINTS FOUND:');
    if (findings.endpoints.size > 0) {
        Array.from(findings.endpoints).forEach((endpoint, i) => {
            console.log(`  ${i + 1}. ${endpoint}`);
        });
    } else {
        console.log('  ❌ No endpoints found');
    }
    console.log('');

    // Headers Found
    console.log('📋 HEADERS FOUND:');
    if (findings.headers.size > 0) {
        Array.from(findings.headers).forEach((header, i) => {
            console.log(`  ${i + 1}. ${header}`);
        });
    } else {
        console.log('  ❌ No headers found');
    }
    console.log('');

    // Secrets/Keys Found
    console.log('🔑 SECRETS/KEYS FOUND:');
    if (findings.secrets.size > 0) {
        Array.from(findings.secrets).forEach((secret, i) => {
            console.log(`  ${i + 1}. ${secret}`);
        });
    } else {
        console.log('  ❌ No secrets found');
    }
    console.log('');

    // Signature Methods
    console.log('✍️ SIGNATURE METHODS FOUND:');
    if (findings.signatures.size > 0) {
        Array.from(findings.signatures).forEach((sig, i) => {
            console.log(`  ${i + 1}. ${sig}`);
        });
    } else {
        console.log('  ❌ No signature methods found');
    }
    console.log('');

    // Private Keys
    console.log('🔐 PRIVATE KEYS FOUND:');
    if (findings.keys.size > 0) {
        console.log(`  ✅ Found ${findings.keys.size} potential key(s)`);
        Array.from(findings.keys).forEach((key, i) => {
            console.log(`  ${i + 1}. ${key.substring(0, 80)}...`);
        });
    } else {
        console.log('  ❌ No private keys found');
    }
    console.log('');

    // Export to JSON
    const exportData = {
        urls: Array.from(findings.urls),
        endpoints: Array.from(findings.endpoints),
        headers: Array.from(findings.headers),
        secrets: Array.from(findings.secrets),
        signatures: Array.from(findings.signatures),
        keys: Array.from(findings.keys),
        scannedAt: new Date().toISOString(),
        filesScanned: findings.filesScanned
    };

    const outputPath = path.join(process.cwd(), 'apk-analysis-result.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`💾 Full report saved to: ${outputPath}`);
    console.log('');

    // Generate test code
    generateTestCode(exportData);
}

/**
 * Generate test code from findings
 */
function generateTestCode(data) {
    console.log('='.repeat(80));
    console.log('🎯 GENERATED TEST CODE');
    console.log('='.repeat(80));
    console.log('');

    console.log('// Copy kode ini ke file test baru:');
    console.log('');
    console.log('const BASE_URLS = [');
    data.urls.slice(0, 10).forEach(url => {
        console.log(`    '${url}',`);
    });
    console.log('];');
    console.log('');

    console.log('const ENDPOINTS = [');
    data.endpoints.slice(0, 10).forEach(endpoint => {
        console.log(`    '${endpoint}',`);
    });
    console.log('];');
    console.log('');

    console.log('const HEADERS = {');
    data.headers.slice(0, 15).forEach(header => {
        const cleanHeader = header.replace(/["\s]/g, '');
        console.log(`    '${cleanHeader}': 'VALUE_HERE',`);
    });
    console.log('};');
    console.log('');

    if (data.secrets.length > 0) {
        console.log('const SECRETS = [');
        data.secrets.slice(0, 5).forEach(secret => {
            console.log(`    '${secret}',`);
        });
        console.log('];');
        console.log('');
    }
}

// ===== MAIN EXECUTION =====

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('📖 USAGE:');
        console.log('  node apk-analyzer.js <path-to-decompiled-apk-folder>');
        console.log('');
        console.log('📝 EXAMPLE:');
        console.log('  node apk-analyzer.js ./dramabox-decompiled');
        console.log('  node apk-analyzer.js D:\\APK\\dramabox-app');
        console.log('');
        console.log('💡 TIPS:');
        console.log('  1. Download APK DramaBox dari APKPure atau APKMirror');
        console.log('  2. Decompile dengan JADX atau apktool');
        console.log('  3. Jalankan tool ini untuk mengekstrak info API');
        console.log('  4. Gunakan hasil analisa untuk membuat test script');
        console.log('');
        console.log('🔗 TOOLS:');
        console.log('  - JADX: https://github.com/skylot/jadx');
        console.log('  - APKTool: https://ibotpeaches.github.io/Apktool/');
        console.log('');
        return;
    }

    const targetPath = args[0];

    if (!fs.existsSync(targetPath)) {
        console.error(`❌ Error: Path tidak ditemukan: ${targetPath}`);
        console.log('');
        console.log('💡 Pastikan path sudah benar dan folder decompile sudah ada.');
        return;
    }

    console.log(`📂 Target: ${targetPath}`);
    console.log('🚀 Starting scan...');
    console.log('');

    const findings = scanDirectory(targetPath);

    generateReport(findings);

    console.log('='.repeat(80));
    console.log('✅ ANALYSIS COMPLETE!');
    console.log('='.repeat(80));
    console.log('');
    console.log('📌 NEXT STEPS:');
    console.log('  1. Review apk-analysis-result.json untuk semua findings');
    console.log('  2. Gunakan URLs dan endpoints yang ditemukan di test script');
    console.log('  3. Implementasikan signature algorithm berdasarkan findings');
    console.log('  4. Test dengan endpoint yang paling promising terlebih dahulu');
    console.log('');
}

main();
