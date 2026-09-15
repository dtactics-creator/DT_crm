import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import Client from 'ssh2-sftp-client';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function debugSftp() {
  console.log('Testing SFTP connection to Serverbyt...');
  console.log('Host:', process.env.SERVERBYT_SSH_HOST);
  console.log('Port:', process.env.SERVERBYT_SSH_PORT);
  console.log('User:', process.env.SERVERBYT_SSH_USER);
  console.log('Key Path:', process.env.SERVERBYT_SSH_KEY_PATH);

  const keyPath = process.env.SERVERBYT_SSH_KEY_PATH;
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.error('ERROR: Key path does not exist:', keyPath);
    return;
  }

  const keyContent = fs.readFileSync(keyPath, 'utf8');
  console.log('Key file loaded. First line:', keyContent.split('\n')[0]);

  const sftp = new Client();
  try {
    await sftp.connect({
      host: process.env.SERVERBYT_SSH_HOST || 'ssh.gb.stackcp.com',
      port: parseInt(process.env.SERVERBYT_SSH_PORT || '22', 10),
      username: process.env.SERVERBYT_SSH_USER || 'dtacticsit.in',
      privateKey: keyContent,
      readyTimeout: 30000,
      debug: (msg) => console.log('SFTP Debug:', msg),
    });

    console.log('✅ SFTP CONNECTED SUCCESSFULLY!');
    const list = await sftp.list('/home/sites/41b/b/be4736d732/public_html/crm-media');
    console.log('Remote Directory Listing of /public_html/crm-media:');
    console.log(list.map(f => `${f.type} ${f.name} (${f.size} bytes)`).join('\n'));

    await sftp.end();
  } catch (err) {
    console.error('❌ SFTP CONNECTION ERROR:', err);
  }
}

debugSftp();
