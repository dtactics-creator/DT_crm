import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env first before loading modules
const envPath = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, 'backend', '.env');

dotenv.config({ path: envPath });

async function runTests() {
  console.log('====================================================');
  console.log('  SERVERBYT MEDIA STORAGE MIGRATION — PHASE 1 TESTS');
  console.log('====================================================\n');

  const { default: storageService } = await import('./services/storage/storage-service.js');
  const { default: serverbytStorage } = await import('./services/storage/serverbyt-storage.js');

  const testResults = [];

  function recordResult(testName, passed, details = {}) {
    testResults.push({ testName, passed, ...details });
    console.log(`${passed ? '✅ [PASS]' : '❌ [FAIL]'} ${testName}`);
    if (details.message) console.log(`   └─ ${details.message}`);
    if (details.url) console.log(`   └─ URL: ${details.url}`);
    if (details.hash) console.log(`   └─ SHA256: ${details.hash}`);
  }

  // 1. TEST 1: Small JPG Image Upload & Hash Match
  try {
    const jpgBuffer = Buffer.from('FFD8FFE000104A46494600010101006000600000FFFE0017536572766572627974204A504720546573742046696C65FFD9', 'hex');
    const originalHash = crypto.createHash('sha256').update(jpgBuffer).digest('hex');

    const uploadRes = await storageService.upload({
      buffer: jpgBuffer,
      originalName: 'test-photo.jpg',
      mimeType: 'image/jpeg',
      folder: 'campaigns',
    });

    const httpRes = await fetch(uploadRes.url);
    const downloadedBuffer = Buffer.from(await httpRes.arrayBuffer());
    const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');

    const match = originalHash === downloadedHash && jpgBuffer.length === downloadedBuffer.length;
    recordResult('TEST 1: Small JPG Upload & Byte/Hash Verification', match, {
      url: uploadRes.url,
      hash: originalHash,
      message: `Size: ${jpgBuffer.length} bytes == ${downloadedBuffer.length} bytes. Hash Match: ${match}`,
    });

    await storageService.delete(uploadRes.url);
  } catch (err) {
    recordResult('TEST 1: Small JPG Upload & Byte/Hash Verification', false, { message: err.message });
  }

  // 2. TEST 2: PNG Image Upload
  try {
    const pngBuffer = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DDB0000000049454E44AE426082', 'hex');
    const originalHash = crypto.createHash('sha256').update(pngBuffer).digest('hex');

    const uploadRes = await storageService.upload({
      buffer: pngBuffer,
      originalName: 'test-icon.png',
      mimeType: 'image/png',
      folder: 'campaigns',
    });

    const httpRes = await fetch(uploadRes.url);
    const downloadedBuffer = Buffer.from(await httpRes.arrayBuffer());
    const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');

    const match = originalHash === downloadedHash;
    recordResult('TEST 2: PNG Image Upload', match, {
      url: uploadRes.url,
      hash: originalHash,
      message: `Size: ${pngBuffer.length} bytes == ${downloadedBuffer.length} bytes`,
    });

    await storageService.delete(uploadRes.url);
  } catch (err) {
    recordResult('TEST 2: PNG Image Upload', false, { message: err.message });
  }

  // 3. TEST 3: PDF Document Upload & Byte Match
  try {
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Serverbyt PDF Test) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n', 'utf8');
    const originalHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    const uploadRes = await storageService.upload({
      buffer: pdfBuffer,
      originalName: 'proposal.pdf',
      mimeType: 'application/pdf',
      folder: 'campaigns',
    });

    const httpRes = await fetch(uploadRes.url);
    const downloadedBuffer = Buffer.from(await httpRes.arrayBuffer());
    const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');

    const match = originalHash === downloadedHash;
    recordResult('TEST 3: PDF Document Upload', match, {
      url: uploadRes.url,
      hash: originalHash,
      message: `Size: ${pdfBuffer.length} bytes == ${downloadedBuffer.length} bytes`,
    });

    await storageService.delete(uploadRes.url);
  } catch (err) {
    recordResult('TEST 3: PDF Document Upload', false, { message: err.message });
  }

  // 4. TEST 4: MP3 Audio Upload
  try {
    const audioBuffer = Buffer.from('ID30300000000A544954320000000B000000536572766572627974417564696F', 'hex');
    const originalHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');

    const uploadRes = await storageService.upload({
      buffer: audioBuffer,
      originalName: 'sample-tune.mp3',
      mimeType: 'audio/mpeg',
      folder: 'campaigns',
    });

    const httpRes = await fetch(uploadRes.url);
    const downloadedBuffer = Buffer.from(await httpRes.arrayBuffer());
    const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');

    const match = originalHash === downloadedHash;
    recordResult('TEST 4: MP3 Audio Upload', match, {
      url: uploadRes.url,
      hash: originalHash,
      message: `Size: ${audioBuffer.length} bytes == ${downloadedBuffer.length} bytes`,
    });

    await storageService.delete(uploadRes.url);
  } catch (err) {
    recordResult('TEST 4: MP3 Audio Upload', false, { message: err.message });
  }

  // 5. TEST 5: MP4 Video Upload
  try {
    const videoBuffer = Buffer.from('00000018667479706D703432000000006D70343169736F6D', 'hex');
    const originalHash = crypto.createHash('sha256').update(videoBuffer).digest('hex');

    const uploadRes = await storageService.upload({
      buffer: videoBuffer,
      originalName: 'demo-video.mp4',
      mimeType: 'video/mp4',
      folder: 'campaigns',
    });

    const httpRes = await fetch(uploadRes.url);
    const downloadedBuffer = Buffer.from(await httpRes.arrayBuffer());
    const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');

    const match = originalHash === downloadedHash;
    recordResult('TEST 5: MP4 Video Upload', match, {
      url: uploadRes.url,
      hash: originalHash,
      message: `Size: ${videoBuffer.length} bytes == ${downloadedBuffer.length} bytes`,
    });

    await storageService.delete(uploadRes.url);
  } catch (err) {
    recordResult('TEST 5: MP4 Video Upload', false, { message: err.message });
  }

  // 6. TEST 6: File Larger Than 1 MB (2.5 MB Payload) & Hash Match
  try {
    const largeSize = Math.floor(2.5 * 1024 * 1024); // 2.5 MB
    const largeBuffer = Buffer.alloc(largeSize);
    for (let i = 0; i < largeSize; i += 100) {
      largeBuffer.write('ServerbytLargeFilePayloadCheck1234567890', i);
    }
    const originalHash = crypto.createHash('sha256').update(largeBuffer).digest('hex');

    const uploadRes = await storageService.upload({
      buffer: largeBuffer,
      originalName: 'large-asset-2.5mb.bin',
      mimeType: 'application/octet-stream',
      folder: 'campaigns',
    });

    const httpRes = await fetch(uploadRes.url);
    const downloadedBuffer = Buffer.from(await httpRes.arrayBuffer());
    const downloadedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');

    const match = originalHash === downloadedHash && largeBuffer.length === downloadedBuffer.length;
    recordResult('TEST 6: File Larger Than 1 MB (2.5MB Byte/Hash Check)', match, {
      url: uploadRes.url,
      hash: originalHash,
      message: `Size: ${largeBuffer.length} bytes == ${downloadedBuffer.length} bytes. Hash Match: ${match}`,
    });

    await storageService.delete(uploadRes.url);
  } catch (err) {
    recordResult('TEST 6: File Larger Than 1 MB (2.5MB Byte/Hash Check)', false, { message: err.message });
  }

  // 7. TEST 7: Delete Functionality (Verification that file disappears from Serverbyt)
  try {
    const deleteTestBuf = Buffer.from('Serverbyt Delete Test File Content', 'utf8');
    const uploadRes = await storageService.upload({
      buffer: deleteTestBuf,
      originalName: 'file-to-delete.txt',
      mimeType: 'text/plain',
      folder: 'campaigns',
    });

    const httpRes1 = await fetch(uploadRes.url);
    const existsBefore = httpRes1.status === 200;

    await storageService.delete(uploadRes.url);

    const httpRes2 = await fetch(uploadRes.url);
    const disappeared = httpRes2.status === 404 || httpRes2.status === 403;

    recordResult('TEST 7: Physical File Deletion Verification', existsBefore && disappeared, {
      message: `File existed before delete (Status ${httpRes1.status}), disappeared after delete (Status ${httpRes2.status})`,
    });
  } catch (err) {
    recordResult('TEST 7: Physical File Deletion Verification', false, { message: err.message });
  }

  // 8. TEST 8: Path Traversal Protection
  try {
    let trapped = false;
    try {
      await serverbytStorage.delete('../../test.txt');
    } catch (e) {
      trapped = e.message.includes('Security Error');
    }
    recordResult('TEST 8: Path Traversal Protection Check', trapped, {
      message: trapped ? 'Successfully caught malicious path traversal attempt ../../test.txt' : 'Failed to block path traversal',
    });
  } catch (err) {
    recordResult('TEST 8: Path Traversal Protection Check', false, { message: err.message });
  }

  console.log('\n====================================================');
  console.log('  TEST SUMMARY');
  console.log('====================================================');
  const passedCount = testResults.filter(t => t.passed).length;
  console.log(`Passed: ${passedCount} / ${testResults.length}`);
  console.log('====================================================\n');
}

runTests();
