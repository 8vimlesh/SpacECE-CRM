import { supabase } from '../lib/supabase';
import type { MediaItem } from '../db/database';

export const mediaService = {
  async getAll(): Promise<MediaItem[]> {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching media from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileUrl: row.file_url,
      uploadDate: row.upload_date || row.created_at,
      size: row.size || '0 KB'
    }));
  },

  async uploadFile(file: File): Promise<MediaItem | null> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    // Upload to Supabase storage bucket 'spacece-media' (or fallback to public URL if bucket not setup)
    let publicUrl = '';
    const { error: uploadError } = await supabase.storage
      .from('spacece-media')
      .upload(filePath, file);

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('spacece-media').getPublicUrl(filePath);
      publicUrl = urlData.publicUrl;
    } else {
      console.warn('Storage bucket upload fallback:', uploadError.message);
      // Fallback object URL if bucket is not created yet
      publicUrl = URL.createObjectURL(file);
    }

    const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const sizeStr = file.size > 1024 * 1024 ? `${fileSizeMb} MB` : `${(file.size / 1024).toFixed(1)} KB`;

    const { data, error } = await supabase
      .from('media')
      .insert({
        file_name: file.name,
        file_type: file.type || 'application/octet-stream',
        file_url: publicUrl,
        size: sizeStr,
        upload_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding media metadata to Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      fileName: data.file_name,
      fileType: data.file_type,
      fileUrl: data.file_url,
      uploadDate: data.upload_date,
      size: data.size
    };
  },

  async addMetadata(media: Omit<MediaItem, 'id'>): Promise<MediaItem | null> {
    const { data, error } = await supabase
      .from('media')
      .insert({
        file_name: media.fileName,
        file_type: media.fileType,
        file_url: media.fileUrl,
        size: media.size,
        upload_date: media.uploadDate || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting media metadata to Supabase:', error);
      return null;
    }

    return {
      id: data.id,
      fileName: data.file_name,
      fileType: data.file_type,
      fileUrl: data.file_url,
      uploadDate: data.upload_date,
      size: data.size
    };
  },

  async delete(id: number): Promise<boolean> {
    const { error } = await supabase.from('media').delete().eq('id', id);
    if (error) {
      console.error(`Error deleting media ${id} from Supabase:`, error);
      return false;
    }
    return true;
  }
};
