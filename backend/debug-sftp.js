import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import Client from 'ssh2-sftp-client';
import { fileURLToPath } from 'url';
import serverbytStorage from './services/storage/serverbyt-storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function testDirLogic() {
  console.log('Testing Serverbyt Storage Directory Logic...');
  const keyPath = process.env.SERVERBYT_SSH_KEY_PATH;

  if (!keyPath || !fs.existsSync(keyPath)) {
    console.log('Key path does not exist on this machine:', keyPath);
    console.log('Skipping SSH network call on local machine without SSH key.');
    return;
  }

  try {
    const sftp = await serverbytStorage.getClient();
    console.log('✅ SFTP Client Connected!');

    const existsFull = await sftp.exists('/home/sites/41b/b/be4736d732/public_html/crm-media');
    console.log('Exists full path:', existsFull);

    const existsRel = await sftp.exists('public_html/crm-media');
    console.log('Exists rel path:', existsRel);

    await serverbytStorage.ensureRemoteDir(sftp, '/home/sites/41b/b/be4736d732/public_html/crm-media/campaigns', '/home/sites/41b/b/be4736d732/public_html/crm-media');
    console.log('✅ ensureRemoteDir completed with 0 permission errors!');

    await sftp.end();
  } catch (err) {
    console.error('SFTP Test Error:', err);
  }
}

testDirLogic();
