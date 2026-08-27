import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseData<T>(
  tableName: string,
  fetchFn: () => Promise<T[]>,
  deps: any[] = []
): { data: T[] | undefined; loading: boolean; refetch: () => Promise<void> } {
  const [data, setData] = useState<T[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      console.error(`Error loading Supabase table ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes on table
    const channel = supabase
      .channel(`public:${tableName}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, tableName]);

  return { data, loading, refetch: loadData };
}
