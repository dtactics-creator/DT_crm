import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = fs.existsSync(path.join(__dirname, '.env'))
  ? path.join(__dirname, '.env')
  : path.join(__dirname, 'backend', '.env');

dotenv.config({ path: envPath });

async function testAuthGuard() {
  console.log('====================================================');
  console.log('  TESTING API AUTHENTICATION GUARD ON /api/upload');
  console.log('====================================================\n');

  const { default: uploadHandler } = await import('./api/upload.js');

  const app = express();
  app.use(express.json());
  app.all('/api/upload', uploadHandler);

  const server = app.listen(3099, async () => {
    try {
      // 1. Test Unauthenticated POST /api/upload
      const postRes = await fetch('http://localhost:3099/api/upload', {
        method: 'POST',
      });
      const postBody = await postRes.json();
      const unauthPostPass = postRes.status === 401 && postBody.error?.includes('Unauthorized');
      console.log(`${unauthPostPass ? '✅ [PASS]' : '❌ [FAIL]'} Unauthenticated POST /api/upload rejected with 401 Unauthorized (Status: ${postRes.status})`);
      if (postBody.error) console.log(`   └─ Response: "${postBody.error}"`);

      // 2. Test Unauthenticated DELETE /api/upload
      const delRes = await fetch('http://localhost:3099/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: ['https://media.dtacticsit.in/campaigns/test.jpg'] }),
      });
      const delBody = await delRes.json();
      const unauthDelPass = delRes.status === 401 && delBody.error?.includes('Unauthorized');
      console.log(`${unauthDelPass ? '✅ [PASS]' : '❌ [FAIL]'} Unauthenticated DELETE /api/upload rejected with 401 Unauthorized (Status: ${delRes.status})`);
      if (delBody.error) console.log(`   └─ Response: "${delBody.error}"`);

      console.log('\n====================================================');
      console.log('  AUTHENTICATION GUARD VERIFICATION COMPLETE');
      console.log('====================================================\n');
    } catch (err) {
      console.error('Auth test error:', err);
    } finally {
      server.close();
    }
  });
}

testAuthGuard();
