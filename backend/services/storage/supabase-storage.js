import supabase from '../../api/db-client.js';
import path from 'path';
import fs from 'fs';

class SupabaseStorage {
  /**
   * Extract the Supabase Storage bucket name from a public URL.
   * e.g. https://xxx.supabase.co/storage/v1/object/public/campaigns/file.jpg → 'campaigns'
   * Falls back to the provided folder or 'campaigns' if URL cannot be parsed.
   */
  _extractBucketFromUrl(url, fallback = 'campaigns') {
    if (!url || typeof url !== 'string') return fallback;
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\//);
    return match?.[1] || fallback;
  }

  async upload({ buffer, filePath, originalName, mimeType, folder = 'campaigns' }) {
    let payload;
    let size = 0;

    if (filePath && fs.existsSync(filePath)) {
      // Stream from disk rather than loading the entire file into RAM
      payload = fs.createReadStream(filePath);
      size = fs.statSync(filePath).size;
    } else if (buffer && Buffer.isBuffer(buffer)) {
      payload = buffer;
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

    // Derive bucket from the Supabase URL; fall back to 'campaigns'
    const bucket = this._extractBucketFromUrl(urlOrPath, 'campaigns');

    const parts = urlOrPath.split('/');
    const filename = parts[parts.length - 1];
    if (!filename) return false;

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filename]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }
    return true;
  }

  async deleteMany(urlsOrPaths) {
    if (!Array.isArray(urlsOrPaths) || urlsOrPaths.length === 0) return [];

    // Group filenames by bucket so each bucket gets one remove() call
    const byBucket = new Map();
    for (const url of urlsOrPaths) {
      const bucket = this._extractBucketFromUrl(String(url), 'campaigns');
      const parts = String(url).split('/');
      const filename = parts[parts.length - 1];
      if (!filename) continue;
      if (!byBucket.has(bucket)) byBucket.set(bucket, []);
      byBucket.get(bucket).push(filename);
    }

    const deleted = [];
    for (const [bucket, filenames] of byBucket) {
      const { error } = await supabase.storage
        .from(bucket)
        .remove(filenames);

      if (error) {
        console.error('Supabase deleteMany error:', error);
        throw error;
      }
      deleted.push(...filenames);
    }
    return deleted;
  }
}

export default new SupabaseStorage();
