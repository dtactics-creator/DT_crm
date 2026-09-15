import supabase from '../../api/db-client.js';
import path from 'path';
import fs from 'fs';

class SupabaseStorage {
  async upload({ buffer, filePath, originalName, mimeType, folder = 'campaigns' }) {
    let payload = buffer;
    let size = 0;

    if (filePath && fs.existsSync(filePath)) {
      payload = fs.readFileSync(filePath);
      size = payload.length;
    } else if (buffer && Buffer.isBuffer(buffer)) {
      size = buffer.length;
    } else {
      throw new Error('Valid buffer or filePath required for Supabase upload.');
    }

    const ext = path.extname(originalName || '').toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${uniqueSuffix}${ext || '.bin'}`;

    const bucketName = folder || 'campaigns';

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filename, payload, {
        contentType: mimeType || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(error.message || 'Supabase upload failed');
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filename);

    return {
      url: publicUrlData.publicUrl,
      filename,
      folder: bucketName,
      path: filename,
      size,
      mimeType,
    };
  }

  async delete(urlOrPath) {
    if (!urlOrPath || typeof urlOrPath !== 'string') return false;
    const parts = urlOrPath.split('/');
    const filename = parts[parts.length - 1];
    if (!filename) return false;

    const { data, error } = await supabase.storage
      .from('campaigns')
      .remove([filename]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }
    return true;
  }

  async deleteMany(urlsOrPaths) {
    if (!Array.isArray(urlsOrPaths) || urlsOrPaths.length === 0) return [];
    const filenames = urlsOrPaths.map(url => {
      const parts = String(url).split('/');
      return parts[parts.length - 1];
    }).filter(Boolean);

    if (filenames.length === 0) return [];

    const { data, error } = await supabase.storage
      .from('campaigns')
      .remove(filenames);

    if (error) {
      console.error('Supabase deleteMany error:', error);
      throw error;
    }
    return filenames;
  }
}

export default new SupabaseStorage();
