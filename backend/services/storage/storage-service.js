import serverbytStorage from './serverbyt-storage.js';
import supabaseStorage from './supabase-storage.js';

class StorageService {
  getProvider() {
    const provider = (process.env.STORAGE_PROVIDER || 'serverbyt').toLowerCase();
    return provider === 'supabase' ? 'supabase' : 'serverbyt';
  }

  getStorageAdapter() {
    return this.getProvider() === 'supabase' ? supabaseStorage : serverbytStorage;
  }

  async upload({ buffer, filePath, originalName, mimeType, folder = 'campaigns' }) {
    const adapter = this.getStorageAdapter();
    return await adapter.upload({ buffer, filePath, originalName, mimeType, folder });
  }

  async delete(urlOrPath) {
    if (!urlOrPath || typeof urlOrPath !== 'string') return false;

    if (urlOrPath.includes('supabase.co') || urlOrPath.includes('/storage/v1/object/public/')) {
      return await supabaseStorage.delete(urlOrPath);
    }
    return await serverbytStorage.delete(urlOrPath);
  }

  async deleteMany(urlsOrPaths) {
    if (!Array.isArray(urlsOrPaths) || urlsOrPaths.length === 0) return [];

    const supabaseUrls = [];
    const serverbytUrls = [];

    for (const item of urlsOrPaths) {
      if (!item || typeof item !== 'string') continue;
      if (item.includes('supabase.co') || item.includes('/storage/v1/object/public/')) {
        supabaseUrls.push(item);
      } else {
        serverbytUrls.push(item);
      }
    }

    const deleted = [];
    if (supabaseUrls.length > 0) {
      const res = await supabaseStorage.deleteMany(supabaseUrls);
      if (Array.isArray(res)) deleted.push(...res);
    }

    if (serverbytUrls.length > 0) {
      const res = await serverbytStorage.deleteMany(serverbytUrls);
      if (Array.isArray(res)) deleted.push(...res);
    }

    return deleted;
  }
}

export default new StorageService();
