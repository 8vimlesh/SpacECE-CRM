import { supabase } from '../lib/supabase';
import { db, type MediaItem } from '../db/database';

export const mediaService = {
  async getAll(): Promise<MediaItem[]> {
    try {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .order('id', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          fileName: row.file_name,
          fileType: row.file_type,
          fileUrl: row.file_url,
          uploadDate: row.upload_date || row.created_at,
          size: row.size || '0 KB'
        }));
      }
    } catch (e) {
      console.warn('Supabase media fetch error, fallback to local DB:', e);
    }
    return await db.media.toArray();
  },

  async uploadFile(file: File): Promise<MediaItem | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    let publicUrl = '';
    try {
      const { error: uploadError } = await supabase.storage
        .from('spacece-media')
        .upload(filePath, file);

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('spacece-media').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      } else {
        publicUrl = URL.createObjectURL(file);
      }
    } catch (e) {
      publicUrl = URL.createObjectURL(file);
    }

    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = file.size > 1024 * 1024 ? `${fileSizeMb} MB` : `${(file.size / 1024).toFixed(1)} KB`;

    const localId = await db.media.add({
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileUrl: publicUrl,
      size: sizeStr,
      uploadDate: new Date().toISOString()
    });

    try {
      await supabase.from('media').insert({
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_url: publicUrl,
        size: sizeStr,
        upload_date: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Supabase media metadata insert skipped/failed:', e);
    }

    return (await db.media.get(localId as number)) || null;
  },

  async delete(id: number): Promise<boolean> {
    await db.media.delete(id);
    try {
      await supabase.from('media').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase media delete skipped/failed:', e);
    }
    return true;
  }
};
