import Client from 'ssh2-sftp-client';
import path from 'path';
import fs from 'fs';

class ServerbytStorage {
  constructor() {
    this.sftp = null;
    this.connectingPromise = null;
  }

  getConfig() {
    return {
      host: process.env.SERVERBYT_SSH_HOST || 'ssh.gb.stackcp.com',
      port: parseInt(process.env.SERVERBYT_SSH_PORT || '22', 10),
      username: process.env.SERVERBYT_SSH_USER || 'dtacticsit.in',
      password: process.env.SERVERBYT_SSH_PASSWORD || undefined,
      privateKey: process.env.SERVERBYT_SSH_KEY_PATH && fs.existsSync(process.env.SERVERBYT_SSH_KEY_PATH)
        ? fs.readFileSync(process.env.SERVERBYT_SSH_KEY_PATH)
        : (process.env.SERVERBYT_SSH_PRIVATE_KEY || undefined),
      mediaRoot: process.env.SERVERBYT_MEDIA_ROOT || '/home/sites/41b/b/be4736d732/public_html/crm-media',
      mediaBaseUrl: (process.env.SERVERBYT_MEDIA_BASE_URL || 'https://media.dtacticsit.in').replace(/\/+$/, ''),
    };
  }

  async getClient() {
    if (this.sftp && this.sftp.sftp) {
      return this.sftp;
    }

    if (this.connectingPromise) {
      return await this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      const config = this.getConfig();
      const sftp = new Client();

      const connectOptions = {
        host: config.host,
        port: config.port,
        username: config.username,
        readyTimeout: 25000,
        retries: 2,
      };

      if (config.privateKey) {
        connectOptions.privateKey = config.privateKey;
      } else if (config.password) {
        connectOptions.password = config.password;
      }

      await sftp.connect(connectOptions);

      sftp.on('end', () => { this.sftp = null; });
      sftp.on('close', () => { this.sftp = null; });
      sftp.on('error', () => { this.sftp = null; });

      this.sftp = sftp;
      return sftp;
    })();

    try {
      return await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }

  sanitizeFolder(folder) {
    if (!folder || typeof folder !== 'string') return 'campaigns';
    const clean = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    return clean || 'campaigns';
  }

  validateAndGetFilename(originalName) {
    const ext = path.extname(originalName || '').toLowerCase();

    // Block server-side executable scripts & dangerous binary formats
    const blockedScriptExts = [
      '.php', '.phtml', '.php3', '.php4', '.php5', '.phps', '.phar',
      '.cgi', '.pl', '.asp', '.aspx', '.jsp', '.exe', '.sh', '.bash',
      '.bat', '.cmd', '.vbs', '.ps1'
    ];

    if (blockedScriptExts.includes(ext)) {
      throw new Error(`Security Error: Executable script format '${ext}' is rejected to prevent remote script execution.`);
    }

    const safeExt = ext || '.bin';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    return `${uniqueSuffix}${safeExt}`;
  }

  async upload({ buffer, filePath, originalName, mimeType, folder = 'campaigns' }) {
    if (!filePath && !buffer) {
      throw new Error('Upload payload must provide either a temporary filePath or Buffer.');
    }

    const config = this.getConfig();
    const safeFolder = this.sanitizeFolder(folder);
    const filename = this.validateAndGetFilename(originalName);

    const remoteDirPath = path.posix.join(config.mediaRoot, safeFolder);
    const remoteFilePath = path.posix.join(remoteDirPath, filename);

    const sftp = await this.getClient();

    const exists = await sftp.exists(remoteDirPath);
    if (!exists) {
      await sftp.mkdir(remoteDirPath, true);
    }

    let fileSize = 0;
    if (filePath && fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      fileSize = stats.size;
      // Stream directly from local disk to Serverbyt via fastPut (zero RAM consumption)
      await sftp.fastPut(filePath, remoteFilePath);
    } else if (buffer && Buffer.isBuffer(buffer)) {
      fileSize = buffer.length;
      await sftp.put(buffer, remoteFilePath);
    } else {
      throw new Error('Invalid file payload for SFTP transfer.');
    }

    const publicUrl = `${config.mediaBaseUrl}/${safeFolder}/${filename}`;
    return {
      url: publicUrl,
      filename,
      folder: safeFolder,
      path: `${safeFolder}/${filename}`,
      size: fileSize,
      mimeType,
    };
  }

  async delete(urlOrPath) {
    if (!urlOrPath || typeof urlOrPath !== 'string') return false;

    const config = this.getConfig();
    let relativePath = urlOrPath.trim();

    if (relativePath.startsWith(config.mediaBaseUrl)) {
      relativePath = relativePath.slice(config.mediaBaseUrl.length);
    }

    relativePath = relativePath.replace(/^\/+/, '');

    if (relativePath.includes('..') || relativePath.startsWith('/')) {
      throw new Error('Security Error: Path traversal attempt detected.');
    }

    const remoteFilePath = path.posix.join(config.mediaRoot, relativePath);

    if (!remoteFilePath.startsWith(config.mediaRoot)) {
      throw new Error('Security Error: Access outside media root denied.');
    }

    const sftp = await this.getClient();
    const exists = await sftp.exists(remoteFilePath);
    if (exists) {
      await sftp.delete(remoteFilePath);
      return true;
    }
    return false;
  }

  async deleteMany(urlsOrPaths) {
    if (!Array.isArray(urlsOrPaths) || urlsOrPaths.length === 0) return [];
    const deleted = [];
    for (const item of urlsOrPaths) {
      try {
        const ok = await this.delete(item);
        if (ok) deleted.push(item);
      } catch (err) {
        console.error(`Failed to delete Serverbyt file ${item}:`, err.message);
      }
    }
    return deleted;
  }
}

export default new ServerbytStorage();
