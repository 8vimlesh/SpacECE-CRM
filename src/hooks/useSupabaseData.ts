import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseData<T>(
  tableName: string,
  fetchFn: () => Promise<T[]>,
  _deps: any[] = []
): { data: T[] | undefined; loading: boolean; refetch: () => Promise<void> } {
  const [data, setData] = useState<T[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  });

  const loadData = useCallback(async () => {
    try {
      const result = await fetchFnRef.current();
      setData(result);
    } catch (err) {
      console.error(`Error loading Supabase table ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    loadData();

    // Generate unique channel identifier per hook instance to prevent channel collision errors
    const channelId = `realtime_${tableName}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelId);

    try {
      channel
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          () => {
            loadData();
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.warn(`Supabase Realtime subscription warning for ${tableName}:`, status, err);
          }
        });
    } catch (err) {
      console.warn(`Failed to set up realtime channel for ${tableName}:`, err);
    }

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // Ignore channel removal errors
      }
    };
  }, [loadData, tableName]);

  return { data, loading, refetch: loadData };
}
