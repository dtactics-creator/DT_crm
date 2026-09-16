import supabase from './supabase';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a single file to the CRM media storage via /api/upload.
 *
 * - Attaches the current Supabase session Bearer token automatically.
 * - There is NO artificial application-level file-size restriction here.
 *   Actual limits are determined by available disk space, browser/network,
 *   Nginx/proxy configuration, and Serverbyt/SFTP constraints.
 * - Throws on HTTP error (including 401 Unauthorized) with the server-provided
 *   message so callers can surface it to the user.
 *
 * @param file   The File object selected by the user.
 * @param folder Optional storage sub-folder (defaults to 'campaigns' on the backend).
 */
export async function uploadFile(file: File, folder?: string): Promise<UploadResult> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const formData = new FormData();
  formData.append('image', file);
  if (folder) {
    formData.append('folder', folder);
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    // Surface the backend error message directly (e.g. "This file type is not allowed.")
    throw new Error(data.error || 'Upload failed. Please try again.');
  }

  return {
    url: data.url,
    filename: data.filename,
    size: data.size,
    mimeType: data.mimeType,
  };
}
